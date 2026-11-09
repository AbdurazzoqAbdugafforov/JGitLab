import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/core/http-exception.filter';
import { DatabaseService } from '../src/database/database.service';
import { ConfigService } from '../src/core/config.service';

describe('JGitLab NestJS Backend Integration Suite', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let config: ConfigService;

  beforeAll(async () => {
    process.env.ENVIRONMENT = 'test';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    await app.init();

    db = app.get(DatabaseService);
    config = app.get(ConfigService);
  });

  beforeEach(() => {
    db.resetForTesting();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns healthy status', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('JGitLab');
  });

  it('Registers, logs in, manages sessions, and updates profile', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'dev@jgitlab.local',
        password: 'SecurePass123',
        full_name: 'NestJS Developer',
      })
      .expect(200);

    expect(regRes.body.access_token).toBeDefined();
    expect(regRes.body.user.email).toBe('dev@jgitlab.local');
    const token = regRes.body.access_token;

    // Fetch /me
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(meRes.body.full_name).toBe('NestJS Developer');

    // Login with same credentials
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'dev@jgitlab.local',
        password: 'SecurePass123',
      })
      .expect(200);
    expect(loginRes.body.access_token).toBeDefined();

    // List active sessions
    const sessRes = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(sessRes.body.length).toBe(2);

    // Revoke other sessions
    const revRes = await request(app.getHttpServer())
      .post('/api/v1/auth/sessions/revoke-others')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(revRes.body.revoked_count).toBe(1);
  });

  it('Creates projects, configures AI providers, manages memories, and executes autonomous agent task plan & diff', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'architect@jgitlab.local',
        password: 'Architect123!',
        full_name: 'Principal Architect',
      })
      .expect(200);
    const token = regRes.body.access_token;

    // List auto-provisioned starter project
    const projsRes = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(projsRes.body.length).toBeGreaterThanOrEqual(1);
    const projectId = projsRes.body[0].id;

    // Create built-in local AI provider
    const provRes = await request(app.getHttpServer())
      .post('/api/v1/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        provider_name: 'jgitlab-local',
        base_url: 'local://jgitlab-engine',
        api_key: 'local-mvp-key-123456',
        model_name: 'jgitlab-autonomous-v1',
      })
      .expect(201);
    expect(provRes.body.provider_name).toBe('jgitlab-local');

    // Validate provider
    const valRes = await request(app.getHttpServer())
      .post('/api/v1/providers/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ config_id: provRes.body.id })
      .expect(200);
    expect(valRes.body.success).toBe(true);

    // Create & search engineering memory
    const memRes = await request(app.getHttpServer())
      .post('/api/v1/memory')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        category: 'adr',
        title: 'ADR-010: NestJS Backend Migration',
        content: 'Replaced Python FastAPI with modular NestJS 11 TypeScript backend.',
        tags: ['nestjs', 'typescript'],
      })
      .expect(201);
    expect(memRes.body.title).toContain('NestJS');

    const searchRes = await request(app.getHttpServer())
      .post('/api/v1/memory/search')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        query: 'NestJS migration',
      })
      .expect(200);
    expect(searchRes.body.length).toBeGreaterThanOrEqual(1);

    // Create agent task & generate structured plan
    const taskRes = await request(app.getHttpServer())
      .post('/api/v1/agent/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        title: 'Add health telemetry module',
        description: 'Implement a typed health telemetry service with unit verification.',
        priority: 'high',
      })
      .expect(201);
    const taskId = taskRes.body.id;

    const planRes = await request(app.getHttpServer())
      .post(`/api/v1/agent/tasks/${taskId}/plan`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(planRes.body.status).toBe('awaiting_approval');
    expect(planRes.body.plan.proposed_implementation_steps.length).toBeGreaterThan(0);

    // Approve plan & verify diff endpoint
    const appRes = await request(app.getHttpServer())
      .post(`/api/v1/agent/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ decision: 'approved' })
      .expect(200);
    expect(appRes.body.status).toBe('running');

    const diffRes = await request(app.getHttpServer())
      .get(`/api/v1/agent/tasks/${taskId}/diff`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(diffRes.body).toHaveProperty('has_changes');

    // Verify Model Factory & Activity logs
    const mfRes = await request(app.getHttpServer())
      .get('/api/v1/model-factory/status')
      .expect(200);
    expect(mfRes.body.status).toBe('planned');

    const actRes = await request(app.getHttpServer())
      .get(`/api/v1/activity/logs?project_id=${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(actRes.body.length).toBeGreaterThanOrEqual(3);

    // Verify GitHub webhook HMAC-SHA256 & test simulator
    config.GITHUB_APP_WEBHOOK_SECRET = 'test-webhook-secret-2026';
    const testHookRes = await request(app.getHttpServer())
      .post('/api/v1/github/webhook/test')
      .set('Authorization', `Bearer ${token}`)
      .send({ event: 'push' })
      .expect(200);
    expect(testHookRes.body.status).toBe('ok');
    expect(testHookRes.body.event).toBe('push');

    const hookCfgRes = await request(app.getHttpServer())
      .get('/api/v1/github/webhook/config')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(hookCfgRes.body.secret_configured).toBe(true);
    expect(hookCfgRes.body.recent_deliveries.length).toBeGreaterThanOrEqual(1);
  });
});
