import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('AMU Resource Management System (E2E Smoke & Core Endpoints)', () => {
  let app: INestApplication;
  let adminToken: string;
  let managerToken: string;
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
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Public Health Check (GET /health)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.data).toHaveProperty('status', 'ok');
    expect(response.body.data).toHaveProperty('time');
  });

  it('2. Authentication — Admin Login (POST /auth/login)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@store.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.email).toBe('admin@store.com');
    expect(response.body.data.user.role).toBe('ADMINISTRATOR');
    adminToken = response.body.data.accessToken;
  });

  it('3. Authentication — Store Manager Login (POST /auth/login)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'manager@store.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.email).toBe('manager@store.com');
    expect(response.body.data.user.role).toBe('STORE_MANAGER');
    managerToken = response.body.data.accessToken;
  });

  it('4. Authentication — Requester Login (POST /auth/login)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'requester@store.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.email).toBe('requester@store.com');
    expect(response.body.data.user.role).toBe('REQUESTER');
    requesterToken = response.body.data.accessToken;
  });

  it('5. Authenticated Session Profile (GET /auth/me)', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.email).toBe('admin@store.com');
    expect(response.body.data.role).toBe('ADMINISTRATOR');
  });

  it('6. Material Catalog Listing (GET /materials & GET /materials/categories)', async () => {
    const resMaterials = await request(app.getHttpServer())
      .get('/materials')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(Array.isArray(resMaterials.body.data)).toBe(true);

    const resCategories = await request(app.getHttpServer())
      .get('/materials/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(resCategories.body.data)).toBe(true);
  });

  it('7. Employee Registry & Department Directory (GET /employees & GET /employees/departments)', async () => {
    const resEmployees = await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(resEmployees.body.data)).toBe(true);

    const resDepts = await request(app.getHttpServer())
      .get('/employees/departments')
      .set('Authorization', `Bearer ${requesterToken}`)
      .expect(200);

    expect(Array.isArray(resDepts.body.data)).toBe(true);
  });

  it('8. Audit Log Protection (GET /audit)', async () => {
    // Admin access -> 200 OK
    const resAdmin = await request(app.getHttpServer())
      .get('/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(resAdmin.body.data)).toBe(true);

    // Requester access -> 403 Forbidden
    await request(app.getHttpServer())
      .get('/audit')
      .set('Authorization', `Bearer ${requesterToken}`)
      .expect(403);
  });

  it('9. Material Requests Listing (GET /requests)', async () => {
    const response = await request(app.getHttpServer())
      .get('/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('10. User Inbox Notifications (GET /notifications)', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('11. Inventory Current Stock Report (GET /reports/current-stock)', async () => {
    const response = await request(app.getHttpServer())
      .get('/reports/current-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
