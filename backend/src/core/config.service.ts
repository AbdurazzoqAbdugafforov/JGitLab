import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const DEV_SECRET = 'jgitlab-dev-only-secret-change-me-0000000000000000';

@Injectable()
export class ConfigService {
  PROJECT_NAME = 'JGitLab';
  VERSION = '0.2.0';
  API_V1_STR = '/api/v1';
  ENVIRONMENT = 'development';
  PORT = 8000;

  SECRET_KEY = DEV_SECRET;
  ALGORITHM = 'HS256';
  ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24;

  AUTH_SECRET = '';
  AUTH_URL = 'http://localhost:3000';
  BACKEND_INTERNAL_SIGNING_KEY = '';
  ENCRYPTION_KEY = 'cE1xWjRkTEpTYnF1Q2U0d1p5N3Y5SGFuYjJ1OTZtNnY=';

  SESSION_COOKIE_NAME = 'jgl_session';
  CSRF_COOKIE_NAME = 'jgl_csrf';
  SESSION_TTL_HOURS = 24 * 14;
  REAUTH_WINDOW_MINUTES = 15;
  COOKIE_SECURE: boolean | null = null;

  AUTH_GOOGLE_ID = '';
  AUTH_GOOGLE_SECRET = '';
  AUTH_GITHUB_ID = '';
  AUTH_GITHUB_SECRET = '';

  GITHUB_APP_ID = '';
  GITHUB_APP_NAME = '';
  GITHUB_APP_CLIENT_ID = '';
  GITHUB_APP_CLIENT_SECRET = '';
  GITHUB_APP_PRIVATE_KEY = '';
  GITHUB_APP_PRIVATE_KEY_PATH = '';
  GITHUB_APP_WEBHOOK_SECRET = '';
  GITHUB_API_URL = 'https://api.github.com';
  GITHUB_WEB_URL = 'https://github.com';

