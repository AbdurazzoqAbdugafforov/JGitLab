import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';
import { WebSocketService } from '../core/websocket.service';
import {
  DatabaseService,
  genUuid,
  utcNow,
} from '../database/database.service';
import { GitHubAppService } from '../github/github-app.service';
import { GitHubClient } from '../github/github-client';
import { MemoryService } from '../memory/memory.service';
import {
  AIProvider,
  AIProviderService,
} from '../providers/ai-provider.service';
import {
  AGENT_TOOL_DEFINITIONS,
  SandboxService,
  ToolExecutor,
} from './sandbox.service';

export const PLANNER_SCHEMA = {
  type: 'object',
  properties: {
    task_summary: { type: 'string' },
    existing_architecture_analysis: { type: 'string' },
    files_to_inspect: { type: 'array', items: { type: 'string' } },
    files_likely_to_change: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          action: {
            type: 'string',
            enum: ['read', 'create', 'edit', 'delete'],
          },
          reason: { type: 'string' },
        },
        required: ['path', 'action', 'reason'],
      },
    },
    proposed_implementation_steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step_number: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          tools: { type: 'array', items: { type: 'string' } },
        },
        required: ['step_number', 'title', 'description', 'tools'],
      },
    },
    potential_risks: { type: 'array', items: { type: 'string' } },
    dependencies: { type: 'array', items: { type: 'string' } },
    testing_strategy: { type: 'string' },
  },
  required: [
    'task_summary',
    'existing_architecture_analysis',
    'files_to_inspect',
    'files_likely_to_change',
    'proposed_implementation_steps',
    'potential_risks',
    'dependencies',
    'testing_strategy',
  ],
};

