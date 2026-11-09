import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  DatabaseService,
  genUuid,
  utcNow,
} from '../database/database.service';
import { ProjectEntity, UserEntity } from '../database/entities';

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly db: DatabaseService) {}

  @Get('workspaces')
  listWorkspaces(@CurrentUser() user: UserEntity) {
    this.db.ensurePersonalWorkspace(user);
    const memberships = this.db.store.organization_members.filter(
      (m) => m.user_id === user.id,
    );
    const items = [];
    for (const m of memberships) {
      const org = this.db.store.organizations.find(
        (o) => o.id === m.organization_id,
      );
      if (org) {
        items.push({
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          is_personal: org.is_personal,
          role: m.role,
        });
      }
    }
    items.sort((a, b) => {
      if (a.is_personal !== b.is_personal) {
        return a.is_personal ? -1 : 1;
      }
      return 0;
    });
    return items;
  }

  @Get()
  listProjects(
    @Query('organization_id') organizationId: string | undefined,
    @CurrentUser() user: UserEntity,
  ) {
    this.db.ensurePersonalWorkspace(user);
    const accessibleIds = new Set(this.db.getAccessibleProjectIds(user));
    if (accessibleIds.size === 0) return [];

    return this.db.store.projects
      .filter(
        (p) =>
          accessibleIds.has(p.id) &&
          (!organizationId || p.organization_id === organizationId),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  @Post()
  @HttpCode(201)
  createProject(
    @Body()
    body: {
      name?: string;
      description?: string;
      git_repo_url?: string;
      default_branch?: string;
      tech_stack?: string[];
      organization_id?: string;
    },
    @CurrentUser() user: UserEntity,
  ) {
    const name = (body.name || '').trim();
    if (!name) {
      throw new BadRequestException('Project name is required.');
    }

    const personalOrg = this.db.ensurePersonalWorkspace(user);
    const orgIds = new Set(this.db.getUserOrgIds(user));
    let targetOrgId = personalOrg.id;
    if (body.organization_id && orgIds.has(body.organization_id)) {
      targetOrgId = body.organization_id;
    }

    const now = utcNow();
    const project: ProjectEntity = {
      id: genUuid(),
      organization_id: targetOrgId,
      created_by_id: user.id,
      name,
      description: body.description ?? null,
      git_repo_url: body.git_repo_url ?? null,
      default_branch: body.default_branch || 'main',
      tech_stack: Array.isArray(body.tech_stack) ? body.tech_stack : [],
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    this.db.store.projects.push(project);

    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: project.id,
      user_id: user.id,
      action_type: 'project_created',
      entity_type: 'project',
      entity_id: project.id,
      description: `Project '${project.name}' was created.`,
      metadata_json: null,
      ip_address: null,
      created_at: now,
    });
    this.db.save();

    return project;
  }

  @Get(':projectId')
  getProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const project = this.db.verifyProjectAccess(projectId, user);
    const taskCount = this.db.store.agent_tasks.filter(
      (t) => t.project_id === projectId,
    ).length;
    const memoryCount = this.db.store.memory_records.filter(
      (m) => m.project_id === projectId,
    ).length;

    let hasActiveProvider = this.db.store.ai_provider_configurations.some(
      (c) => c.project_id === projectId && c.is_active,
    );
    if (!hasActiveProvider) {
      hasActiveProvider = this.db.store.ai_provider_configurations.some(
        (c) => c.user_id === user.id && c.is_active,
      );
    }

    const hasConnectedRepo = this.db.store.repositories.some(
      (r) => r.project_id === projectId,
    );

    return {
      ...project,
      task_count: taskCount,
      memory_count: memoryCount,
      has_active_provider: hasActiveProvider,
      has_connected_repo: hasConnectedRepo,
    };
  }

  @Patch(':projectId')
  updateProject(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      git_repo_url?: string;
      default_branch?: string;
      tech_stack?: string[];
      is_active?: boolean;
    },
    @CurrentUser() user: UserEntity,
  ) {
    const project = this.db.verifyProjectAccess(projectId, user);
    if (body.name !== undefined) project.name = body.name;
    if (body.description !== undefined) project.description = body.description;
    if (body.git_repo_url !== undefined)
      project.git_repo_url = body.git_repo_url;
    if (body.default_branch !== undefined)
      project.default_branch = body.default_branch;
    if (body.tech_stack !== undefined) project.tech_stack = body.tech_stack;
    if (body.is_active !== undefined) project.is_active = body.is_active;
    project.updated_at = utcNow();
    this.db.save();
    return project;
  }

  @Delete(':projectId')
  deleteProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserEntity,
  ) {
    this.db.verifyProjectAccess(projectId, user);
    this.db.deleteProjectCascade(projectId);
    return { message: 'Project deleted successfully.' };
  }
}
