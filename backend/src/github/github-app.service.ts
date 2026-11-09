import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';

export const INSTALL_STATE_TTL = 900;

export const SUPPORTED_WEBHOOK_EVENTS: string[] = [
  'ping',
  'installation',
  'installation_repositories',
  'push',
  'pull_request',
  'issues',
  'issue_comment',
  'check_run',
  'check_suite',
];

export const RECOMMENDED_PERMISSIONS: Record<string, string> = {
  metadata: 'read',
  contents: 'write',
  pull_requests: 'write',
  checks: 'read',
};

export class GitHubAppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
  }
}

@Injectable()
export class GitHubAppService {
  private readonly installationTokenCache = new Map<
    number,
    { token: string; expiresEpoch: number }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly security: SecurityService,
  ) {}

  encodeInstallState(userId: string, nextPath = '/github', origin?: string | null): string {
    const safeNext =
      nextPath.startsWith('/') && !nextPath.startsWith('//')
        ? nextPath
        : '/github';
    const payload = {
      purpose: 'gh_app_install',
      uid: userId,
      nx: safeNext,
      orig: origin || this.config.publicUrl,
      nonce: this.security.randomTokenUrlSafe(12),
      exp: Math.floor(Date.now() / 1000) + INSTALL_STATE_TTL,
    };
    return this.security.signJwtHs256(
      payload,
      this.config.internalSigningKey,
    );
  }

  decodeInstallState(token?: string | null): Record<string, any> {
    if (!token) {
      throw new GitHubAppError(
        'state_missing',
        'Installation state token is missing.',
      );
    }
    const res = this.security.verifyJwtHs256(
      token,
      this.config.internalSigningKey,
    );
    if (!res.valid) {
      if (res.expired) {
        throw new GitHubAppError(
          'state_expired',
          'Installation session expired. Please start again.',
        );
      }
      throw new GitHubAppError(
        'state_invalid',
        'Invalid installation state token.',
      );
    }
    if (res.payload?.purpose !== 'gh_app_install') {
      throw new GitHubAppError(
        'state_invalid',
        'Invalid installation state purpose.',
      );
    }
    return res.payload!;
  }

  buildInstallUrl(state: string): string {
    if (!this.config.GITHUB_APP_NAME) {
      throw new GitHubAppError(
        'app_not_configured',
        'GitHub App is not configured on this server. Set GITHUB_APP_NAME, GITHUB_APP_ID, and GITHUB_APP_PRIVATE_KEY.',
        503,
      );
    }
    const slug = this.config.GITHUB_APP_NAME.trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    const base = this.config.GITHUB_WEB_URL.replace(/\/+$/, '');
    const params = new URLSearchParams({ state });
    return `${base}/apps/${slug}/installations/new?${params.toString()}`;
  }

  createAppJwt(): string {
    if (!this.config.GITHUB_APP_ID || !this.config.githubAppPrivateKey) {
      throw new GitHubAppError(
        'app_not_configured',
        'GitHub App credentials (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY) are not configured.',
        503,
      );
    }
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 9 * 60,
      iss: String(this.config.GITHUB_APP_ID),
    };
    try {
      return this.security.signJwtRs256(
        payload,
        this.config.githubAppPrivateKey,
      );
    } catch (exc) {
      throw new GitHubAppError(
        'app_key_invalid',
        `Failed to sign GitHub App JWT: ${exc instanceof Error ? exc.message : String(exc)}`,
        500,
      );
    }
  }

  private appHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.createAppJwt()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'JGitLab-GitHubApp',
    };
  }

  async listAppInstallations(): Promise<Array<Record<string, any>>> {
    const url = `${this.config.GITHUB_API_URL.replace(/\/+$/, '')}/app/installations?per_page=100`;
    try {
      const resp = await fetch(url, {
        headers: this.appHeaders(),
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) {
        return [];
      }
      const data: any = await resp.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async fetchInstallationMetadata(
    installationId: number,
  ): Promise<Record<string, any>> {
    const url = `${this.config.GITHUB_API_URL.replace(/\/+$/, '')}/app/installations/${installationId}`;
    const resp = await fetch(url, {
      headers: this.appHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    if (resp.status === 404) {
      throw new GitHubAppError(
        'installation_revoked',
        'GitHub App installation was removed or not found.',
        404,
      );
    }
    if (!resp.ok) {
      throw new GitHubAppError(
        'installation_lookup_failed',
        `GitHub API returned ${resp.status}.`,
        resp.status,
      );
    }
    return resp.json();
  }

  async mintInstallationToken(
    installationId: number,
    forceRefresh = false,
  ): Promise<string> {
    const now = Date.now() / 1000;
    const cached = this.installationTokenCache.get(installationId);
    if (cached && !forceRefresh && cached.expiresEpoch - now > 120) {
      return cached.token;
    }

    const url = `${this.config.GITHUB_API_URL.replace(/\/+$/, '')}/app/installations/${installationId}/access_tokens`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.appHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (resp.status === 404) {
      this.installationTokenCache.delete(installationId);
      throw new GitHubAppError(
        'installation_revoked',
        'GitHub App installation was revoked on GitHub.',
        404,
      );
    }
    if (resp.status === 403) {
      this.installationTokenCache.delete(installationId);
      throw new GitHubAppError(
        'installation_suspended',
        'GitHub App installation is suspended or lacks permission.',
        403,
      );
    }
    if (resp.status !== 200 && resp.status !== 201) {
      throw new GitHubAppError(
        'token_mint_failed',
        `Could not mint installation token (${resp.status}).`,
        resp.status,
      );
    }

    const data: any = await resp.json();
    const token = data.token;
    let expEpoch = now + 3300;
    if (data.expires_at) {
      const parsed = Date.parse(data.expires_at);
      if (!Number.isNaN(parsed)) {
        expEpoch = parsed / 1000;
      }
    }
    this.installationTokenCache.set(installationId, {
      token,
      expiresEpoch: expEpoch,
    });
    return token;
  }

  clearCachedInstallationToken(installationId?: number | null): void {
    if (installationId !== undefined && installationId !== null) {
      this.installationTokenCache.delete(Number(installationId));
    }
  }

  async listInstallationRepositories(
    installationId: number,
  ): Promise<{ selection: string; repos: Array<Record<string, any>> }> {
    const token = await this.mintInstallationToken(installationId);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'JGitLab-GitHubApp',
    };

    const repos: Array<Record<string, any>> = [];
    let selection = 'selected';
    const baseUrl = `${this.config.GITHUB_API_URL.replace(/\/+$/, '')}/installation/repositories`;

    for (let page = 1; page <= 5; page++) {
      const resp = await fetch(`${baseUrl}?per_page=100&page=${page}`, {
        headers,
        signal: AbortSignal.timeout(20000),
      });
      if (resp.status === 401 || resp.status === 403) {
        throw new GitHubAppError(
          'installation_forbidden',
          'Installation token rejected by GitHub.',
          resp.status,
        );
      }
      if (!resp.ok) {
        throw new GitHubAppError(
          'repos_fetch_failed',
          `Failed to list installation repositories (${resp.status}).`,
        );
      }
      const payload: any = await resp.json();
      selection = payload.repository_selection || selection;
      const items: any[] = payload.repositories || [];
      for (const r of items) {
        repos.push({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          owner: r.owner?.login || '',
          html_url: r.html_url,
          clone_url: r.clone_url,
          default_branch: r.default_branch || 'main',
          description: r.description || null,
          language: r.language || null,
          is_private: Boolean(r.private),
          updated_at: r.updated_at || null,
          installation_id: installationId,
          permissions: r.permissions,
        });
      }
      if (items.length < 100) break;
    }

    return { selection, repos };
  }

  signWebhookPayload(rawBody: Buffer, secret?: string): string {
    const effectiveSecret = (
      secret !== undefined ? secret : this.config.GITHUB_APP_WEBHOOK_SECRET
    ).trim();
    const digest = crypto
      .createHmac('sha256', effectiveSecret)
      .update(rawBody)
      .digest('hex');
    return `sha256=${digest}`;
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader?: string | null,
  ): void {
    const secret = (this.config.GITHUB_APP_WEBHOOK_SECRET || '').trim();
    if (!secret) {
      if (this.config.isProduction) {
        throw new GitHubAppError(
          'webhook_secret_not_configured',
          'GITHUB_APP_WEBHOOK_SECRET must be configured in production.',
          503,
        );
      }
      if (signatureHeader) {
        throw new GitHubAppError(
          'webhook_secret_not_configured',
          'Received signed webhook request, but GITHUB_APP_WEBHOOK_SECRET is not configured on the server.',
          401,
        );
      }
      return;
    }

    if (!signatureHeader) {
      throw new GitHubAppError(
        'webhook_signature_missing',
        'Missing X-Hub-Signature-256 header.',
        401,
      );
    }

    const sig = signatureHeader.trim();
    if (!sig.startsWith('sha256=')) {
      throw new GitHubAppError(
        'webhook_signature_invalid',
        "Invalid X-Hub-Signature-256 format (expected 'sha256=<hex>').",
        401,
      );
    }

    const expected = this.signWebhookPayload(rawBody, secret);
    const expBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
    if (
      expBuf.length !== sigBuf.length ||
      !crypto.timingSafeEqual(expBuf, sigBuf)
    ) {
      throw new GitHubAppError(
        'webhook_signature_mismatch',
        'Webhook HMAC-SHA256 signature verification failed.',
        401,
      );
    }
  }
}
