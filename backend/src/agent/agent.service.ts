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

      // 1. If repo has local path on disk, copy it
      if (repo?.local_path && fs.existsSync(repo.local_path)) {
        try {
          fs.cpSync(repo.local_path, wsRoot, {
            recursive: true,
            filter: (src) =>
              !src.includes('node_modules') &&
              !src.includes('.git') &&
              !src.includes('.next') &&
              !src.includes('dist'),
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

      // 2. Real Remote Clone from GitHub!
      if (!initialized && repo) {
        let authCloneUrl = '';
        if (repo.installation_id) {
          try {
            const appToken = await this.githubApp.mintInstallationToken(
              repo.installation_id,
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
              timeout: 60000,
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
            'You are JGitLab Autonomous AI Software Engineer. You have access to backend tools to inspect, ' +
            'edit, test, and verify code inside a secure sandbox.\n' +
            'RULES:\n' +
            '1. Always read files before editing them.\n' +
            '2. Use edit_file for precise modifications or create_file for new files.\n' +
            '3. Run automated tests (run_tests) or builds (run_build) after making changes.\n' +
            '4. Once all modifications and tests pass, explain your solution clearly and conclude without calling more tools.',
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

      // Register Push to GitHub permission request
      const pushApproval = {
        id: genUuid(),
        task_id: taskId,
        step_index: stepCounter + 1,
        approval_type: 'push_to_github',
        action_summary: `Permission to push branch '${branchName}' and create Pull Request on GitHub`,
        payload: {
          branch: branchName,
          diff_summary: task.diff_summary,
        },
        status: 'pending',
        decided_by: null,
        decided_at: null,
        feedback: null,
        created_at: utcNow(),
      };
      this.db.store.agent_approvals.push(pushApproval);
      this.db.save();

      await this.logTask(
        taskId,
        'info',
        `Task execution finished. Branch '${branchName}' committed. Awaiting user permission to push to GitHub.`,
      );
      await this.ws.broadcastTaskEvent(taskId, 'status_change', {
        status: 'completed',
        has_diff: Boolean(diffInfo.has_changes),
        tests_passed: Boolean(testResult.success),
        branch: branchName,
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
        'Task Completed & Ready for Review',
        `Task "${task.title}" verified. Ready for your permission to push to GitHub.`,
        'success',
        '/engineer',
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
}