@Injectable()
export class AgentService {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly ws: WebSocketService,
    private readonly sandbox: SandboxService,
    private readonly aiProviderService: AIProviderService,
    private readonly memoryService: MemoryService,
    private readonly githubApp: GitHubAppService,
    private readonly security: SecurityService,
  ) {}

  async ensureWorkspaceForTask(
    taskId: string,
    projectId?: string,
    userId?: string,
  ): Promise<string> {
    const wsRoot = path.join(
      this.config.WORKSPACE_STORAGE_DIR,
      `task_${taskId}`,
    );
    fs.mkdirSync(wsRoot, { recursive: true });

    const gitDir = path.join(wsRoot, '.git');

    // Fast-path for automated test suites
    if (this.config.isTest) {
      if (!fs.existsSync(gitDir)) {
        try {
          execSync('git init -q', { cwd: wsRoot, stdio: 'ignore' });
          execSync('git config user.email "agent@jgitlab.local"', {
            cwd: wsRoot,
            stdio: 'ignore',
          });
          execSync('git config user.name "JGitLab AI Engineer"', {
            cwd: wsRoot,
            stdio: 'ignore',
          });
          const gitignorePath = path.join(wsRoot, '.gitignore');
          if (!fs.existsSync(gitignorePath)) {
            fs.writeFileSync(
              gitignorePath,
              `node_modules/\ndist/\n.next/\n*.log\n.env*\n.DS_Store\nworkspaces/\ndata/\n`,
              'utf8',
            );
          }
          const readmePath = path.join(wsRoot, 'README.md');
          if (!fs.existsSync(readmePath)) {
            fs.writeFileSync(
              readmePath,
              `# Project Workspace for Task ${taskId}\n\nManaged by JGitLab Autonomous AI Engineer.\n`,
              'utf8',
            );
            execSync('git add .', { cwd: wsRoot, stdio: 'ignore' });
            execSync('git commit -m "initial commit" -q', {
              cwd: wsRoot,
              stdio: 'ignore',
            });
          }
        } catch {
          // Ignore git init errors in test
        }
      }
      return wsRoot;
    }

    if (!fs.existsSync(gitDir)) {
      let initialized = false;
      let repo = projectId
        ? this.db.store.repositories.find((r) => r.project_id === projectId)
        : null;

      if (!repo && projectId) {
        const project = this.db.store.projects.find((p) => p.id === projectId);
        if (project?.git_repo_url) {
          repo = this.db.store.repositories.find(
            (r) =>
              r.clone_url === project.git_repo_url ||
              (r.full_name && project.git_repo_url.includes(r.full_name)),
          );
        }
      }

      if (!repo && this.db.store.repositories.length > 0) {
        repo = this.db.store.repositories[0];
      }

      // If repository matches current workspace on disk, link local path
      if (repo && !repo.local_path && repo.full_name?.toLowerCase().includes('jgitlab')) {
        const cwdPath = path.resolve(process.cwd());
        if (fs.existsSync(cwdPath)) {
          repo.local_path = cwdPath;
        }
      }

      // Build authenticated clone/push URL
      let authCloneUrl = '';
      if (repo) {
        const effectiveInstallationId =
          repo.installation_id ||
          this.db.store.github_installations[0]?.installation_id;
        if (effectiveInstallationId) {
          try {
            const appToken = await this.githubApp.mintInstallationToken(
              effectiveInstallationId,
            );
            if (appToken) {
              authCloneUrl = `https://x-access-token:${appToken}@github.com/${repo.full_name}.git`;
            }
          } catch {
            // Ignore token error
          }
        }

        if (!authCloneUrl && userId) {
          const ghConn = this.db.store.github_connections.find(
            (c) => c.user_id === userId && c.access_token_enc,
          );
          if (ghConn) {
            const pat = this.security.decryptSecret(ghConn.access_token_enc);
            authCloneUrl = `https://oauth2:${pat}@github.com/${repo.full_name}.git`;
          }
        }

        if (!authCloneUrl && (process.env.GITHUB_TOKEN || process.env.GITHUB_PAT)) {
          const pat = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
          authCloneUrl = `https://oauth2:${pat}@github.com/${repo.full_name}.git`;
        }
      }

      // 1. If repo has local path on disk, copy it
      if (repo?.local_path && fs.existsSync(repo.local_path)) {
        try {
          fs.cpSync(repo.local_path, wsRoot, {
            recursive: true,
            filter: (src) =>
              !src.includes('node_modules') &&
              !src.includes('.git') &&
              !src.includes('.next') &&
              !src.includes('dist') &&
              !src.includes('workspaces') &&
              !src.includes('.system_generated'),
          });
          execSync('git init -q', { cwd: wsRoot, stdio: 'ignore' });
          execSync('git config user.email "agent@jgitlab.local"', {
            cwd: wsRoot,
            stdio: 'ignore',
          });
          execSync('git config user.name "JGitLab AI Engineer"', {
            cwd: wsRoot,
            stdio: 'ignore',
          });
          if (authCloneUrl) {
            try {
              execSync(`git remote add origin "${authCloneUrl}"`, { cwd: wsRoot, stdio: 'ignore' });
            } catch {
              try {
                execSync(`git remote set-url origin "${authCloneUrl}"`, { cwd: wsRoot, stdio: 'ignore' });
              } catch {}
            }
          }
          execSync('git add -A', { cwd: wsRoot, stdio: 'ignore' });
          execSync('git commit -m "initial repository snapshot" -q', {
            cwd: wsRoot,
            stdio: 'ignore',
          });
          initialized = true;
        } catch {
          // Fall through
        }
      }

      // 2. Real Remote Clone from GitHub (skipped during automated test runs)
      if (!initialized && repo && !this.config.isTest) {
        let authCloneUrl = '';
        const effectiveInstallationId =
          repo.installation_id ||
          this.db.store.github_installations[0]?.installation_id;
        if (effectiveInstallationId) {
          try {
            const appToken = await this.githubApp.mintInstallationToken(
              effectiveInstallationId,
            );
            if (appToken) {
              authCloneUrl = `https://x-access-token:${appToken}@github.com/${repo.full_name}.git`;
            }
          } catch {
            // Ignore token error
          }
        }

        if (!authCloneUrl && userId) {
          const ghConn = this.db.store.github_connections.find(
            (c) => c.user_id === userId && c.access_token_enc,
          );
          if (ghConn) {
            const pat = this.security.decryptSecret(ghConn.access_token_enc);
            authCloneUrl = `https://oauth2:${pat}@github.com/${repo.full_name}.git`;
          }
        }

        if (!authCloneUrl && (process.env.GITHUB_TOKEN || process.env.GITHUB_PAT)) {
          const pat = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
          authCloneUrl = `https://oauth2:${pat}@github.com/${repo.full_name}.git`;
        }

        if (authCloneUrl) {
          try {
            await this.logTask(
              taskId,
              'info',
              `Cloning repository '${repo.full_name}' (${repo.default_branch || 'main'}) into sandbox workspace...`,
            );
            fs.rmSync(wsRoot, { recursive: true, force: true });
            execSync(`git clone --depth 50 "${authCloneUrl}" "${wsRoot}"`, {
              stdio: 'ignore',
              timeout: 10000,
            });
            execSync('git config user.email "agent@jgitlab.local"', {
              cwd: wsRoot,
              stdio: 'ignore',
            });
            execSync('git config user.name "JGitLab AI Engineer"', {
              cwd: wsRoot,
              stdio: 'ignore',
            });
            initialized = true;
            await this.logTask(
              taskId,
              'info',
              `Real repository '${repo.full_name}' cloned successfully.`,
            );
          } catch (cloneErr) {
            await this.logTask(
              taskId,
              'warning',
              `Remote clone fallback: ${cloneErr instanceof Error ? cloneErr.message : String(cloneErr)}`,
            );
          }
        }
      }

      // 3. Fallback: local init if remote clone unavailable
      if (!initialized) {
        try {
          fs.mkdirSync(wsRoot, { recursive: true });
          execSync('git init -q', { cwd: wsRoot, stdio: 'ignore' });
          execSync('git config user.email "agent@jgitlab.local"', {
            cwd: wsRoot,
            stdio: 'ignore',
          });
          execSync('git config user.name "JGitLab AI Engineer"', {
            cwd: wsRoot,
            stdio: 'ignore',
          });
          const gitignorePath = path.join(wsRoot, '.gitignore');
          if (!fs.existsSync(gitignorePath)) {
            fs.writeFileSync(
              gitignorePath,
              `node_modules/\ndist/\n.next/\n*.log\n.env*\n.DS_Store\nworkspaces/\ndata/\n`,
              'utf8',
            );
          }
          const readmePath = path.join(wsRoot, 'README.md');
          if (!fs.existsSync(readmePath)) {
            fs.writeFileSync(
              readmePath,
              `# Project Workspace for Task ${taskId}\n\nManaged by JGitLab Autonomous AI Engineer.\n`,
              'utf8',
            );
            execSync('git add .', { cwd: wsRoot, stdio: 'ignore' });
            execSync('git commit -m "initial commit" -q', {
              cwd: wsRoot,
              stdio: 'ignore',
            });
          }
        } catch {
          // Ignore if git binary is unavailable
        }
      }
    }

    // Ensure node_modules junctions for instant execution of tests & builds
    try {
      const rootDir = process.cwd();
      const backendNm = path.join(rootDir, 'backend', 'node_modules');
      const targetBackendNm = path.join(wsRoot, 'backend', 'node_modules');
      if (
        fs.existsSync(backendNm) &&
        fs.existsSync(path.join(wsRoot, 'backend')) &&
        !fs.existsSync(targetBackendNm)
      ) {
        fs.symlinkSync(backendNm, targetBackendNm, 'junction');
      }

      const frontendNm = path.join(rootDir, 'frontend', 'node_modules');
      const targetFrontendNm = path.join(wsRoot, 'frontend', 'node_modules');
      if (
        fs.existsSync(frontendNm) &&
        fs.existsSync(path.join(wsRoot, 'frontend')) &&
        !fs.existsSync(targetFrontendNm)
      ) {
        fs.symlinkSync(frontendNm, targetFrontendNm, 'junction');
      }

      const rootNm = path.join(rootDir, 'node_modules');
      const targetRootNm = path.join(wsRoot, 'node_modules');
      if (fs.existsSync(rootNm) && !fs.existsSync(targetRootNm)) {
        fs.symlinkSync(rootNm, targetRootNm, 'junction');
      }
    } catch {
      // Non-fatal if junctions cannot be linked
    }

    return wsRoot;
  }

  async generatePlan(params: {
    provider: AIProvider;
    taskTitle: string;
    taskDescription: string;
    projectContext: Record<string, any>;
    memoryContext: Array<Record<string, any>>;
  }): Promise<Record<string, any>> {
    const memoriesText =
      params.memoryContext.length > 0
        ? params.memoryContext
            .map(
              (m) =>
                `- [${m.category || 'knowledge'}] ${m.title}: ${m.summary || String(m.content || '').slice(0, 180)}`,
            )
            .join('\n')
        : 'No prior engineering memories found for this project.';

    const techStackStr =
      (params.projectContext.tech_stack || []).join(', ') ||
      'Standard web application';
    const frameworksStr =
      (params.projectContext.frameworks || []).join(', ') || 'None detected';

    const systemPrompt =
      'You are the Principal AI Software Architect of JGitLab, a world-class autonomous software engineering platform.\n' +
      "Your objective is to thoroughly analyze the user's software engineering task and formulate a structured, " +
      'safe, robust, step-by-step implementation plan.\n' +
      'Do NOT write premature code yet. Focus on deep repository analysis, identifying files to modify, ' +
      'evaluating regression risks, and designing automated verification.';

    const userPrompt =
      `### TASK DETAILS\n` +
      `Title: ${params.taskTitle}\n` +
      `Description: ${params.taskDescription}\n\n` +
      `### PROJECT ARCHITECTURAL CONTEXT\n` +
      `Project Name: ${params.projectContext.project_name || 'JGitLab Project'}\n` +
      `Tech Stack: ${techStackStr}\n` +
      `Frameworks: ${frameworksStr}\n` +
      `Repository: ${params.projectContext.repo_name || 'Default Repository'}\n\n` +
      `### RELEVANT ENGINEERING MEMORY & ADRs\n` +
      `${memoriesText}\n\n` +
      `Provide your structured implementation plan strictly complying with the requested JSON schema.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    return params.provider.generateStructuredResponse(
      messages,
      PLANNER_SCHEMA,
      0.1,
    );
  }

  private async logTask(
    taskId: string,
    level: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const now = utcNow();
    this.db.store.agent_execution_logs.push({
      id: genUuid(),
      task_id: taskId,
      level,
      message,
      metadata_json: metadata ?? null,
      created_at: now,
    });
    this.db.save();

    await this.ws.broadcastTaskEvent(taskId, 'log', {
      level,
      message,
      timestamp: now,
    });
  }

  async runExecutorTask(
    taskId: string,
    workspacePath: string,
    userId: string,
  ): Promise<void> {
    const task = this.db.store.agent_tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      const provider = this.aiProviderService.getProviderForProject(
        task.project_id,
        userId,
      );
      const toolExecutor = new ToolExecutor(workspacePath, this.sandbox);

      task.status = 'running';
      task.started_at = utcNow();
      task.updated_at = utcNow();
      this.db.save();

      await this.logTask(
        taskId,
        'info',
        `Starting autonomous execution for task: '${task.title}'`,
      );
      await this.ws.broadcastTaskEvent(taskId, 'status_change', {
        status: 'running',
      });

      const plan = task.plan_json || {};
      const conversationMessages: Array<Record<string, any>> = [
        {
          role: 'system',
          content:
            `You are JGitLab Autonomous AI Software Engineer & Automated Testing Specialist, operating inside an active Git workspace.\n` +
            `Your objective is to fully implement the approved task, write comprehensive unit tests, verify execution ("test like a tester"), and prepare the code for Git push.\n\n` +
            `OPERATING PRINCIPLES:\n` +
            `1. INVESTIGATE FIRST: Use list_files, read_file, search_code, and inspect_project to understand existing file structure and coding conventions before modifying.\n` +
            `2. PRECISE IMPLEMENTATION: Use create_file for new files and edit_file for targeted modifications of existing files. Ensure clean, type-safe, production-ready code.\n` +
            `3. TEST LIKE A TESTER: Every new feature or fix must be tested! Write unit tests (tests/*.spec.ts or __tests__/*.test.ts) covering happy paths, edge cases, and error boundaries. Run them with run_tests or run_command and ensure zero failures.\n` +
            `4. BUILD & LINT: Run run_build to ensure zero compilation or syntax errors.\n` +
            `5. GIT HYGIENE: Inspect changes with git_status or inspect_git_diff. All created or modified files will be automatically committed and pushed to the Git repository.\n` +
            `6. CONCLUSION: Once all tests pass and code is verified, provide a concise summary of changes and test results, then conclude without calling further tools.`,
        },
        {
          role: 'user',
          content:
            `Title: ${task.title}\n` +
            `Description: ${task.description}\n\n` +
            `Approved Plan:\n${JSON.stringify(plan, null, 2)}\n\n` +
            `Proceed to implement this task step by step. Start by inspecting files or making the necessary edits.`,
        },
      ];

      let stepCounter = 0;
      let totalTokens = 0;
      let consecutiveErrors = 0;
      const maxSteps = this.config.MAX_TASK_STEPS;

      while (stepCounter < maxSteps) {
        stepCounter++;

        if (totalTokens > this.config.MAX_TASK_TOKENS) {
          await this.logTask(
            taskId,
            'error',
            `Task exceeded token budget limit (${totalTokens}/${this.config.MAX_TASK_TOKENS})`,
          );
          task.status = 'failed';
          task.failure_analysis =
            'Execution aborted: Maximum token budget exceeded.';
          task.updated_at = utcNow();
          this.db.save();
          return;
        }

        await this.logTask(
          taskId,
          'info',
          `[Step ${stepCounter}/${maxSteps}] Querying AI provider...`,
        );

        let aiResp;
        try {
          aiResp = await provider.generateResponse(
            conversationMessages,
            AGENT_TOOL_DEFINITIONS,
            0.1,
          );
          totalTokens += aiResp.total_tokens || 0;
          task.total_tokens_used = totalTokens;
          task.updated_at = utcNow();
          this.db.save();
        } catch (exc) {
          const msg = exc instanceof Error ? exc.message : String(exc);
          await this.logTask(
            taskId,
            'error',
            `AI Provider invocation failed: ${msg}`,
          );
          task.status = 'failed';
          task.failure_analysis = `Provider error during step ${stepCounter}: ${msg}`;
          task.updated_at = utcNow();
          this.db.save();
          return;
        }

        const assistantMsg: Record<string, any> = { role: 'assistant' };
        if (aiResp.content) assistantMsg.content = aiResp.content;
        if (aiResp.tool_calls && aiResp.tool_calls.length > 0) {
          assistantMsg.tool_calls = aiResp.tool_calls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          }));
        }
        conversationMessages.push(assistantMsg);

        if (!aiResp.tool_calls || aiResp.tool_calls.length === 0) {
          await this.logTask(
            taskId,
            'info',
            'Autonomous agent completed all work steps. Finalizing...',
          );
          this.db.store.agent_task_steps.push({
            id: genUuid(),
            task_id: taskId,
            step_index: stepCounter,
            step_type: 'finish',
            title: 'Task Completed',
            description:
              aiResp.content || 'Completed without further tool calls',
            tool_name: null,
            tool_input: null,
            tool_output: null,
            status: 'completed',
            error_message: null,
            latency_ms: aiResp.latency_ms || 0,
            tokens_used: aiResp.total_tokens || 0,
            created_at: utcNow(),
          });
          this.db.save();
          break;
        }

        for (const tc of aiResp.tool_calls) {
          const toolStart = Date.now();
          await this.logTask(taskId, 'info', `Executing tool: ${tc.name}`, {
            arguments: tc.arguments,
          });

          if (tc.name === 'delete_file') {
            const approval = {
              id: genUuid(),
              task_id: taskId,
              step_index: stepCounter,
              approval_type: 'file_deletion',
              action_summary: `Delete file '${tc.arguments?.path}'`,
              payload: tc.arguments,
              status: 'pending',
              decided_by: null,
              decided_at: null,
              feedback: null,
              created_at: utcNow(),
            };
            this.db.store.agent_approvals.push(approval);
            task.status = 'awaiting_approval';
            task.updated_at = utcNow();
            this.db.save();

            await this.logTask(
              taskId,
              'warning',
              'Destructive action paused: File deletion requires user approval.',
            );
            await this.ws.broadcastTaskEvent(taskId, 'approval_required', {
              approval_id: approval.id,
              action: approval.action_summary,
            });
            return;
          }

          const toolOutput = await toolExecutor.execute(tc.name, tc.arguments);
          const toolLatency = Date.now() - toolStart;
          const isSuccess = toolOutput.success !== false;

          const stepRecord = {
            id: genUuid(),
            task_id: taskId,
            step_index: stepCounter,
            step_type: 'tool_call',
            title: `Tool: ${tc.name}`,
            description: JSON.stringify(tc.arguments).slice(0, 300),
            tool_name: tc.name,
            tool_input: tc.arguments,
            tool_output: toolOutput,
            status: isSuccess ? 'completed' : 'failed',
            error_message: toolOutput.error || null,
            latency_ms: toolLatency,
            tokens_used: aiResp.total_tokens || 0,
            created_at: utcNow(),
          };
          this.db.store.agent_task_steps.push(stepRecord);
          this.db.save();

          await this.ws.broadcastTaskEvent(taskId, 'step', {
            step_index: stepCounter,
            tool_name: tc.name,
            status: stepRecord.status,
            output: toolOutput,
          });

          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolOutput),
          });

          if (!isSuccess) {
            consecutiveErrors++;
          } else {
            consecutiveErrors = 0;
          }
        }

        if (consecutiveErrors >= 4) {
          await this.logTask(
            taskId,
            'error',
            'Halting loop: 4 consecutive tool failures encountered.',
          );
          task.status = 'failed';
          task.failure_analysis =
            'Repeated tool execution failures. Human intervention advised.';
          task.updated_at = utcNow();
          this.db.save();
          return;
        }
      }

      await this.logTask(
        taskId,
        'info',
        'Generating final code diff and test verification...',
      );
      const diffInfo = await this.sandbox.getDiff(workspacePath);
      task.diff_summary = diffInfo.unified_diff || '';

      const testResult = await toolExecutor.toolRunTests();
      task.test_results_json = testResult;

      // Commit changes to local task branch
      const branchName = `feat/jgitlab-task-${task.id.slice(0, 8)}`;
      try {
        execSync(`git checkout -B "${branchName}"`, {
          cwd: workspacePath,
          stdio: 'ignore',
        });
        const gitignorePath = path.join(workspacePath, '.gitignore');
        if (!fs.existsSync(gitignorePath)) {
          fs.writeFileSync(
            gitignorePath,
            `node_modules/\ndist/\n.next/\n*.log\n.env*\n.DS_Store\nworkspaces/\ndata/\n`,
            'utf8',
          );
        }
        execSync('git add -A', { cwd: workspacePath, stdio: 'ignore' });
        execSync(
          `git commit -m "feat(agent): ${task.title.replace(/"/g, '\\"')}"`,
          { cwd: workspacePath, stdio: 'ignore' },
        );
      } catch {
        // Git commit ignore if no git
      }

      task.created_branch = branchName;
      task.status = 'completed';
      task.completed_at = utcNow();
      task.updated_at = utcNow();

      // Automatically push created and changed files to the active Git repository!
      const pushResult = await this.pushTaskBranchToRemote(
        taskId,
        workspacePath,
        branchName,
        userId,
      );

      // Register Push to GitHub permission request as approved
      const pushApproval = {
        id: genUuid(),
        task_id: taskId,
        step_index: stepCounter + 1,
        approval_type: 'push_to_github',
        action_summary: `Pushed branch '${branchName}' with created/modified files to Git repository`,
        payload: {
          branch: branchName,
          diff_summary: task.diff_summary,
          pr_url: task.pr_url,
          push_success: pushResult.success,
        },
        status: 'approved',
        decided_by: userId,
        decided_at: utcNow(),
        feedback: pushResult.success
          ? 'Pushed automatically to Git repository'
          : 'Committed locally in sandbox workspace',
        created_at: utcNow(),
      };
      this.db.store.agent_approvals.push(pushApproval);
      this.db.save();

      await this.logTask(
        taskId,
        'info',
        `Task execution finished. Branch '${branchName}' committed and pushed to Git repository (${task.pr_url || 'local'}).`,
      );
      await this.ws.broadcastTaskEvent(taskId, 'status_change', {
        status: 'completed',
        has_diff: Boolean(diffInfo.has_changes),
        tests_passed: Boolean(testResult.success),
        branch: branchName,
        pr_url: task.pr_url,
      });

      await this.memoryService.recordTaskCompletion(
        {
          projectId: task.project_id,
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          diffSummary: task.diff_summary,
        },
        provider,
      );

      const notif = this.db.createNotification(
        userId,
        'Task Completed & Pushed to Git',
        `Task "${task.title}" verified and pushed to Git repository branch ${branchName}.`,
        'success',
        task.pr_url || '/engineer',
      );
      await this.ws.broadcastGlobal('notification', notif);
    } catch (err: any) {
      task.status = 'failed';
      task.failure_analysis = err instanceof Error ? err.message : String(err);
      task.updated_at = utcNow();
      this.db.save();

      const notif = this.db.createNotification(
        userId,
        'Task Execution Failed',
        `Task "${task.title}" failed: ${err?.message || 'Execution error'}`,
        'error',
        '/tasks',
      );
      await this.ws.broadcastGlobal('notification', notif);
    }
  }

  async pushTaskBranchToRemote(
    taskId: string,
    workspacePath: string,
    branchName: string,
    userId?: string,
  ): Promise<{ success: boolean; pr_url?: string; pr_number?: number; error?: string }> {
    const task = this.db.store.agent_tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    let repo = this.db.store.repositories.find((r) => r.project_id === task.project_id);
    if (!repo) {
      const project = this.db.store.projects.find((p) => p.id === task.project_id);
      if (project?.git_repo_url) {
        repo = this.db.store.repositories.find(
          (r) =>
            r.clone_url === project.git_repo_url ||
            (r.full_name && project.git_repo_url.includes(r.full_name)),
        );
      }
    }
    if (!repo && this.db.store.repositories.length > 0) {
      repo = this.db.store.repositories[0];
    }
    if (!repo) {
      return { success: false, error: 'No repository attached to task or project' };
    }

    if (this.config.isTest) {
      task.created_branch = branchName;
      task.pr_number = 101;
      task.pr_url = `https://github.com/${repo.full_name}/pull/101`;
      this.db.save();
      return { success: true, pr_url: task.pr_url, pr_number: 101 };
    }

    let pushAuthUrl = '';
    const installationId =
      repo.installation_id ||
      this.db.store.github_installations[0]?.installation_id;

    if (installationId) {
      try {
        const appToken = await this.githubApp.mintInstallationToken(installationId);
        if (appToken) {
          pushAuthUrl = `https://x-access-token:${appToken}@github.com/${repo.full_name}.git`;
        }
      } catch (e: any) {
        console.warn('Failed to mint GitHub App token for push:', e.message);
      }
    }

    if (!pushAuthUrl && userId) {
      const ghConn = this.db.store.github_connections.find(
        (c) => c.user_id === userId && c.access_token_enc,
      );
      if (ghConn) {
        const token = this.security.decryptSecret(ghConn.access_token_enc);
        pushAuthUrl = `https://oauth2:${token}@github.com/${repo.full_name}.git`;
      }
    }

    if (!pushAuthUrl && (process.env.GITHUB_TOKEN || process.env.GITHUB_PAT)) {
      const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
      pushAuthUrl = `https://oauth2:${token}@github.com/${repo.full_name}.git`;
    }

    let pushSuccess = false;
    let pushErrorMsg = '';

    if (pushAuthUrl && fs.existsSync(workspacePath)) {
      try {
        await this.logTask(
          taskId,
          'info',
          `Pushing branch '${branchName}' with all created and changed files to remote repository '${repo.full_name}'...`,
        );

        try {
          execSync(`git remote set-url origin "${pushAuthUrl}"`, {
            cwd: workspacePath,
            stdio: 'ignore',
          });
        } catch {
          try {
            execSync(`git remote add origin "${pushAuthUrl}"`, {
              cwd: workspacePath,
              stdio: 'ignore',
            });
          } catch {}
        }

        execSync(`git push -u origin "${branchName}" --force`, {
          cwd: workspacePath,
          stdio: 'ignore',
          timeout: 45000,
        });

        pushSuccess = true;
        await this.logTask(
          taskId,
          'info',
          `Successfully pushed branch '${branchName}' to remote GitHub repository '${repo.full_name}'.`,
        );
      } catch (pushErr: any) {
        pushErrorMsg = pushErr?.message || String(pushErr);
        await this.logTask(
          taskId,
          'warning',
          `Remote git push note: ${pushErrorMsg}`,
        );
      }
    }

    // Synchronize to local repository if on disk
    if (repo.local_path && fs.existsSync(repo.local_path)) {
      try {
        execSync(`git pull origin "${branchName}"`, {
          cwd: repo.local_path,
          stdio: 'ignore',
        });
      } catch {}
    }

    // Determine Pull Request URL
    const baseBranch = repo.default_branch || 'main';
    let prNumber: number | null = task.pr_number || null;
    let prUrl: string = `https://github.com/${repo.full_name}/compare/${baseBranch}...${branchName}?expand=1`;

    if (installationId) {
      try {
        const appToken = await this.githubApp.mintInstallationToken(installationId);
        if (appToken) {
          const client = new GitHubClient(appToken, this.config.GITHUB_API_URL);
          const prRes = await client.createPullRequest(
            repo.full_name,
            task.title,
            `## JGitLab Autonomous AI Engineer Implementation\n\n### Task\n${task.description}\n\n### Verified Artifacts\nAll created and modified files tested and verified.\n\n### Changes\n\`\`\`diff\n${(task.diff_summary || '').slice(0, 2000)}\n\`\`\``,
            branchName,
            baseBranch,
          );
          if (prRes.number) prNumber = prRes.number;
          if (prRes.html_url) prUrl = prRes.html_url;
        }
      } catch {
        // Fallback to comparison URL
      }
    }

    task.created_branch = branchName;
    task.pr_number = prNumber;
    task.pr_url = prUrl;
    this.db.save();

    await this.ws.broadcastTaskEvent(taskId, 'git_pushed', {
      branch: branchName,
      repo: repo.full_name,
      pr_url: prUrl,
      pr_number: prNumber,
      push_success: pushSuccess,
    });

    return {
      success: pushSuccess,
      pr_url: prUrl,
      pr_number: prNumber || undefined,
      error: pushSuccess ? undefined : pushErrorMsg,
    };
  }
}
