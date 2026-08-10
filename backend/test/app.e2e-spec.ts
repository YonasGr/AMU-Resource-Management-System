import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('AMU Resource Management System (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Authentication — Admin Login (POST /auth/login)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@amu.edu.et',
        password: 'ChangeMe123!',
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
    adminToken = response.body.data.accessToken;
  });

  it('2. Authentication — Requester Login (POST /auth/login)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'wftest.requester@amu.edu.et',
        password: 'ChangeMe123!',
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('accessToken');
    requesterToken = response.body.data.accessToken;
  });

  it('3. Organization Tree (GET /organization-units/tree)', async () => {
    const response = await request(app.getHttpServer())
      .get('/organization-units/tree')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('name');
  });

  it('4. Store Directory Unscoped Lookup (GET /stores/directory)', async () => {
    const response = await request(app.getHttpServer())
      .get('/stores/directory')
      .set('Authorization', `Bearer ${requesterToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('5. User Inbox Notifications (GET /notifications)', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('6. Inventory Report Export (GET /reports/inventory)', async () => {
    const response = await request(app.getHttpServer())
      .get('/reports/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
