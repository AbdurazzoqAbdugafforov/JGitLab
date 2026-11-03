"""Initial schema for JGitLab

Revision ID: 001_initial
Revises: 
Create Date: 2026-11-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('role', sa.String(50), default='engineer', nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('is_superuser', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Sessions
    op.create_table(
        'sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('token_hash', sa.String(255), index=True, nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Organizations
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Organization Members
    op.create_table(
        'organization_members',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('role', sa.String(50), default='member', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Projects
    op.create_table(
        'projects',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), index=True, nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('git_repo_url', sa.String(512), nullable=True),
        sa.Column('default_branch', sa.String(100), default='main', nullable=False),
        sa.Column('tech_stack', sa.JSON, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # GitHub Connections
    op.create_table(
        'github_connections',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('access_token_enc', sa.Text, nullable=False),
        sa.Column('token_type', sa.String(50), default='bearer', nullable=False),
        sa.Column('scope', sa.String(255), default='repo,read:user', nullable=False),
        sa.Column('github_username', sa.String(100), nullable=True),
        sa.Column('github_user_id', sa.String(100), nullable=True),
        sa.Column('avatar_url', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Repositories
    op.create_table(
        'repositories',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('github_repo_id', sa.Integer, nullable=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('owner', sa.String(100), nullable=False),
        sa.Column('repo_name', sa.String(150), nullable=False),
        sa.Column('clone_url', sa.String(512), nullable=True),
        sa.Column('default_branch', sa.String(100), default='main', nullable=False),
        sa.Column('local_path', sa.String(512), nullable=True),
        sa.Column('languages', sa.JSON, nullable=False),
        sa.Column('frameworks', sa.JSON, nullable=False),
        sa.Column('dependencies', sa.JSON, nullable=False),
        sa.Column('file_tree_summary', sa.JSON, nullable=False),
        sa.Column('analysis_summary', sa.JSON, nullable=False),
        sa.Column('last_analyzed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # AI Provider Configurations
    op.create_table(
        'ai_provider_configurations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), index=True, nullable=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('provider_name', sa.String(100), default='openai-compatible', nullable=False),
        sa.Column('base_url', sa.String(512), nullable=False),
        sa.Column('api_key_enc', sa.Text, nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('embedding_model_name', sa.String(100), nullable=True),
        sa.Column('temperature', sa.Float, default=0.2, nullable=False),
        sa.Column('max_output_tokens', sa.Integer, default=4096, nullable=False),
        sa.Column('timeout_seconds', sa.Integer, default=60, nullable=False),
        sa.Column('max_retries', sa.Integer, default=3, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('last_validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('validation_status', sa.String(50), default='untested', nullable=False),
        sa.Column('validation_message', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Agent Tasks
    op.create_table(
        'agent_tasks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('status', sa.String(50), default='pending', nullable=False),
        sa.Column('priority', sa.String(20), default='medium', nullable=False),
        sa.Column('target_branch', sa.String(100), default='main', nullable=False),
        sa.Column('created_branch', sa.String(100), nullable=True),
        sa.Column('pr_number', sa.Integer, nullable=True),
        sa.Column('pr_url', sa.String(512), nullable=True),
        sa.Column('plan_json', sa.JSON, nullable=True),
        sa.Column('diff_summary', sa.Text, nullable=True),
        sa.Column('test_results_json', sa.JSON, nullable=True),
        sa.Column('failure_analysis', sa.Text, nullable=True),
        sa.Column('total_tokens_used', sa.Integer, default=0, nullable=False),
        sa.Column('estimated_cost', sa.Float, default=0.0, nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Agent Task Steps
    op.create_table(
        'agent_task_steps',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('task_id', sa.String(36), sa.ForeignKey('agent_tasks.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('step_index', sa.Integer, nullable=False),
        sa.Column('step_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('tool_name', sa.String(100), nullable=True),
        sa.Column('tool_input', sa.JSON, nullable=True),
        sa.Column('tool_output', sa.JSON, nullable=True),
        sa.Column('status', sa.String(50), default='pending', nullable=False),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('latency_ms', sa.Integer, default=0, nullable=False),
        sa.Column('tokens_used', sa.Integer, default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Agent Approvals
    op.create_table(
        'agent_approvals',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('task_id', sa.String(36), sa.ForeignKey('agent_tasks.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('step_index', sa.Integer, default=0, nullable=False),
        sa.Column('approval_type', sa.String(50), nullable=False),
        sa.Column('action_summary', sa.Text, nullable=False),
        sa.Column('payload', sa.JSON, nullable=True),
        sa.Column('status', sa.String(50), default='pending', nullable=False),
        sa.Column('decided_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('feedback', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Agent Execution Logs
    op.create_table(
        'agent_execution_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('task_id', sa.String(36), sa.ForeignKey('agent_tasks.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('level', sa.String(20), default='info', nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('metadata_json', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Memory Records
    op.create_table(
        'memory_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), index=True, nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('tags', sa.JSON, nullable=False),
        sa.Column('embedding_vector', sa.JSON, nullable=True),
        sa.Column('source_task_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Activity Logs
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), index=True, nullable=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), index=True, nullable=True),
        sa.Column('action_type', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.String(36), nullable=True),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('metadata_json', sa.JSON, nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('type', sa.String(50), default='info', nullable=False),
        sa.Column('is_read', sa.Boolean, default=False, nullable=False),
        sa.Column('link_url', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('activity_logs')
    op.drop_table('memory_records')
    op.drop_table('agent_execution_logs')
    op.drop_table('agent_approvals')
    op.drop_table('agent_task_steps')
    op.drop_table('agent_tasks')
    op.drop_table('ai_provider_configurations')
    op.drop_table('repositories')
    op.drop_table('github_connections')
    op.drop_table('projects')
    op.drop_table('organization_members')
    op.drop_table('organizations')
    op.drop_table('sessions')
    op.drop_table('users')
