import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';
import {
  DatabaseService,
  genUuid,
  utcNow,
} from '../database/database.service';
import { IdentityAccountEntity, UserEntity } from '../database/entities';

export const FLOW_COOKIE = 'jgl_oauth_flow';
export const FLOW_TTL_SECONDS = 600;
export const SUPPORTED_PROVIDERS = new Set(['google', 'github']);

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export class OAuthError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message || code);
  }
}

export interface ProviderIdentity {
  provider: string;
  subject: string;
  email: string | null;
  email_verified: boolean;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

@Injectable()
export class OAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly security: SecurityService,
    private readonly db: DatabaseService,
  ) {}

  providerConfigured(provider: string): boolean {
    if (provider === 'google') return this.config.googleConfigured;
    if (provider === 'github') return this.config.githubLoginConfigured;
    return false;
  }

  callbackUrl(provider: string, requestOrigin?: string | null): string {
    const base = requestOrigin ? requestOrigin.replace(/\/+$/, '') : this.config.publicUrl;
    return `${base}${this.config.API_V1_STR}/auth/oauth/${provider}/callback`;
  }

  safeNextPath(value?: string | null): string {
    if (
      !value ||
      !value.startsWith('/') ||
      value.startsWith('//') ||
      value.includes('\\')
    ) {
      return '/dashboard';
    }
    return value.slice(0, 300);
  }

  newFlow(
    provider: string,
    intent: string,
    nextPath: string,
    linkUserId: string | null,
    origin?: string | null,
  ): Record<string, any> {
    const verifier = crypto.randomBytes(48).toString('base64url');
    const cb = this.callbackUrl(provider, origin);
    return {
      p: provider,
      s: this.security.randomTokenUrlSafe(24),
      v: verifier,
      n: this.security.randomTokenUrlSafe(16),
      i: intent,
      nx: this.safeNextPath(nextPath),
      u: linkUserId,
      cb,
      orig: origin || this.config.publicUrl,
      exp: Math.floor(Date.now() / 1000) + FLOW_TTL_SECONDS,
    };
  }

  encodeFlow(flow: Record<string, any>): string {
    return this.security.signJwtHs256(flow, this.config.authSecret);
  }

  decodeFlow(token?: string | null): Record<string, any> {
    if (!token) {
      throw new OAuthError(
        'state_missing',
        'The sign-in session expired. Please try again.',
      );
    }
    const res = this.security.verifyJwtHs256(token, this.config.authSecret);
    if (!res.valid) {
      if (res.expired) {
        throw new OAuthError(
          'state_expired',
          'The sign-in attempt took too long. Please try again.',
        );
      }
      throw new OAuthError(
        'state_invalid',
        'The sign-in request could not be verified.',
      );
    }
    return res.payload!;
  }

  authorizationUrl(flow: Record<string, any>): string {
    const provider = flow.p;
    const challenge = crypto
      .createHash('sha256')
      .update(flow.v, 'utf8')
      .digest('base64url');

    if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: this.config.AUTH_GOOGLE_ID,
        redirect_uri: flow.cb || this.callbackUrl('google'),
        response_type: 'code',
        scope: 'openid email profile',
        state: flow.s,
        nonce: flow.n,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
        access_type: 'online',
      });
      return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    if (provider === 'github') {
      const params = new URLSearchParams({
        client_id: this.config.AUTH_GITHUB_ID,
        redirect_uri: flow.cb || this.callbackUrl('github'),
        scope: 'read:user user:email',
        state: flow.s,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        allow_signup: 'true',
      });
      return `${GITHUB_AUTH_URL}?${params.toString()}`;
    }

    throw new OAuthError('provider_unsupported');
  }

  async exchangeCodeForIdentity(
    provider: string,
    code: string,
    flow: Record<string, any>,
  ): Promise<ProviderIdentity> {
    if (provider === 'google') {
      return this.exchangeGoogle(code, flow);
    }
    if (provider === 'github') {
      return this.exchangeGithub(code, flow);
    }
    throw new OAuthError('provider_unsupported');
  }

  private async exchangeGoogle(
    code: string,
    flow: Record<string, any>,
  ): Promise<ProviderIdentity> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.AUTH_GOOGLE_ID,
      client_secret: this.config.AUTH_GOOGLE_SECRET,
      redirect_uri: flow.cb || this.callbackUrl('google'),
      grant_type: 'authorization_code',
      code_verifier: flow.v,
    });

    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      throw new OAuthError(
        'token_exchange_failed',
        'Google rejected the sign-in code.',
      );
    }

    const data: any = await resp.json();
    const idToken = data.id_token;
    if (!idToken) {
      throw new OAuthError(
        'token_exchange_failed',
        'Google did not return an ID token.',
      );
    }

    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new OAuthError(
        'token_invalid',
        'Google identity token could not be verified.',
      );
    }
    const claims = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    );
    if (claims.nonce && claims.nonce !== flow.n) {
      throw new OAuthError('token_invalid', 'Token nonce mismatch.');
    }

    return {
      provider: 'google',
      subject: String(claims.sub),
      email: claims.email ? String(claims.email).toLowerCase() : null,
      email_verified: Boolean(claims.email_verified),
      display_name: claims.name || null,
      avatar_url: claims.picture || null,
    };
  }

  private async exchangeGithub(
    code: string,
    flow: Record<string, any>,
  ): Promise<ProviderIdentity> {
    const body = new URLSearchParams({
      client_id: this.config.AUTH_GITHUB_ID,
      client_secret: this.config.AUTH_GITHUB_SECRET,
      code,
      redirect_uri: flow.cb || this.callbackUrl('github'),
      code_verifier: flow.v,
    });

    const resp = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    const data: any = resp.ok ? await resp.json() : {};
    const token = data.access_token;
    if (!token) {
      throw new OAuthError(
        'token_exchange_failed',
        'GitHub rejected the sign-in code.',
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'JGitLab',
    };

    const [userResp, emailsResp] = await Promise.all([
      fetch(`${this.config.GITHUB_API_URL}/user`, {
        headers,
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`${this.config.GITHUB_API_URL}/user/emails`, {
        headers,
        signal: AbortSignal.timeout(15000),
      }),
    ]);

    if (!userResp.ok) {
      throw new OAuthError(
        'profile_failed',
        'Could not read your GitHub profile.',
      );
    }

    const profile: any = await userResp.json();
    let email: string | null = null;
    let verified = false;
    if (emailsResp.ok) {
      const emails: any[] = await emailsResp.json();
      for (const entry of emails) {
        if (entry.primary && entry.verified) {
          email = String(entry.email || '').toLowerCase();
          verified = true;
          break;
        }
      }
    }

    return {
      provider: 'github',
      subject: String(profile.id),
      email,
      email_verified: verified,
      username: profile.login || null,
      display_name: profile.name || profile.login || null,
      avatar_url: profile.avatar_url || null,
    };
  }

  resolveIdentity(
    info: ProviderIdentity,
    intent: string,
    linkUser: UserEntity | null,
  ): { user: UserEntity; outcome: string } {
    const now = utcNow();
    let identity = this.db.store.identity_accounts.find(
      (i) => i.provider === info.provider && i.provider_subject === info.subject,
    );

    const refresh = (target: IdentityAccountEntity) => {
      target.email = info.email;
      target.email_verified = info.email_verified;
      target.username = info.username || null;
      target.display_name = info.display_name || null;
      target.avatar_url = info.avatar_url || null;
      target.last_login_at = now;
    };

    if (intent === 'link') {
      if (!linkUser) {
        throw new OAuthError(
          'link_requires_session',
          'Sign in again to link another provider.',
        );
      }
      if (identity) {
        if (identity.user_id !== linkUser.id) {
          const title =
            info.provider.charAt(0).toUpperCase() + info.provider.slice(1);
          throw new OAuthError(
            'identity_in_use',
            `This ${title} account is already linked to a different JGitLab account.`,
          );
        }
        refresh(identity);
        this.db.save();
        return { user: linkUser, outcome: 'already_linked' };
      }

      identity = {
        id: genUuid(),
        user_id: linkUser.id,
        provider: info.provider,
        provider_subject: info.subject,
        email: info.email,
        email_verified: info.email_verified,
        username: info.username || null,
        display_name: info.display_name || null,
        avatar_url: info.avatar_url || null,
        last_login_at: now,
        created_at: now,
      };
      this.db.store.identity_accounts.push(identity);
      if (!linkUser.avatar_url && info.avatar_url) {
        linkUser.avatar_url = info.avatar_url;
      }
      const title =
        info.provider.charAt(0).toUpperCase() + info.provider.slice(1);
      this.db.store.activity_logs.push({
        id: genUuid(),
        project_id: null,
        user_id: linkUser.id,
        action_type: 'identity_linked',
        entity_type: 'account',
        entity_id: linkUser.id,
        description: `Linked ${title} sign-in to account.`,
        metadata_json: null,
        ip_address: null,
        created_at: now,
      });
      this.db.save();
      return { user: linkUser, outcome: 'linked' };
    }

    // Sign-in flow
    if (identity) {
      const user = this.db.store.users.find((u) => u.id === identity!.user_id);
      if (!user || !user.is_active) {
        throw new OAuthError(
          'account_disabled',
          'This account has been deactivated.',
        );
      }
      refresh(identity);
      this.db.save();
      return { user, outcome: 'signed_in' };
    }

    const title =
      info.provider.charAt(0).toUpperCase() + info.provider.slice(1);
    if (!info.email || !info.email_verified) {
      throw new OAuthError(
        'email_unverified',
        `Your ${title} account has no verified primary email address.`,
      );
    }

    const existing = this.db.store.users.find(
      (u) => u.email.toLowerCase() === info.email!.toLowerCase(),
    );
    if (existing) {
      if (!existing.is_active) {
        throw new OAuthError(
          'account_disabled',
          'This account has been deactivated.',
        );
      }
      identity = {
        id: genUuid(),
        user_id: existing.id,
        provider: info.provider,
        provider_subject: info.subject,
        email: info.email,
        email_verified: info.email_verified,
        username: info.username || null,
        display_name: info.display_name || null,
        avatar_url: info.avatar_url || null,
        last_login_at: now,
        created_at: now,
      };
      this.db.store.identity_accounts.push(identity);
      if (!existing.avatar_url && info.avatar_url) {
        existing.avatar_url = info.avatar_url;
      }
      if (!existing.full_name && info.display_name) {
        existing.full_name = info.display_name;
      }
      existing.email_verified = true;
      this.db.store.activity_logs.push({
        id: genUuid(),
        project_id: null,
        user_id: existing.id,
        action_type: 'identity_linked',
        entity_type: 'account',
        entity_id: existing.id,
        description: `Linked ${title} sign-in to account via verified email.`,
        metadata_json: null,
        ip_address: null,
        created_at: now,
      });
      this.db.save();
      return { user: existing, outcome: 'signed_in' };
    }

    const newUser: UserEntity = {
      id: genUuid(),
      email: info.email.toLowerCase(),
      hashed_password: null,
      full_name: info.display_name || null,
      avatar_url: info.avatar_url || null,
      email_verified: true,
      role: 'engineer',
      is_active: true,
      is_superuser: false,
      onboarding: { completed: ['account'], dismissed: false },
      created_at: now,
      updated_at: now,
    };
    this.db.store.users.push(newUser);

    const newIdentity: IdentityAccountEntity = {
      id: genUuid(),
      user_id: newUser.id,
      provider: info.provider,
      provider_subject: info.subject,
      email: info.email,
      email_verified: info.email_verified,
      username: info.username || null,
      display_name: info.display_name || null,
      avatar_url: info.avatar_url || null,
      last_login_at: now,
      created_at: now,
    };
    this.db.store.identity_accounts.push(newIdentity);
    this.db.ensurePersonalWorkspace(newUser);
    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: null,
      user_id: newUser.id,
      action_type: 'account_registered',
      entity_type: 'account',
      entity_id: newUser.id,
      description: `Account created with ${title}.`,
      metadata_json: null,
      ip_address: null,
      created_at: now,
    });
    this.db.save();
    return { user: newUser, outcome: 'registered' };
  }
}
