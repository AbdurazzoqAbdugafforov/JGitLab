"""Identity providers, server-side sessions, GitHub App installations, project ownership

Revision ID: 002_auth_github_app
Revises: 001_initial
Create Date: 2026-11-03 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '002_auth_github_app'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---------------------------------------------------------------
    with op.batch_alter_table('users') as batch:
        batch.alter_column('hashed_password', existing_type=sa.String(255), nullable=True)
        batch.add_column(sa.Column('avatar_url', sa.String(512), nullable=True))
        batch.add_column(sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column('onboarding', sa.JSON(), nullable=True))

    # --- sessions ------------------------------------------------------------
    with op.batch_alter_table('sessions') as batch:
        batch.add_column(sa.Column('auth_method', sa.String(30), nullable=True))
        batch.add_column(sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))

    # --- organizations -------------------------------------------------------
    with op.batch_alter_table('organizations') as batch:
        batch.add_column(sa.Column('is_personal', sa.Boolean(), nullable=False, server_default=sa.false()))

    # --- projects ------------------------------------------------------------
    with op.batch_alter_table('projects') as batch:
        batch.add_column(sa.Column('created_by_id', sa.String(36), nullable=True))
        batch.create_foreign_key('fk_projects_created_by_users', 'users', ['created_by_id'], ['id'], ondelete='SET NULL')
        batch.create_index('ix_projects_created_by_id', ['created_by_id'])

    # --- repositories --------------------------------------------------------
    with op.batch_alter_table('repositories') as batch:
        batch.add_column(sa.Column('installation_id', sa.BigInteger(), nullable=True))
        batch.create_index('ix_repositories_installation_id', ['installation_id'])

    # --- identity_accounts ---------------------------------------------------
    op.create_table(
        'identity_accounts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('provider', sa.String(30), nullable=False),
        sa.Column('provider_subject', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('username', sa.String(255), nullable=True),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.String(512), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('provider', 'provider_subject', name='uq_identity_provider_subject'),
    )

    # --- github_installations ------------------------------------------------
    op.create_table(
        'github_installations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('installation_id', sa.BigInteger(), nullable=True, index=True),
        sa.Column('account_login', sa.String(255), nullable=True),
        sa.Column('account_type', sa.String(30), nullable=True),
        sa.Column('account_avatar_url', sa.String(512), nullable=True),
        sa.Column('repository_selection', sa.String(20), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='active'),
        sa.Column('status_message', sa.Text(), nullable=True),
        sa.Column('repository_count', sa.Integer(), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('github_installations')
    op.drop_table('identity_accounts')
    with op.batch_alter_table('repositories') as batch:
        batch.drop_index('ix_repositories_installation_id')
        batch.drop_column('installation_id')
    with op.batch_alter_table('projects') as batch:
        batch.drop_index('ix_projects_created_by_id')
        batch.drop_constraint('fk_projects_created_by_users', type_='foreignkey')
        batch.drop_column('created_by_id')
    with op.batch_alter_table('organizations') as batch:
        batch.drop_column('is_personal')
    with op.batch_alter_table('sessions') as batch:
        batch.drop_column('revoked_at')
        batch.drop_column('last_seen_at')
        batch.drop_column('auth_method')
    with op.batch_alter_table('users') as batch:
        batch.drop_column('onboarding')
        batch.drop_column('email_verified')
        batch.drop_column('avatar_url')
        batch.alter_column('hashed_password', existing_type=sa.String(255), nullable=False)
