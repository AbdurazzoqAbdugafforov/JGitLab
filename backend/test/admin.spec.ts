import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/core/http-exception.filter';
import { DatabaseService } from '../src/database/database.service';

describe('Admin Module & RBAC Security Suite', () => {
  let app: INestApplication;
  let db: DatabaseService;

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
  });

  beforeEach(() => {
    db.resetForTesting();
    db.seedInitialData();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Enforces RBAC: Admin succeeds, Engineer gets 403 Forbidden', async () => {
    // 1. Login as seeded engineer
    const engLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'engineer@jgitlab.local', password: 'JGitLab2026!Dev' })
      .expect(200);

    const engToken = engLogin.body.access_token;
    expect(engLogin.body.user.role).toBe('engineer');

    // 2. Engineer attempts to access Admin Overview -> Must return 403 Forbidden
    await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${engToken}`)
      .expect(403);

    // 3. Engineer attempts to modify OAuth config -> Must return 403 Forbidden
    await request(app.getHttpServer())
      .post('/api/v1/auth/oauth-config')
      .set('Authorization', `Bearer ${engToken}`)
      .send({ google_client_id: 'malicious-id' })
      .expect(403);

    // 4. Login as seeded Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@jgitlab.local', password: 'JGitLab2026!Admin' })
      .expect(200);

    const adminToken = adminLogin.body.access_token;
    expect(adminLogin.body.user.role).toBe('admin');
    expect(adminLogin.body.user.is_superuser).toBe(true);

    // 5. Admin accesses Admin Overview -> Must return 200 with stats
    const overviewRes = await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(overviewRes.body.status).toBe('operational');
    expect(overviewRes.body.stats.total_users).toBeGreaterThanOrEqual(2);
    expect(overviewRes.body.stats.admin_users).toBeGreaterThanOrEqual(1);

    // 6. Admin lists all users
    const usersRes = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(usersRes.body)).toBe(true);
    expect(usersRes.body.length).toBeGreaterThanOrEqual(2);

    // 7. Admin creates a new user
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'analyst@jgitlab.local',
        password: 'AnalystPass2026!',
        full_name: 'Security Analyst',
        role: 'engineer',
      })
      .expect(201);

    expect(createRes.body.email).toBe('analyst@jgitlab.local');
    expect(createRes.body.role).toBe('engineer');
    const newUserId = createRes.body.id;

    // 8. Admin promotes user to admin
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);

    expect(patchRes.body.role).toBe('admin');
    expect(patchRes.body.is_superuser).toBe(true);

    // 9. Admin suspends user
    const suspendRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false })
      .expect(200);

    expect(suspendRes.body.is_active).toBe(false);

    // 10. Admin checks sessions and audit logs
    const sessionsRes = await request(app.getHttpServer())
      .get('/api/v1/admin/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(sessionsRes.body)).toBe(true);

    const auditRes = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(auditRes.body)).toBe(true);
    expect(auditRes.body.length).toBeGreaterThan(0);
  });
});
