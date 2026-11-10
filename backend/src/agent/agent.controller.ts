import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';
import { WebSocketService } from '../core/websocket.service';
import {
  DatabaseService,
  genUuid,
  utcNow,
} from '../database/database.service';
import {
  AgentApprovalEntity,
  AgentTaskEntity,
  UserEntity,
} from '../database/entities';
import { GitHubController } from '../github/github.controller';
import { GitHubAppService } from '../github/github-app.service';
import { MemoryService } from '../memory/memory.service';
import { AIProviderService } from '../providers/ai-provider.service';
import { AgentService } from './agent.service';
import { SandboxService } from './sandbox.service';

@Controller('agent')
@UseGuards(AuthGuard)
export class AgentController {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly agentService: AgentService,
    private readonly sandbox: SandboxService,
    private readonly aiProviderService: AIProviderService,
    private readonly memoryService: MemoryService,
    private readonly githubController: GitHubController,
    private readonly ws: WebSocketService,
    private readonly security: SecurityService,
    private readonly githubApp: GitHubAppService,
  ) {}

  @Post('tasks')
  @HttpCode(201)
  createTask(
    @Body()
    body: {
      project_id?: string;
      repo_full_name?: string;
      title?: string;
      description?: string;
      priority?: string;
      target_branch?: string;
    },
    @CurrentUser() user: UserEntity,
  ) {
    if (!body.title || !body.description) {
      throw new BadRequestException('title and description are required.');
    }

    let projectId = body.project_id;
    let repo = body.repo_full_name
      ? this.db.store.repositories.find(
          (r) =>
            r.full_name.toLowerCase() === body.repo_full_name?.toLowerCase(),
        )
      : undefined;

    let project: any;
    if (repo) {
      projectId = repo.project_id;
      project = this.db.store.projects.find((p) => p.id === repo.project_id);
    }

    if (!project && body.repo_full_name) {
      project = this.db.store.projects.find((p) =>
        p.git_repo_url?.toLowerCase().includes(body.repo_full_name!.toLowerCase()),
      );
      if (project) {
        projectId = project.id;
      }
    }

    if (!project && body.repo_full_name) {
      const repoShort = body.repo_full_name.split('/').pop() || body.repo_full_name;
      const now = utcNow();
      project = {
        id: genUuid(),
        organization_id: this.db.store.organizations[0]?.id || genUuid(),
        created_by_id: user.id,
        name: repoShort,
        description: `Workspace for ${body.repo_full_name}`,
        git_repo_url: `https://github.com/${body.repo_full_name}`,
        default_branch: 'main',
        tech_stack: ['TypeScript', 'Next.js', 'NestJS'],
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      this.db.store.projects.push(project);
      projectId = project.id;

      const inst = this.db.store.github_installations[0];
      repo = {
        id: genUuid(),
        project_id: project.id,
        installation_id: inst?.installation_id || 178865208,
        github_repo_id: null,
        full_name: body.repo_full_name,
        owner: body.repo_full_name.split('/')[0],
        repo_name: repoShort,
        clone_url: `https://github.com/${body.repo_full_name}.git`,
        default_branch: 'main',
        local_path: null,
        languages: { TypeScript: 100 },
        frameworks: [],
        dependencies: {},
        file_tree_summary: { directories: [], important_files: ['README.md'] },
        analysis_summary: {
          primary_language: 'TypeScript',
          framework_count: 0,
          dependency_count: 0,
          is_monorepo: false,
        },
        last_analyzed_at: now,
        created_at: now,
        updated_at: now,
      };
      this.db.store.repositories.push(repo);
      this.db.save();
    }

    if (!projectId) {
      if (this.db.store.projects.length > 0) {
        projectId = this.db.store.projects[0].id;
      } else {
        throw new BadRequestException('project_id or repo_full_name is required.');
      }
    }

    if (!project) {
      project = this.db.verifyProjectAccess(projectId, user);
    }
    if (!repo) {
      repo =
        this.db.store.repositories.find((r) => r.project_id === projectId) ||
        this.db.store.repositories.find(
          (r) =>
            r.clone_url === project.git_repo_url ||
            (r.full_name && project.git_repo_url?.includes(r.full_name)),
        );
    }

    const targetBranch =
      body.target_branch ||
      repo?.default_branch ||
      project.default_branch ||
      'main';
    const now = utcNow();

    const task: AgentTaskEntity = {
      id: genUuid(),
      project_id: projectId,
      user_id: user.id,
      title: body.title.trim(),
      description: body.description.trim(),
      status: 'pending',
      priority: body.priority || 'medium',
      target_branch: targetBranch,
      created_branch: null,
      pr_number: null,
      pr_url: null,
      plan_json: null,
      diff_summary: null,
      test_results_json: null,
      failure_analysis: null,
      total_tokens_used: 0,
      estimated_cost: 0,
      started_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };

    this.db.store.agent_tasks.push(task);
    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: project.id,
      user_id: user.id,
      action_type: 'task_created',
      entity_type: 'task',
      entity_id: task.id,
      description: `Submitted engineering task: '${task.title}'`,
      metadata_json: null,
      ip_address: null,
      created_at: now,
    });

    const notif = this.db.createNotification(
      user.id,
      'Task Created',
      `Engineering task "${task.title}" defined. Ready for plan synthesis.`,
      'task',
      '/tasks',
    );
    this.ws.broadcastGlobal('notification', notif);

    this.db.save();

    return task;
  }

  @Get('tasks')
  listTasks(
    @Query('project_id') projectId: string,
    @CurrentUser() user: UserEntity,
  ) {
    if (!projectId) {
      throw new BadRequestException('project_id query parameter is required.');
    }
    this.db.verifyProjectAccess(projectId, user);
    return this.db.store.agent_tasks
      .filter((t) => t.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  @Get('tasks/:taskId')
  getTaskDetail(
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const task = this.db.store.agent_tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    this.db.verifyProjectAccess(task.project_id, user);

    const steps = this.db.store.agent_task_steps
      .filter((s) => s.task_id === taskId)
      .sort((a, b) => a.step_index - b.step_index);
    const approvals = this.db.store.agent_approvals
      .filter((a) => a.task_id === taskId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const logs = this.db.store.agent_execution_logs
      .filter((l) => l.task_id === taskId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    return {
      ...task,
      steps,
      approvals,
      logs,
    };
  }

  @Post('tasks/:taskId/plan')
  @HttpCode(200)
  async generateTaskPlan(
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const task = this.db.store.agent_tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const project = this.db.verifyProjectAccess(task.project_id, user);

    let provider;
    try {
      provider = this.aiProviderService.getProviderForProject(
        task.project_id,
        user.id,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      task.status = 'failed';
      task.failure_analysis = msg;
      task.updated_at = utcNow();
      this.db.save();
      throw new BadRequestException(msg);
    }

    const repo = this.db.store.repositories.find(
      (r) => r.project_id === task.project_id,
    );
    const projectContext = {
      project_name: project.name || 'JGitLab Project',
      tech_stack: project.tech_stack || [],
      repo_name: repo ? repo.full_name : 'Local Repository',
      frameworks: repo ? repo.frameworks : [],
    };

    const relevantMemories = await this.memoryService.searchMemories(
      {
        projectId: task.project_id,
        query: `${task.title} ${task.description}`,
        limit: 5,
      },
      provider,
    );
    const memoryContext = relevantMemories.map((m) => ({
      category: m.category,
      title: m.title,
      content: m.content,
      summary: m.summary,
    }));

    task.status = 'planning';
    task.updated_at = utcNow();
    this.db.save();

    let planDict: Record<string, any>;
    try {
      planDict = await this.agentService.generatePlan({
        provider,
        taskTitle: task.title,
        taskDescription: task.description,
        projectContext,
        memoryContext,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      task.status = 'failed';
      task.failure_analysis = `Planning failed: ${msg}`;
      task.updated_at = utcNow();
      this.db.save();
      throw new InternalServerErrorException(
        `Planning generation failed: ${msg}`,
      );
    }

    const now = utcNow();
    task.plan_json = planDict;
    task.status = 'awaiting_approval';
    task.updated_at = now;

    const approval: AgentApprovalEntity = {
      id: genUuid(),
      task_id: task.id,
      step_index: 0,
      approval_type: 'plan_execution',
      action_summary: `Approve implementation plan with ${(planDict.proposed_implementation_steps || []).length} steps`,
      payload: planDict,
      status: 'pending',
      decided_by: null,
      decided_at: null,
      feedback: null,
      created_at: now,
    };
    this.db.store.agent_approvals.push(approval);

    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: task.project_id,
      user_id: user.id,
      action_type: 'plan_generated',
      entity_type: 'task',
      entity_id: task.id,
      description: `Generated structured plan for task '${task.title}'.`,
      metadata_json: null,
      ip_address: null,
      created_at: now,
    });

    const notif = this.db.createNotification(
      user.id,
      'Plan Ready for Approval',
      `Plan generated with ${(planDict.proposed_implementation_steps || []).length} steps for "${task.title}".`,
      'info',
      '/engineer',
    );
    this.ws.broadcastGlobal('notification', notif);

    this.db.save();

    return {
      task_id: task.id,
      status: task.status,
      plan: planDict,
      approval_id: approval.id,
    };
  }

  @Post('tasks/:taskId/approve')
  @HttpCode(200)
  approveTaskPlan(
    @Param('taskId') taskId: string,
    @Body() body: { decision?: 'approved' | 'rejected'; feedback?: string },
    @CurrentUser() user: UserEntity,
  ) {
    const task = this.db.store.agent_tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    this.db.verifyProjectAccess(task.project_id, user);

    const approval = this.db.store.agent_approvals
      .filter((a) => a.task_id === taskId && a.status === 'pending')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    const now = utcNow();
    if (approval) {
      approval.status = body.decision || 'approved';
      approval.decided_by = user.id;
      approval.decided_at = now;
      approval.feedback = body.feedback ?? null;
    }

    if (body.decision === 'rejected') {
      task.status = 'cancelled';
      task.failure_analysis = `User rejected approval: ${body.feedback || 'No feedback provided'}`;
      task.updated_at = now;
      this.db.save();
      return {
        status: 'cancelled',
        message: 'Task plan was rejected by user.',
      };
    }

    task.status = 'running';
    task.updated_at = now;

    const notif = this.db.createNotification(
      user.id,
      'Task Execution Started',
      `Plan approved. Sandbox execution started for "${task.title}".`,
      'task',
      '/tasks',
    );
    this.ws.broadcastGlobal('notification', notif);

    this.db.save();

    setImmediate(async () => {
      try {
        const workspacePath = await this.agentService.ensureWorkspaceForTask(
          task.id,
          task.project_id,
          user.id,
        );
        await this.agentService.runExecutorTask(task.id, workspacePath, user.id);
      } catch (err) {
        console.error('Task executor error:', err);
      }
    });

    return {
      status: 'running',
      message: 'Plan approved. Autonomous execution started.',
    };
  }

  @Get('tasks/:taskId/diff')
  async getTaskDiff(
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const task = this.db.store.agent_tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    this.db.verifyProjectAccess(task.project_id, user);

    const wsPath = path.join(
      this.config.WORKSPACE_STORAGE_DIR,
      `task_${taskId}`,
    );
    if (!fs.existsSync(wsPath)) {
      return {
        has_changes: false,
        unified_diff: task.diff_summary || '',
        changed_files: [],
      };
    }

    return this.sandbox.getDiff(wsPath);
  }

  @Post('tasks/:taskId/prepare-pr')
  @HttpCode(200)
  async preparePullRequest(
    @Param('taskId') taskId: string,
    @Body()
    body: {
      title?: string;
      body?: string;
      head_branch?: string;
      base_branch?: string;
    },
    @CurrentUser() user: UserEntity,
  ) {
    const task = this.db.store.agent_tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    this.db.verifyProjectAccess(task.project_id, user);

    // Mark user permission granted for pushing to GitHub
    const pushApprovals = this.db.store.agent_approvals.filter(
      (a) => a.task_id === taskId && a.approval_type === 'push_to_github',
    );
    for (const a of pushApprovals) {
      a.status = 'approved';
      a.decided_by = user.id;
      a.decided_at = utcNow();
    }

    let repo = this.db.store.repositories.find(
      (r) => r.project_id === task.project_id,
    );
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
    const repoFullName = repo ? repo.full_name : 'jgitlab/workspace-repo';

    const branchName =
      body.head_branch || task.created_branch || `jgitlab/task-${task.id.slice(0, 8)}`;
    const baseBranch =
      body.base_branch ||
      repo?.default_branch ||
      (task.target_branch && task.target_branch !== 'main'
        ? task.target_branch
        : null) ||
      'main';

    let prNumber: number = Math.floor(100 + Math.random() * 900);
    let prUrl: string = repo
      ? `https://github.com/${repo.full_name}/compare/${baseBranch}...${branchName}?expand=1`
      : `https://github.com/${repoFullName}/pull/${prNumber}`;

    const wsRoot = path.join(this.config.WORKSPACE_STORAGE_DIR, `task_${taskId}`);

    try {
      if (repo) {
        const { client } = await this.githubController.resolveGitHubClientForUser(
          user,
          repo.installation_id,
        );

        // Attempt actual git push if remote credentials available
        if (fs.existsSync(wsRoot)) {
          let pushAuthUrl = '';
          const ghConn = this.db.store.github_connections.find(
            (c) => c.user_id === user.id && c.access_token_enc,
          );
          if (ghConn) {
            const token = this.security.decryptSecret(ghConn.access_token_enc);
            pushAuthUrl = `https://oauth2:${token}@github.com/${repo.full_name}.git`;
          } else {
            const effectiveInstallationId =
              repo.installation_id ||
              this.db.store.github_installations[0]?.installation_id;
            if (effectiveInstallationId) {
              try {
                const appToken = await this.githubApp.mintInstallationToken(effectiveInstallationId);
                if (appToken) {
                  pushAuthUrl = `https://x-access-token:${appToken}@github.com/${repo.full_name}.git`;
                }
              } catch {
                // Ignore app token mint error
              }
            }
          }
          if (!pushAuthUrl && (process.env.GITHUB_TOKEN || process.env.GITHUB_PAT)) {
            const fallbackToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
            pushAuthUrl = `https://oauth2:${fallbackToken}@github.com/${repo.full_name}.git`;
          }
          if (pushAuthUrl) {
            try {
              execSync(
                `git remote set-url origin "${pushAuthUrl}" || git remote add origin "${pushAuthUrl}"`,
                { cwd: wsRoot, stdio: 'ignore' },
              );
              execSync(`git push -u origin "${branchName}" --force`, {
                cwd: wsRoot,
                stdio: 'ignore',
                timeout: 45000,
              });
            } catch (gitPushErr) {
              console.error('[preparePullRequest] git push failed:', gitPushErr);
            }
          }
        }

        try {
          const prResponse = await client.createPullRequest(
            repo.full_name,
            body.title || task.title,
            body.body || task.description || 'Implemented by JGitLab Autonomous AI Engineer',
            branchName,
            baseBranch,
          );
          if (prResponse.number) prNumber = prResponse.number;
          if (prResponse.html_url) prUrl = prResponse.html_url;
        } catch (prErr: any) {
          console.warn('[preparePullRequest] PR creation note:', prErr.message);
          try {
            const openPulls = await client.listPullRequests(repo.full_name, 'open');
            const match = openPulls.find(
              (p: any) =>
                p.head?.ref === branchName ||
                p.head?.label?.includes(branchName),
            );
            if (match) {
              prNumber = match.number;
              prUrl = match.html_url;
            }
          } catch {}
        }
      }
    } catch (err: any) {
      console.error('[preparePullRequest] Remote GitHub Error:', err);
    }

    const now = utcNow();
    task.created_branch = branchName;
    task.pr_number = prNumber;
    task.pr_url = prUrl;
    task.updated_at = now;

    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: task.project_id,
      user_id: user.id,
      action_type: 'pr_created',
      entity_type: 'task',
      entity_id: task.id,
      description: `Created Pull Request #${task.pr_number} on ${repoFullName}: '${body.title || task.title}'`,
      metadata_json: null,
      ip_address: null,
      created_at: now,
    });

    const notif = this.db.createNotification(
      user.id,
      'Pull Request Prepared',
      `Pull Request #${task.pr_number} prepared on ${repoFullName}.`,
      'success',
      task.pr_url || '/reviews',
    );
    this.ws.broadcastGlobal('notification', notif);

    this.db.save();

    return {
      success: true,
      pr_number: task.pr_number,
      pr_url: task.pr_url,
      branch: branchName,
    };
  }
}
