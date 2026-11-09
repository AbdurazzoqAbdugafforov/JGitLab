import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';
import {
  DatabaseService,
  genUuid,
  utcNow,
} from '../database/database.service';
import { UserEntity } from '../database/entities';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly config: ConfigService,
    private readonly security: SecurityService,
    private readonly db: DatabaseService,
  ) {}

  private validatePasswordPolicy(password: string): string {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      throw new BadRequestException('Password cannot exceed 128 characters');
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLetter || !hasDigit) {
      throw new BadRequestException('Password must contain at least one letter and one number');
    }
    return password;
  }

  // 1. System Overview & Telemetry
  @Get('overview')
  getSystemOverview() {
    const nowIso = utcNow();
    const users = this.db.store.users;
    const activeSessions = this.db.store.sessions.filter(
      (s) => !s.revoked_at && s.expires_at > nowIso,
    );
    const tasks = this.db.store.agent_tasks;
    const projects = this.db.store.projects;
    const memories = this.db.store.memory_records;

    const memUsage = process.memoryUsage();

    return {
      status: 'operational',
      environment: process.env.NODE_ENV || 'development',
      server_time: nowIso,
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version,
      platform: process.platform,
      memory: {
        heap_used_mb: Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10,
        heap_total_mb: Math.round((memUsage.heapTotal / 1024 / 1024) * 10) / 10,
        rss_mb: Math.round((memUsage.rss / 1024 / 1024) * 10) / 10,
      },
      stats: {
        total_users: users.length,
        active_users: users.filter((u) => u.is_active).length,
        admin_users: users.filter((u) => u.role === 'admin' || u.is_superuser).length,
        engineer_users: users.filter((u) => u.role === 'engineer' && !u.is_superuser).length,
        active_sessions: activeSessions.length,
        total_projects: projects.length,
        total_tasks: tasks.length,
        completed_tasks: tasks.filter((t) => t.status === 'completed').length,
        in_progress_tasks: tasks.filter((t) => ['planning', 'in_progress'].includes(t.status)).length,
        failed_tasks: tasks.filter((t) => t.status === 'failed').length,
        total_memories: memories.length,
        activity_logs_count: this.db.store.activity_logs.length,
      },
      security: {
        csrf_protection: true,
        rate_limiting: true,
        double_submit_cookies: true,
        sandbox_timeout_seconds: 60,
        google_oauth_configured: this.config.googleConfigured,
        github_oauth_configured: this.config.githubLoginConfigured,
        github_app_configured: this.config.githubAppConfigured,
      },
    };
  }

  // 2. User Management: List all users
  @Get('users')
  listUsers() {
    const nowIso = utcNow();
    return this.db.store.users.map((u) => {
      const activeSessionsCount = this.db.store.sessions.filter(
        (s) => s.user_id === u.id && !s.revoked_at && s.expires_at > nowIso,
      ).length;

      const identities = this.db.store.identity_accounts
        .filter((i) => i.user_id === u.id)
        .map((i) => ({ provider: i.provider, username: i.username, email: i.email }));

      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        role: u.role,
        is_active: u.is_active,
        is_superuser: u.is_superuser,
        email_verified: Boolean(u.email_verified),
        has_password: Boolean(u.hashed_password),
        created_at: u.created_at,
        updated_at: u.updated_at,
        active_sessions_count: activeSessionsCount,
        linked_providers: identities,
      };
    });
  }

  // 3. User Management: Create new user directly as Admin
  @Post('users')
  @HttpCode(201)
  createUser(
    @Body()
    body: {
      email?: string;
      password?: string;
      full_name?: string;
      role?: 'admin' | 'engineer';
      is_active?: boolean;
    },
    @CurrentUser() adminUser: UserEntity,
  ) {
    const rawEmail = (body.email || '').trim().toLowerCase();
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    this.validatePasswordPolicy(body.password || '');

    const existing = this.db.store.users.find(
      (u) => u.email.toLowerCase() === rawEmail,
    );
    if (existing) {
      throw new BadRequestException('A user with this email address already exists.');
    }

    const assignedRole = body.role === 'admin' ? 'admin' : 'engineer';
    const isSuperuser = assignedRole === 'admin';
    const now = utcNow();

    const newUser: UserEntity = {
      id: genUuid(),
      email: rawEmail,
      hashed_password: this.security.hashPassword(body.password!),
      full_name: body.full_name ? body.full_name.trim() : null,
      avatar_url: null,
      email_verified: true,
      role: assignedRole,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      is_superuser: isSuperuser,
      onboarding: { completed: ['account'], dismissed: true },
      created_at: now,
      updated_at: now,
    };

    this.db.store.users.push(newUser);
    this.db.ensurePersonalWorkspace(newUser);

    // Audit log
    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: null,
      user_id: adminUser.id,
      action_type: 'admin_user_created',
      entity_type: 'user',
      entity_id: newUser.id,
      description: `Administrator created user ${newUser.email} with role '${assignedRole}'.`,
      metadata_json: JSON.stringify({ role: assignedRole, created_by: adminUser.email }),
      ip_address: null,
      created_at: now,
    });

    this.db.save();

    return {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role,
      is_active: newUser.is_active,
      is_superuser: newUser.is_superuser,
      created_at: newUser.created_at,
    };
  }

  // 4. User Management: Update role, status, or reset password
  @Patch('users/:userId')
  updateUser(
    @Param('userId') targetUserId: string,
    @Body()
    body: {
      role?: 'admin' | 'engineer';
      is_active?: boolean;
      full_name?: string;
      new_password?: string;
    },
    @CurrentUser() adminUser: UserEntity,
  ) {
    const user = this.db.store.users.find((u) => u.id === targetUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Safety check: Cannot demote or deactivate yourself
    if (user.id === adminUser.id) {
      if (body.is_active === false) {
        throw new BadRequestException('You cannot deactivate your own administrative account.');
      }
      if (body.role === 'engineer') {
        throw new BadRequestException('You cannot remove administrator privileges from yourself.');
      }
    }

    const changes: string[] = [];

    if (body.role && (body.role === 'admin' || body.role === 'engineer')) {
      const oldRole = user.role;
      user.role = body.role;
      user.is_superuser = body.role === 'admin';
      changes.push(`role changed from ${oldRole} to ${body.role}`);
    }

    if (body.is_active !== undefined) {
      const oldStatus = user.is_active;
      user.is_active = Boolean(body.is_active);
      changes.push(`status changed from ${oldStatus ? 'active' : 'suspended'} to ${user.is_active ? 'active' : 'suspended'}`);

      // If user was deactivated, revoke all active sessions immediately
      if (!user.is_active) {
        this.db.revokeUserSessions(user.id);
        changes.push('all active sessions terminated');
      }
    }

    if (body.full_name !== undefined) {
      user.full_name = body.full_name ? body.full_name.trim() : null;
      changes.push('name updated');
    }

    if (body.new_password) {
      this.validatePasswordPolicy(body.new_password);
      user.hashed_password = this.security.hashPassword(body.new_password);
      // Revoke all sessions so the user must log in with new password
      this.db.revokeUserSessions(user.id);
      changes.push('password reset by admin (all active sessions revoked)');
    }

    user.updated_at = utcNow();

    // Audit log
    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: null,
      user_id: adminUser.id,
      action_type: 'admin_user_updated',
      entity_type: 'user',
      entity_id: user.id,
      description: `Admin updated user ${user.email}: ${changes.join(', ')}.`,
      metadata_json: JSON.stringify({ changes, updated_by: adminUser.email }),
      ip_address: null,
      created_at: user.updated_at,
    });

    this.db.save();

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      is_superuser: user.is_superuser,
      updated_at: user.updated_at,
      changes,
    };
  }

  // 5. User Management: Delete user
  @Delete('users/:userId')
  deleteUser(
    @Param('userId') targetUserId: string,
    @CurrentUser() adminUser: UserEntity,
  ) {
    if (targetUserId === adminUser.id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const index = this.db.store.users.findIndex((u) => u.id === targetUserId);
    if (index === -1) {
      throw new NotFoundException('User not found');
    }

    const user = this.db.store.users[index];

    // Revoke sessions
    this.db.revokeUserSessions(user.id);

    // Remove user
    this.db.store.users.splice(index, 1);

    // Audit log
    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: null,
      user_id: adminUser.id,
      action_type: 'admin_user_deleted',
      entity_type: 'user',
      entity_id: targetUserId,
      description: `Administrator deleted user ${user.email}.`,
      metadata_json: JSON.stringify({ deleted_user: user.email, deleted_by: adminUser.email }),
      ip_address: null,
      created_at: utcNow(),
    });

    this.db.save();

    return { message: `User ${user.email} was successfully deleted.` };
  }

  // 6. Active Platform Sessions
  @Get('sessions')
  listAllSessions() {
    const nowIso = utcNow();
    const activeSessions = this.db.store.sessions
      .filter((s) => !s.revoked_at && s.expires_at > nowIso)
      .map((s) => {
        const user = this.db.store.users.find((u) => u.id === s.user_id);
        return {
          id: s.id,
          user_id: s.user_id,
          user_email: user?.email || 'Unknown',
          user_name: user?.full_name || 'Anonymous',
          user_role: user?.role || 'unknown',
          auth_method: s.auth_method || 'password',
          ip_address: s.ip_address || 'unknown',
          user_agent: s.user_agent || 'unknown',
          created_at: s.created_at,
          expires_at: s.expires_at,
          last_seen_at: s.last_seen_at,
        };
      });

    return activeSessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  // 7. Revoke specific session
  @Delete('sessions/:sessionId')
  revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() adminUser: UserEntity,
  ) {
    const session = this.db.store.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    this.db.revokeSession(session);

    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: null,
      user_id: adminUser.id,
      action_type: 'admin_session_revoked',
      entity_type: 'session',
      entity_id: sessionId,
      description: `Administrator terminated session ${sessionId}.`,
      metadata_json: JSON.stringify({ session_id: sessionId, user_id: session.user_id }),
      ip_address: null,
      created_at: utcNow(),
    });

    this.db.save();

    return { message: 'Session revoked successfully.' };
  }

  // 8. Global Audit Logs
  @Get('audit-logs')
  getAuditLogs(
    @Query('limit') limitStr?: string,
    @Query('action_type') actionType?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr || '50', 10) || 50, 1), 200);

    let logs = [...this.db.store.activity_logs];
    if (actionType) {
      logs = logs.filter((l) => l.action_type === actionType);
    }

    logs.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return logs.slice(0, limit).map((l) => {
      const user = l.user_id ? this.db.store.users.find((u) => u.id === l.user_id) : null;
      return {
        ...l,
        user_email: user?.email || null,
        user_name: user?.full_name || null,
        user_role: user?.role || null,
      };
    });
  }
}
