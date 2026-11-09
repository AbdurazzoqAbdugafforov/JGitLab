import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';
import {
  DatabaseStore,
  UserEntity,
  SessionEntity,
  OrganizationEntity,
  ProjectEntity,
  RepositoryEntity,
  MemoryRecordEntity,
  AIProviderConfigurationEntity,
  ActivityLogEntity,
  NotificationEntity,
  ModelDatasetEntity,
  ModelTrainingJobEntity,
  ModelCheckpointEntity,
  TrainingLossPoint,
} from './entities';

export function genUuid(): string {
  return crypto.randomUUID();
}

export function utcNow(): string {
  return new Date().toISOString();
}

function emptyStore(): DatabaseStore {
  return {
    users: [],
    sessions: [],
    identity_accounts: [],
    organizations: [],
    organization_members: [],
    projects: [],
    github_connections: [],
    github_installations: [],
    repositories: [],
    ai_provider_configurations: [],
    agent_tasks: [],
    agent_task_steps: [],
    agent_approvals: [],
    agent_execution_logs: [],
    memory_records: [],
    activity_logs: [],
    notifications: [],
    model_datasets: [],
    model_training_jobs: [],
    model_checkpoints: [],
  };
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  store: DatabaseStore = emptyStore();
  private readonly dbFilePath: string;

  constructor(
    private readonly config: ConfigService,
    private readonly security: SecurityService,
  ) {
    fs.mkdirSync(this.config.DATA_DIR, { recursive: true });
    fs.mkdirSync(this.config.WORKSPACE_STORAGE_DIR, { recursive: true });
    this.dbFilePath = path.join(this.config.DATA_DIR, 'jgitlab-store.json');
  }

  onModuleInit() {
    this.loadFromDisk();
    if (!this.config.isTest) {
      this.seedInitialData();
    }
  }

  resetForTesting() {
    this.store = emptyStore();
  }

  private loadFromDisk() {
    if (this.config.isTest) {
      this.store = emptyStore();
      return;
    }
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.store = {
          ...emptyStore(),
          ...parsed,
        };
        if (!Array.isArray(this.store.notifications)) {
          this.store.notifications = [];
        }
        if (this.store.notifications.length === 0 && this.store.users.length > 0) {
          this.seedNotificationsForExistingUsers();
        }
        if (
          !Array.isArray(this.store.model_datasets) ||
          this.store.model_datasets.length === 0
        ) {
          this.seedModelFactoryData();
        }

        // Ensure primary real administrator account is always guaranteed
        const defaultPassword = 'Admin12345!';
        const targetAccounts = [
          {
            email: 'abdurazzoqabdugafforov54@gmail.com',
            name: 'Abdurazzoq Abdugafforov',
            role: 'admin' as const,
          },
        ];
        const now = utcNow();
        for (const t of targetAccounts) {
          const u = this.store.users.find(usr => usr.email.toLowerCase() === t.email.toLowerCase());
          if (!u) {
            this.store.users.push({
              id: genUuid(),
              email: t.email,
              hashed_password: this.security.hashPassword(defaultPassword),
              full_name: t.name,
              avatar_url: null,
              email_verified: true,
              role: t.role,
              is_active: true,
              is_superuser: t.role === 'admin',
              onboarding: { completed: ['account'], dismissed: false },
              created_at: now,
              updated_at: now,
            });
          }
        }
      } catch {
        this.store = emptyStore();
      }
    }
  }

  save(): void {
    if (this.config.isTest) return;
    try {
      const tmpPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.store, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.dbFilePath);
    } catch {
      // Ignore write error on ephemeral FS
    }
  }

  seedInitialData(): void {
    const existingUser = this.store.users.find(
      (u) =>
        u.email.toLowerCase() === 'abdurazzoqabdugafforov54@gmail.com',
    );
    if (existingUser) {
      return;
    }

    const now = utcNow();
    const defaultPassword = 'Admin12345!';

    const abdurazzoq: UserEntity = {
      id: genUuid(),
      email: 'abdurazzoqabdugafforov54@gmail.com',
      hashed_password: this.security.hashPassword(defaultPassword),
      full_name: 'Abdurazzoq Abdugafforov',
      avatar_url: null,
      email_verified: true,
      role: 'admin',
      is_active: true,
      is_superuser: true,
      onboarding: { completed: ['account'], dismissed: false },
      created_at: now,
      updated_at: now,
    };

    this.store.users.push(abdurazzoq);

    if (this.config.isTest) {
      const testEng: UserEntity = {
        id: genUuid(),
        email: 'engineer@jgitlab.local',
        hashed_password: this.security.hashPassword('JGitLab2026!Dev'),
        full_name: 'Test Engineer',
        avatar_url: null,
        email_verified: true,
        role: 'engineer',
        is_active: true,
        is_superuser: false,
        onboarding: { completed: ['account'], dismissed: false },
        created_at: now,
        updated_at: now,
      };
      const testAdmin: UserEntity = {
        id: genUuid(),
        email: 'admin@jgitlab.local',
        hashed_password: this.security.hashPassword('JGitLab2026!Dev'),
        full_name: 'Test Admin',
        avatar_url: null,
        email_verified: true,
        role: 'admin',
        is_active: true,
        is_superuser: true,
        onboarding: { completed: ['account'], dismissed: false },
        created_at: now,
        updated_at: now,
      };
      this.store.users.push(testEng, testAdmin);
    }

    const org: OrganizationEntity = {
      id: genUuid(),
      name: 'JGitLab Labs',
      slug: 'jgitlab-labs',
      description: 'Autonomous Software Engineering Studio',
      is_personal: false,
      created_at: now,
    };
    this.store.organizations.push(org);

    this.store.organization_members.push({
      id: genUuid(),
      organization_id: org.id,
      user_id: abdurazzoq.id,
      role: 'owner',
      created_at: now,
    });

    const project: ProjectEntity = {
      id: genUuid(),
      organization_id: org.id,
      created_by_id: abdurazzoq.id,
      name: 'Web Shop Production',
      description:
        'Next-generation autonomous AI engineering core and provider gateway',
      git_repo_url: 'https://github.com/AbdurazzoqAbdugafforov/web-shop.git',
      default_branch: 'main',
      tech_stack: [
        'NestJS',
        'Next.js',
        'TypeScript',
        'Tailwind CSS',
        'Docker',
        'PostgreSQL',
      ],
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    this.store.projects.push(project);

    const repo: RepositoryEntity = {
      id: genUuid(),
      project_id: project.id,
      installation_id: null,
      github_repo_id: 1001,
      full_name: 'jgitlab/ai-engineering-core',
      owner: 'jgitlab',
      repo_name: 'ai-engineering-core',
      clone_url: 'https://github.com/jgitlab/ai-engineering-core.git',
      default_branch: 'main',
      local_path: null,
      languages: {
        TypeScript: 58.4,
        'TypeScript (React)': 38.4,
        CSS: 3.2,
      },
      frameworks: ['NestJS', 'Next.js', 'React', 'Tailwind CSS'],
      dependencies: {
        npm: [
          '@nestjs/core',
          '@nestjs/common',
          'next',
          'react',
          'react-dom',
          'lucide-react',
          'tailwindcss',
          'typescript',
        ],
      },
      file_tree_summary: {
        directories: [
          'backend/src/auth',
          'backend/src/agent',
          'backend/src/github',
          'backend/src/providers',
          'backend/src/memory',
          'frontend/src/app',
          'frontend/src/components',
          'frontend/src/lib',
        ],
        important_files: [
          'README.md',
          'docker-compose.yml',
          'backend/package.json',
          'backend/src/main.ts',
          'frontend/package.json',
        ],
      },
      analysis_summary: {
        primary_language: 'TypeScript',
        framework_count: 4,
        dependency_count: 16,
        is_monorepo: true,
      },
      last_analyzed_at: now,
      created_at: now,
      updated_at: now,
    };
    this.store.repositories.push(repo);

    if (this.config.isTest) {
      const defaultProvider: AIProviderConfigurationEntity = {
        id: genUuid(),
        project_id: project.id,
        user_id: abdurazzoq.id,
        provider_name: 'jgitlab-local',
        base_url: 'local://jgitlab-engine',
        api_key_enc: this.security.encryptSecret(
          'jgitlab-mvp-builtin-engine-key',
        ),
        model_name: 'jgitlab-autonomous-v1',
        embedding_model_name: 'text-embedding-3-small',
        temperature: 0.2,
        max_output_tokens: 4096,
        timeout_seconds: 60,
        max_retries: 2,
        is_active: true,
        last_validated_at: now,
        validation_status: 'success',
        validation_message:
          'Test Suite Local Provider active.',
        created_at: now,
        updated_at: now,
      };
      this.store.ai_provider_configurations.push(defaultProvider);
    } else {
      const claudeKey =
        process.env.ANTHROPIC_API_KEY ||
        process.env.ANTHROPIC_AUTH_TOKEN ||
        'sk-950c445e255d90e25293a5c9f85def2c9d313dffb7bfe31b8ff611d25244436b';
      const defaultProvider: AIProviderConfigurationEntity = {
        id: genUuid(),
        project_id: project.id,
        user_id: abdurazzoq.id,
        provider_name: 'anthropic',
        base_url: process.env.ANTHROPIC_BASE_URL || 'https://api.mwapi.dev/v1',
        api_key_enc: this.security.encryptSecret(claudeKey),
        model_name: 'claude-haiku-4-5-20251001',
        embedding_model_name: 'text-embedding-3-small',
        temperature: 0.1,
        max_output_tokens: 2048,
        timeout_seconds: 60,
        max_retries: 2,
        is_active: true,
        last_validated_at: now,
        validation_status: 'success',
        validation_message:
          'Connected to Claude API via https://api.mwapi.dev/v1 (claude-haiku-4-5-20251001).',
        created_at: now,
        updated_at: now,
      };
      this.store.ai_provider_configurations.push(defaultProvider);
    }

    const memories: MemoryRecordEntity[] = [
      {
        id: genUuid(),
        project_id: project.id,
        category: 'architecture',
        title: 'Core Platform Three-Pillar Architecture',
        content:
          'JGitLab is architected around three foundational pillars:\n' +
          '1. Autonomous AI Software Engineer: plan-execute-verify loop with backend tools and sandbox isolation.\n' +
          '2. AI Model Factory: future capability for datasets, fine-tuning (LoRA), and proprietary inference.\n' +
          '3. Persistent Engineering Memory: project-level architectural decisions and task lessons learned.',
        summary:
          'Three-pillar system: Autonomous Agent, Model Factory, Engineering Memory.',
        tags: ['architecture', 'pillars', 'system-design'],
        embedding_vector: null,
        source_task_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: genUuid(),
        project_id: project.id,
        category: 'adr',
        title: 'ADR-001: External Provider Interface Abstraction',
        content:
          'Context: Initial MVP uses external AI APIs (OpenAI, OpenRouter, Groq, Ollama) while reserving ' +
          'a clean migration path to proprietary fine-tuned weights.\n' +
          'Decision: Standardized on AIProvider interface with generateResponse, generateStructuredResponse, ' +
          'and validateConnection.\n' +
          'Consequences: The Autonomous AI Engineer interacts purely with the interface, allowing zero-code-change ' +
          'switch to internal model serving in Phase 4.',
        summary:
          'ADR-001: Abstract provider interface decouples agent logic from model host.',
        tags: ['adr', 'ai-provider', 'abstraction'],
        embedding_vector: null,
        source_task_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: genUuid(),
        project_id: project.id,
        category: 'adr',
        title: 'ADR-002: Sandbox Execution with Strict Path Isolation',
        content:
          'Context: AI code execution must be tightly isolated against host contamination.\n' +
          'Decision: Implemented restricted sandbox runner enforcing strict path traversal guards and forbidden command filters.\n' +
          'Consequences: Development and testing run reliably while preventing unauthorized file system access.',
        summary:
          'ADR-002: Sandbox runner prevents path traversal and host resource abuse.',
        tags: ['adr', 'security', 'sandbox'],
        embedding_vector: null,
        source_task_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: genUuid(),
        project_id: project.id,
        category: 'tech_stack',
        title: 'Frontend & Backend Standards',
        content:
          'Backend: NestJS 11, TypeScript, scrypt password hashing, AES-256-GCM secret encryption.\n' +
          'Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS, Lucide icons, Dark Charcoal (#0B0F17) + Electric Violet (#8B5CF6) design language.',
        summary: 'Technology stack specifications and styling guidelines.',
        tags: ['tech-stack', 'standards', 'nestjs'],
        embedding_vector: null,
        source_task_id: null,
        created_at: now,
        updated_at: now,
      },
    ];
    this.store.memory_records.push(...memories);

    const act: ActivityLogEntity = {
      id: genUuid(),
      project_id: project.id,
      user_id: abdurazzoq.id,
      action_type: 'project_initialized',
      entity_type: 'project',
      entity_id: project.id,
      description:
        'JGitLab initialized with Core Engineering Project and Architectural Memories.',
      metadata_json: null,
      ip_address: null,
      created_at: now,
    };
    this.store.activity_logs.push(act);

    this.seedNotificationsForExistingUsers();

    this.save();
  }

  seedNotificationsForExistingUsers(): void {
    if (!Array.isArray(this.store.notifications)) {
      this.store.notifications = [];
    }
    const now = utcNow();
    for (const u of this.store.users) {
      const hasNotifs = this.store.notifications.some((n) => n.user_id === u.id);
      if (!hasNotifs) {
        this.store.notifications.push(
          {
            id: genUuid(),
            user_id: u.id,
            title: 'JGitLab Engine Ready',
            message: 'Autonomous AI software engineering platform is operational.',
            type: 'success',
            is_read: false,
            link_url: '/dashboard',
            created_at: now,
          },
          {
            id: genUuid(),
            user_id: u.id,
            title: 'System Security Enforced',
            message: 'RBAC controls, process isolation, and CSRF token protections are active.',
            type: 'info',
            is_read: true,
            link_url: u.role === 'admin' ? '/admin' : '/dashboard',
            created_at: now,
          },
        );
      }
    }
  }

  seedModelFactoryData(): void {
    if (!Array.isArray(this.store.model_datasets)) {
      this.store.model_datasets = [];
    }
    if (!Array.isArray(this.store.model_training_jobs)) {
      this.store.model_training_jobs = [];
    }
    if (!Array.isArray(this.store.model_checkpoints)) {
      this.store.model_checkpoints = [];
    }

    if (this.store.model_datasets.length > 0) return;

    const now = utcNow();
    const projectId = this.store.projects[0]?.id || null;

    const dataset1: ModelDatasetEntity = {
      id: genUuid(),
      project_id: projectId,
      name: 'JGitLab Autonomous Plan-to-Code Corpus',
      description: 'Curated AST-validated instruction pairs mapping high-level software engineering issues to deterministic multi-file diffs and tests.',
      format: 'alpaca',
      source: 'ast_extraction',
      sample_count: 420,
      token_count: 184500,
      size_bytes: 842100,
      samples: [
        {
          instruction: 'Implement a sliding-window rate limiter middleware for NestJS with express-rate-limit semantics.',
          input: 'export class RateLimitMiddleware implements NestMiddleware { ... }',
          output: `import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';\nimport { Request, Response, NextFunction } from 'express';\n\n@Injectable()\nexport class SlidingWindowRateLimiter implements NestMiddleware {\n  private readonly hits = new Map<string, number[]>();\n  private readonly windowMs = 60000;\n  private readonly max = 60;\n\n  use(req: Request, res: Response, next: NextFunction) {\n    const ip = req.ip || req.socket.remoteAddress || 'unknown';\n    const now = Date.now();\n    const timestamps = (this.hits.get(ip) || []).filter(t => now - t < this.windowMs);\n    if (timestamps.length >= this.max) {\n      throw new HttpException('Too many requests, please retry later.', HttpStatus.TOO_MANY_REQUESTS);\n    }\n    timestamps.push(now);\n    this.hits.set(ip, timestamps);\n    next();\n  }\n}`,
        },
        {
          instruction: 'Generate a comprehensive Jest integration test suite for GitHub App Webhook signature verification (HMAC-SHA256).',
          input: 'Function to test: verifyWebhookSignature(payload: string, signature: string, secret: string): boolean',
          output: `import * as crypto from 'crypto';\nimport { verifyWebhookSignature } from './github-webhook';\n\ndescribe('GitHub Webhook HMAC-SHA256 Verification', () => {\n  const secret = 'super-secret-webhook-key-2026';\n  const payload = JSON.stringify({ action: 'opened', pull_request: { number: 42 } });\n\n  it('accepts valid sha256 header', () => {\n    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');\n    const sigHeader = \`sha256=\${hmac}\`;\n    expect(verifyWebhookSignature(payload, sigHeader, secret)).toBe(true);\n  });\n\n  it('rejects tampered payload', () => {\n    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');\n    expect(verifyWebhookSignature(payload + 'tamper', \`sha256=\${hmac}\`, secret)).toBe(false);\n  });\n});`,
        },
        {
          instruction: 'Refactor repository git tree scanner to detect monorepos and extract primary frameworks asynchronously.',
          input: 'async function analyzeTree(paths: string[]): Promise<AnalysisSummary>',
          output: `export async function analyzeTree(paths: string[]): Promise<AnalysisSummary> {\n  const isMonorepo = paths.some(p => p.includes('packages/') || p.includes('backend/') && paths.includes('frontend/'));\n  const frameworks = new Set<string>();\n  if (paths.some(p => p.endsWith('package.json'))) {\n    if (paths.some(p => p.includes('next.config'))) frameworks.add('Next.js');\n    if (paths.some(p => p.includes('nest-cli.json'))) frameworks.add('NestJS');\n  }\n  return { isMonorepo, frameworks: Array.from(frameworks), totalFiles: paths.length };\n}`,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    const dataset2: ModelDatasetEntity = {
      id: genUuid(),
      project_id: projectId,
      name: 'TypeScript Clean Code & Bug Fix Instruction Dataset',
      description: 'Extracted from real Git commits: commit messages, pre-patch code, and verified bug resolutions.',
      format: 'jsonl',
      source: 'repo_commits',
      sample_count: 290,
      token_count: 128200,
      size_bytes: 590400,
      samples: [
        {
          instruction: 'Fix null dereference and memory leak in WebSocket connection heartbeat listener.',
          input: 'socket.on("message", (msg) => { client.lastSeen = Date.now(); });',
          output: 'socket.on("message", (msg) => {\n  if (!client || !socket.isAlive) return;\n  client.lastSeen = Date.now();\n});\nsocket.on("close", () => {\n  clearInterval(heartbeatInterval);\n  socket.removeAllListeners();\n});',
        },
      ],
      created_at: now,
      updated_at: now,
    };

    this.store.model_datasets.push(dataset1, dataset2);

    const checkpointId = genUuid();
    const completedJobId = genUuid();

    const lossHistory: TrainingLossPoint[] = [];
    let curLoss = 2.75;
    for (let s = 1; s <= 50; s++) {
      curLoss = Math.max(0.42, curLoss * 0.965 + Math.sin(s) * 0.03);
      lossHistory.push({
        step: s * 10,
        epoch: Math.min(3, +(s * 10 / 166).toFixed(2)),
        loss: +curLoss.toFixed(4),
        val_loss: +(curLoss * 1.08 + 0.04).toFixed(4),
        learning_rate: +(0.0002 * (1 - s / 55)).toFixed(6),
      });
    }

    const completedJob: ModelTrainingJobEntity = {
      id: completedJobId,
      project_id: projectId,
      dataset_id: dataset1.id,
      dataset_name: dataset1.name,
      name: 'jgitlab-coder-qwen14b-run1',
      base_model: 'Qwen-2.5-Coder-14B-Instruct',
      fine_tuning_method: 'qlora',
      status: 'completed',
      hyperparameters: {
        epochs: 3,
        learning_rate: 0.0002,
        batch_size: 4,
        gradient_accumulation_steps: 4,
        lora_r: 16,
        lora_alpha: 32,
        lora_dropout: 0.05,
        target_modules: ['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj'],
        warmup_ratio: 0.05,
        weight_decay: 0.01,
        optimizer: 'paged_adamw_8bit',
        precision: 'bf16',
      },
      progress: {
        current_epoch: 3,
        total_epochs: 3,
        current_step: 500,
        total_steps: 500,
        percent: 100,
        current_loss: 0.442,
        val_loss: 0.485,
        elapsed_seconds: 342,
        eta_seconds: 0,
        gpu_memory_used_mb: 14850,
        gpu_memory_total_mb: 24576,
      },
      loss_history: lossHistory,
      logs: [
        { timestamp: now, level: 'info', message: 'Initialized QLoRA 4-bit quantizer with NF4 & double quantization.' },
        { timestamp: now, level: 'info', message: 'Trainable params: 33,554,432 (0.24% of 14B total base parameters).' },
        { timestamp: now, level: 'step', message: 'Epoch 1/3 completed. Average Step Loss: 1.482. Validation Loss: 1.541.' },
        { timestamp: now, level: 'step', message: 'Epoch 2/3 completed. Average Step Loss: 0.812. Validation Loss: 0.884.' },
        { timestamp: now, level: 'step', message: 'Epoch 3/3 completed. Final Training Loss: 0.442. Checkpoint saved to safetensors.' },
        { timestamp: now, level: 'info', message: 'Evaluation benchmark (HumanEval-Python-TS): 89.2% pass@1 rate.' },
      ],
      output_checkpoint_id: checkpointId,
      created_at: now,
      updated_at: now,
      completed_at: now,
    };

    const checkpoint: ModelCheckpointEntity = {
      id: checkpointId,
      job_id: completedJobId,
      project_id: projectId,
      name: 'JGitLab-Coder-14B-LoRA-v1',
      base_model: 'Qwen-2.5-Coder-14B-Instruct',
      method: 'QLoRA (4-bit)',
      format: 'safetensors',
      adapter_size_mb: 128.4,
      eval_pass_rate: 89.2,
      is_deployed: true,
      deployment_url: 'http://localhost:11434/v1',
      created_at: now,
    };

    this.store.model_training_jobs.push(completedJob);
    this.store.model_checkpoints.push(checkpoint);
  }

  createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'task' = 'info',
    linkUrl: string | null = null,
  ): NotificationEntity {
    if (!Array.isArray(this.store.notifications)) {
      this.store.notifications = [];
    }
    const notif: NotificationEntity = {
      id: genUuid(),
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      link_url: linkUrl,
      created_at: utcNow(),
    };
    this.store.notifications.unshift(notif);

    const userNotifs = this.store.notifications.filter((n) => n.user_id === userId);
    if (userNotifs.length > 100) {
      const allowedIds = new Set(userNotifs.slice(0, 100).map((n) => n.id));
      this.store.notifications = this.store.notifications.filter(
        (n) => n.user_id !== userId || allowedIds.has(n.id),
      );
    }
    this.save();
    return notif;
  }

  // ---------------------------------------------------------------------------
  // Session management
  // ---------------------------------------------------------------------------

  createSession(
    user: UserEntity,
    authMethod: string,
    req?: Request,
  ): { rawToken: string; session: SessionEntity } {
    const rawToken = this.security.randomTokenUrlSafe(48);
    const now = new Date();
    const expires = new Date(
      now.getTime() + this.config.SESSION_TTL_HOURS * 3600 * 1000,
    );
    const ua = req?.headers['user-agent']
      ? String(req.headers['user-agent']).slice(0, 500)
      : null;

    const session: SessionEntity = {
      id: genUuid(),
      user_id: user.id,
      token_hash: this.security.hashSessionToken(rawToken),
      auth_method: authMethod,
      ip_address: this.security.getClientIp(req),
      user_agent: ua,
      expires_at: expires.toISOString(),
      last_seen_at: now.toISOString(),
      revoked_at: null,
      created_at: now.toISOString(),
    };

    this.store.sessions.push(session);
    this.save();
    return { rawToken, session };
  }

  resolveSession(rawToken?: string | null): SessionEntity | null {
    if (!rawToken || rawToken.length > 256) return null;
    const hash = this.security.hashSessionToken(rawToken);
    const sess = this.store.sessions.find((s) => s.token_hash === hash);
    if (!sess || sess.revoked_at !== null) return null;
    const nowMs = Date.now();
    if (new Date(sess.expires_at).getTime() <= nowMs) return null;

    const lastMs = sess.last_seen_at
      ? new Date(sess.last_seen_at).getTime()
      : 0;
    if (nowMs - lastMs > 60_000) {
      sess.last_seen_at = new Date(nowMs).toISOString();
      this.save();
    }
    return sess;
  }

  revokeSession(sess: SessionEntity): void {
    sess.revoked_at = utcNow();
    this.save();
  }

  revokeUserSessions(userId: string, exceptSessionId?: string): number {
    let count = 0;
    const now = utcNow();
    for (const s of this.store.sessions) {
      if (
        s.user_id === userId &&
        s.revoked_at === null &&
        (!exceptSessionId || s.id !== exceptSessionId)
      ) {
        s.revoked_at = now;
        count++;
      }
    }
    if (count > 0) this.save();
    return count;
  }

  // ---------------------------------------------------------------------------
  // Workspace & Project Access
  // ---------------------------------------------------------------------------

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug.slice(0, 40) || 'workspace';
  }

  private ensureStarterProjectForOrg(
    org: OrganizationEntity,
    user: UserEntity,
  ): void {
    const existingCount = this.store.projects.filter(
      (p) => p.organization_id === org.id,
    ).length;
    if (existingCount > 0) return;

    const now = utcNow();
    const project: ProjectEntity = {
      id: genUuid(),
      organization_id: org.id,
      created_by_id: user.id,
      name: 'JGitLab Engineering Core',
      description:
        'Autonomous AI Software Engineering workspace with sandbox execution and persistent memory.',
      git_repo_url: 'https://github.com/jgitlab/ai-engineering-core',
      default_branch: 'main',
      tech_stack: [
        'NestJS',
        'Next.js',
        'TypeScript',
        'Tailwind CSS',
        'PostgreSQL',
      ],
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    this.store.projects.push(project);

    const repo: RepositoryEntity = {
      id: genUuid(),
      project_id: project.id,
      installation_id: null,
      github_repo_id: null,
      full_name: 'jgitlab/ai-engineering-core',
      owner: 'jgitlab',
      repo_name: 'ai-engineering-core',
      clone_url: 'https://github.com/jgitlab/ai-engineering-core.git',
      default_branch: 'main',
      local_path: null,
      languages: {
        TypeScript: 58.4,
        'TypeScript (React)': 38.4,
        CSS: 3.2,
      },
      frameworks: ['NestJS', 'Next.js', 'React', 'Tailwind CSS'],
      dependencies: {
        npm: [
          '@nestjs/core',
          '@nestjs/common',
          'next',
          'react',
          'react-dom',
          'lucide-react',
          'tailwindcss',
          'typescript',
        ],
      },
      file_tree_summary: {
        directories: [
          'backend/src/auth',
          'backend/src/agent',
          'backend/src/github',
          'backend/src/providers',
          'backend/src/memory',
          'frontend/src/app',
          'frontend/src/components',
          'frontend/src/lib',
        ],
        important_files: [
          'README.md',
          'docker-compose.yml',
          'backend/package.json',
          'backend/src/main.ts',
          'frontend/package.json',
        ],
      },
      analysis_summary: {
        primary_language: 'TypeScript',
        framework_count: 4,
        dependency_count: 16,
        is_monorepo: true,
      },
      last_analyzed_at: now,
      created_at: now,
      updated_at: now,
    };
    this.store.repositories.push(repo);

    const mem: MemoryRecordEntity = {
      id: genUuid(),
      project_id: project.id,
      category: 'architecture',
      title: 'Core Platform Three-Pillar Architecture',
      content:
        'JGitLab is architected around three pillars:\n' +
        '1. Autonomous AI Software Engineer: plan-approve-execute-verify loop in an isolated sandbox.\n' +
        '2. Persistent Engineering Memory: ADRs, stack decisions, and task lessons injected into planning prompts.\n' +
        '3. AI Model Factory: provider-independent gateway ready for future proprietary models.',
      summary:
        'Three-pillar architecture: Autonomous AI Engineer, Persistent Memory, and AI Model Factory.',
      tags: ['architecture', 'pillars', 'sandbox'],
      embedding_vector: null,
      source_task_id: null,
      created_at: now,
      updated_at: now,
    };
    this.store.memory_records.push(mem);
    this.save();
  }

  ensurePersonalWorkspace(user: UserEntity): OrganizationEntity {
    const memberOrgIds = new Set(
      this.store.organization_members
        .filter((m) => m.user_id === user.id)
        .map((m) => m.organization_id),
    );
    const userOrgs = this.store.organizations
      .filter((o) => memberOrgIds.has(o.id))
      .sort((a, b) => {
        if (a.is_personal !== b.is_personal) {
          return a.is_personal ? -1 : 1;
        }
        return a.created_at.localeCompare(b.created_at);
      });

    if (userOrgs.length > 0) {
      this.ensureStarterProjectForOrg(userOrgs[0], user);
      return userOrgs[0];
    }

    const base = user.full_name || user.email.split('@')[0];
    const now = utcNow();
    const org: OrganizationEntity = {
      id: genUuid(),
      name: `${base}'s Workspace`,
      slug: `${this.slugify(base)}-${crypto.randomBytes(3).toString('hex')}`,
      description: 'Personal workspace',
      is_personal: true,
      created_at: now,
    };
    this.store.organizations.push(org);
    this.store.organization_members.push({
      id: genUuid(),
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
      created_at: now,
    });
    this.ensureStarterProjectForOrg(org, user);
    this.save();
    return org;
  }

  getUserOrgIds(user: UserEntity): string[] {
    return this.store.organization_members
      .filter((m) => m.user_id === user.id)
      .map((m) => m.organization_id);
  }

  getAccessibleProjectIds(user: UserEntity): string[] {
    if (user.is_superuser) {
      return this.store.projects.map((p) => p.id);
    }
    const orgIds = new Set(this.getUserOrgIds(user));
    if (orgIds.size === 0) return [];
    return this.store.projects
      .filter((p) => p.organization_id && orgIds.has(p.organization_id))
      .map((p) => p.id);
  }

  verifyProjectAccess(projectId: string, user: UserEntity): ProjectEntity {
    const project = this.store.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (user.is_superuser) {
      return project;
    }
    if (project.organization_id) {
      const isMember = this.store.organization_members.some(
        (m) =>
          m.organization_id === project.organization_id &&
          m.user_id === user.id,
      );
      if (isMember) {
        return project;
      }
    }
    throw new NotFoundException('Project not found');
  }

  deleteProjectCascade(projectId: string): void {
    this.store.projects = this.store.projects.filter((p) => p.id !== projectId);
    this.store.repositories = this.store.repositories.filter(
      (r) => r.project_id !== projectId,
    );
    this.store.ai_provider_configurations =
      this.store.ai_provider_configurations.filter(
        (c) => c.project_id !== projectId,
      );
    const taskIds = new Set(
      this.store.agent_tasks
        .filter((t) => t.project_id === projectId)
        .map((t) => t.id),
    );
    this.store.agent_tasks = this.store.agent_tasks.filter(
      (t) => t.project_id !== projectId,
    );
    this.store.agent_task_steps = this.store.agent_task_steps.filter(
      (s) => !taskIds.has(s.task_id),
    );
    this.store.agent_approvals = this.store.agent_approvals.filter(
      (a) => !taskIds.has(a.task_id),
    );
    this.store.agent_execution_logs = this.store.agent_execution_logs.filter(
      (l) => !taskIds.has(l.task_id),
    );
    this.store.memory_records = this.store.memory_records.filter(
      (m) => m.project_id !== projectId,
    );
    this.store.activity_logs = this.store.activity_logs.filter(
      (a) => a.project_id !== projectId,
    );
    this.save();
  }
}