  BACKEND_CORS_ORIGINS: string[] = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ];

  MAX_TASK_STEPS = 25;
  MAX_TASK_TOKENS = 150000;
  TASK_TIMEOUT_SECONDS = 600;
  SANDBOX_TIMEOUT_SECONDS = 120;
  SANDBOX_MEMORY_LIMIT = '1024m';

  WORKSPACE_STORAGE_DIR = path.resolve(process.cwd(), 'workspaces');
  DATA_DIR = path.resolve(process.cwd(), 'data');

  ADMIN_EMAILS: string[] = [
    'abdurazzoqabdugafforov54@gmail.com',
    'admin@jgitlab.local',
  ];

  constructor() {
    this.loadDotEnv();
    this.applyEnvVars();
  }

  private loadDotEnv() {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '..', '.env'),
    ];
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        try {
          const content = fs.readFileSync(envPath, 'utf-8');
          for (const rawLine of content.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            const eqIdx = line.indexOf('=');
            if (eqIdx === -1) continue;
            const key = line.slice(0, eqIdx).trim();
            let val = line.slice(eqIdx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        } catch {
          // Ignore unreadable .env
        }
      }
    }
  }

  private applyEnvVars() {
    const env = process.env;
    if (env.PROJECT_NAME) this.PROJECT_NAME = env.PROJECT_NAME;
    if (env.VERSION) this.VERSION = env.VERSION;
    if (env.ENVIRONMENT) this.ENVIRONMENT = env.ENVIRONMENT;
    if (env.PORT) this.PORT = parseInt(env.PORT, 10) || 8000;

    if (env.SECRET_KEY) this.SECRET_KEY = env.SECRET_KEY;
    if (env.AUTH_SECRET) this.AUTH_SECRET = env.AUTH_SECRET;
    if (env.AUTH_URL) this.AUTH_URL = env.AUTH_URL;
    if (env.BACKEND_INTERNAL_SIGNING_KEY)
      this.BACKEND_INTERNAL_SIGNING_KEY = env.BACKEND_INTERNAL_SIGNING_KEY;
    if (env.ENCRYPTION_KEY) this.ENCRYPTION_KEY = env.ENCRYPTION_KEY;

    if (env.AUTH_GOOGLE_ID !== undefined)
      this.AUTH_GOOGLE_ID = env.AUTH_GOOGLE_ID;
    if (env.AUTH_GOOGLE_SECRET !== undefined)
      this.AUTH_GOOGLE_SECRET = env.AUTH_GOOGLE_SECRET;
    if (env.AUTH_GITHUB_ID !== undefined)
      this.AUTH_GITHUB_ID = env.AUTH_GITHUB_ID;
    if (env.AUTH_GITHUB_SECRET !== undefined)
      this.AUTH_GITHUB_SECRET = env.AUTH_GITHUB_SECRET;

    if (env.GITHUB_APP_ID !== undefined) this.GITHUB_APP_ID = env.GITHUB_APP_ID;
    if (env.GITHUB_APP_NAME !== undefined)
      this.GITHUB_APP_NAME = env.GITHUB_APP_NAME;
    if (env.GITHUB_APP_CLIENT_ID !== undefined)
      this.GITHUB_APP_CLIENT_ID = env.GITHUB_APP_CLIENT_ID;
    if (env.GITHUB_APP_CLIENT_SECRET !== undefined)
      this.GITHUB_APP_CLIENT_SECRET = env.GITHUB_APP_CLIENT_SECRET;
    if (env.GITHUB_APP_PRIVATE_KEY !== undefined)
      this.GITHUB_APP_PRIVATE_KEY = env.GITHUB_APP_PRIVATE_KEY;
    if (env.GITHUB_APP_PRIVATE_KEY_PATH !== undefined)
      this.GITHUB_APP_PRIVATE_KEY_PATH = env.GITHUB_APP_PRIVATE_KEY_PATH;
    if (env.GITHUB_APP_WEBHOOK_SECRET !== undefined)
      this.GITHUB_APP_WEBHOOK_SECRET = env.GITHUB_APP_WEBHOOK_SECRET;
    if (env.GITHUB_API_URL) this.GITHUB_API_URL = env.GITHUB_API_URL;
    if (env.GITHUB_WEB_URL) this.GITHUB_WEB_URL = env.GITHUB_WEB_URL;

    if (env.MAX_TASK_STEPS)
      this.MAX_TASK_STEPS = parseInt(env.MAX_TASK_STEPS, 10) || 25;
    if (env.MAX_TASK_TOKENS)
      this.MAX_TASK_TOKENS = parseInt(env.MAX_TASK_TOKENS, 10) || 150000;
    if (env.WORKSPACE_STORAGE_DIR)
      this.WORKSPACE_STORAGE_DIR = path.resolve(env.WORKSPACE_STORAGE_DIR);

    if (env.ADMIN_EMAILS) {
      this.ADMIN_EMAILS = env.ADMIN_EMAILS.split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  isEmailAdmin(email?: string | null): boolean {
    if (!email) return false;
    return this.ADMIN_EMAILS.includes(email.trim().toLowerCase());
  }

  get isProduction(): boolean {
    return this.ENVIRONMENT.toLowerCase() === 'production';
  }

  get isTest(): boolean {
    return (
      this.ENVIRONMENT.toLowerCase() === 'test' ||
      process.env.NODE_ENV === 'test'
    );
  }

  get authSecret(): string {
    return this.AUTH_SECRET || this.SECRET_KEY;
  }

  get internalSigningKey(): string {
    return this.BACKEND_INTERNAL_SIGNING_KEY || this.SECRET_KEY;
  }

  get cookieSecure(): boolean {
    if (this.COOKIE_SECURE !== null) return this.COOKIE_SECURE;
    return this.AUTH_URL.toLowerCase().startsWith('https://');
  }

  get publicUrl(): string {
    return this.AUTH_URL.replace(/\/+$/, '');
  }

  get googleConfigured(): boolean {
    return Boolean(this.AUTH_GOOGLE_ID && this.AUTH_GOOGLE_SECRET);
  }

  get githubLoginConfigured(): boolean {
    return Boolean(this.AUTH_GITHUB_ID && this.AUTH_GITHUB_SECRET);
  }

  get githubAppPrivateKey(): string {
    if (this.GITHUB_APP_PRIVATE_KEY) {
      return this.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n').trim();
    }
    if (
      this.GITHUB_APP_PRIVATE_KEY_PATH &&
      fs.existsSync(this.GITHUB_APP_PRIVATE_KEY_PATH)
    ) {
      try {
        return fs
          .readFileSync(this.GITHUB_APP_PRIVATE_KEY_PATH, 'utf-8')
          .trim();
      } catch {
        return '';
      }
    }
    return '';
  }

  get githubAppConfigured(): boolean {
    return Boolean(
      this.GITHUB_APP_ID &&
        this.GITHUB_APP_NAME &&
        this.githubAppPrivateKey,
    );
  }

  updateEnvFile(updates: Record<string, string>) {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '..', '.env'),
    ];
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        try {
          let content = fs.readFileSync(envPath, 'utf-8');
          for (const [k, v] of Object.entries(updates)) {
            const regex = new RegExp(`^${k}=.*$`, 'm');
            const safeVal = `"${String(v).replace(/"/g, '\\"')}"`;
            if (regex.test(content)) {
              content = content.replace(regex, `${k}=${safeVal}`);
            } else {
              content += `\n${k}=${safeVal}`;
            }
            process.env[k] = v;
          }
          fs.writeFileSync(envPath, content, 'utf-8');
        } catch {
          // ignore error
        }
      }
    }
  }
}
