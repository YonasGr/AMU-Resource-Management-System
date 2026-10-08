import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as argon2 from 'argon2';
import { Role, ScopeType } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('RBAC Redesign & Store Scope Enforcement E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tokens for 7 system accounts
  let adminToken: string;
  let managerAToken: string;
  let managerBToken: string;
  let globalManagerToken: string;
  let keeperToken: string;
  let auditorToken: string;
  let requesterToken: string;

  // Common entity IDs for testing
  let categoryId: string;
  let departmentId: string;
  let storeAId: string;
  let storeBId: string;
  let materialId: string;

  // Request IDs
  let storeARequestId: string;
  let storeBRequestId: string;

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

    prisma = app.get(PrismaService);

    // 1. Ensure test stores exist
    const storeDept = await prisma.department.findFirst();
    departmentId = storeDept!.id;

    const storeA = await prisma.store.upsert({
      where: { code: 'STORE-MAIN' },
      update: {},
      create: {
        code: 'STORE-MAIN',
        name: 'Main Central Store',
        departmentId: storeDept!.id,
      },
    });
    storeAId = storeA.id;

    const storeB = await prisma.store.upsert({
      where: { code: 'STORE-ENG' },
      update: {},
      create: {
        code: 'STORE-ENG',
        name: 'Engineering Store',
        departmentId: storeDept!.id,
      },
    });
    storeBId = storeB.id;

    // Ensure secondary test users exist
    const hash = await argon2.hash('password123');
    await prisma.user.upsert({
      where: { email: 'engmanager@store.com' },
      update: { role: Role.STORE_MANAGER, scopeType: ScopeType.STORE, storeId: storeBId },
      create: {
        email: 'engmanager@store.com',
        fullName: 'Engineering Store Manager',
        passwordHash: hash,
        role: Role.STORE_MANAGER,
        scopeType: ScopeType.STORE,
        storeId: storeBId,
        departmentId: storeDept!.id,
      },
    });

    await prisma.user.upsert({
      where: { email: 'globalmanager@store.com' },
      update: { role: Role.STORE_MANAGER, scopeType: ScopeType.GLOBAL },
      create: {
        email: 'globalmanager@store.com',
        fullName: 'Global Store Manager',
        passwordHash: hash,
        role: Role.STORE_MANAGER,
        scopeType: ScopeType.GLOBAL,
        departmentId: storeDept!.id,
      },
    });

    // 2. Authenticate all 7 test users and retrieve JWT tokens
    const rolePasswords: Record<string, string> = {
      'admin@store.com': process.env.SEED_ADMIN_PASSWORD || 'Admin#AMU2026!SecureKey',
      'manager@store.com': process.env.SEED_MANAGER_PASSWORD || 'Manager#AMU2026!StoreKey',
      'keeper@store.com': process.env.SEED_KEEPER_PASSWORD || 'Keeper#AMU2026!InventoryKey',
      'auditor@store.com': process.env.SEED_AUDITOR_PASSWORD || 'Auditor#AMU2026!AuditKey',
      'requester@store.com': process.env.SEED_REQUESTER_PASSWORD || 'Requester#AMU2026!StaffKey',
      'engmanager@store.com': 'password123',
      'globalmanager@store.com': 'password123',
    };

    const loginUser = async (email: string) => {
      const password = rolePasswords[email] || 'password123';
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      return res.body.data.accessToken;
    };

    adminToken = await loginUser('admin@store.com');
    managerAToken = await loginUser('manager@store.com');
    managerBToken = await loginUser('engmanager@store.com');
    globalManagerToken = await loginUser('globalmanager@store.com');
    keeperToken = await loginUser('keeper@store.com');
    auditorToken = await loginUser('auditor@store.com');
    requesterToken = await loginUser('requester@store.com');

    const cat = await prisma.materialCategory.findFirst();
    if (!cat) {
      throw new Error('At least one material category must exist (run prisma:seed)');
    }
    categoryId = cat.id;

    const mat = await prisma.material.findFirst();
    if (!mat) {
      throw new Error('At least one material must exist (run prisma:seed)');
    }
    materialId = mat.id;

    // 3. Create fresh PENDING test requests for Store A and Store B
    const requester = await prisma.user.findUnique({ where: { email: 'requester@store.com' } });
    const createdA = await prisma.materialRequest.create({
      data: {
        requestNumber: `REQ-E2E-${Date.now()}-A`,
        purpose: 'Test Request Store A',
        storeId: storeAId,
        departmentId,
        status: 'PENDING',
        requesterId: requester!.id,
        items: { create: [{ materialId, quantityRequested: 1 }] },
      },
    });
    storeARequestId = createdA.id;

    const createdB = await prisma.materialRequest.create({
      data: {
        requestNumber: `REQ-E2E-${Date.now()}-B`,
        purpose: 'Test Request Store B',
        storeId: storeBId,
        departmentId,
        status: 'PENDING',
        requesterId: requester!.id,
        items: { create: [{ materialId, quantityRequested: 1 }] },
      },
    });
    storeBRequestId = createdB.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Token Verification', () => {
    it('should successfully obtain valid tokens for all 7 roles', () => {
      expect(adminToken).toBeDefined();
      expect(managerAToken).toBeDefined();
      expect(managerBToken).toBeDefined();
      expect(globalManagerToken).toBeDefined();
      expect(keeperToken).toBeDefined();
      expect(auditorToken).toBeDefined();
      expect(requesterToken).toBeDefined();
    });
  });

  describe('R1: Role Guard Correctness', () => {
    describe('Material Catalog Write Operations (POST /materials & POST /materials/categories)', () => {
      it('POST /materials/categories -> 403 Forbidden for ADMINISTRATOR', async () => {
        await request(app.getHttpServer())
          .post('/materials/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: `Admin Cat ${Date.now()}`, description: 'Admin attempt' })
          .expect(403);
      });

      it('POST /materials/categories -> 403 Forbidden for REQUESTER and STOREKEEPER', async () => {
        await request(app.getHttpServer())
          .post('/materials/categories')
          .set('Authorization', `Bearer ${requesterToken}`)
          .send({ name: `Requester Cat ${Date.now()}` })
          .expect(403);

        await request(app.getHttpServer())
          .post('/materials/categories')
          .set('Authorization', `Bearer ${keeperToken}`)
          .send({ name: `Keeper Cat ${Date.now()}` })
          .expect(403);
      });

      it('POST /materials/categories -> 201 Created for STORE_MANAGER', async () => {
        const res = await request(app.getHttpServer())
          .post('/materials/categories')
          .set('Authorization', `Bearer ${managerAToken}`)
          .send({ name: `Manager Cat ${Date.now()}`, description: 'Created by Store Manager' })
          .expect(201);

        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('name');
      });

      it('POST /materials -> 403 Forbidden for ADMINISTRATOR', async () => {
        await request(app.getHttpServer())
          .post('/materials')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            materialCode: `MAT-ADM-${Date.now()}`,
            name: 'Admin Material Attempt',
            unit: 'Pcs',
            categoryId,
          })
          .expect(403);
      });

      it('POST /materials -> 403 Forbidden for REQUESTER, STOREKEEPER, and AUDITOR', async () => {
        await request(app.getHttpServer())
          .post('/materials')
          .set('Authorization', `Bearer ${requesterToken}`)
          .send({
            materialCode: `MAT-REQ-${Date.now()}`,
            name: 'Requester Material Attempt',
            unit: 'Pcs',
            categoryId,
          })
          .expect(403);

        await request(app.getHttpServer())
          .post('/materials')
          .set('Authorization', `Bearer ${keeperToken}`)
          .send({
            materialCode: `MAT-KPR-${Date.now()}`,
            name: 'Keeper Material Attempt',
            unit: 'Pcs',
            categoryId,
          })
          .expect(403);

        await request(app.getHttpServer())
          .post('/materials')
          .set('Authorization', `Bearer ${auditorToken}`)
          .send({
            materialCode: `MAT-AUD-${Date.now()}`,
            name: 'Auditor Material Attempt',
            unit: 'Pcs',
            categoryId,
          })
          .expect(403);
      });

      it('POST /materials -> 201 Created for STORE_MANAGER', async () => {
        const res = await request(app.getHttpServer())
          .post('/materials')
          .set('Authorization', `Bearer ${managerAToken}`)
          .send({
            materialCode: `MAT-MGR-${Date.now()}`,
            name: 'Manager Created Material',
            unit: 'Pcs',
            categoryId,
          })
          .expect(201);

        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('materialCode');
      });
    });

    describe('Audit Log Read Operations (GET /audit)', () => {
      it('GET /audit -> 403 Forbidden for STORE_MANAGER', async () => {
        await request(app.getHttpServer())
          .get('/audit')
          .set('Authorization', `Bearer ${managerAToken}`)
          .expect(403);
      });

      it('GET /audit -> 403 Forbidden for REQUESTER and STOREKEEPER', async () => {
        await request(app.getHttpServer())
          .get('/audit')
          .set('Authorization', `Bearer ${requesterToken}`)
          .expect(403);

        await request(app.getHttpServer())
          .get('/audit')
          .set('Authorization', `Bearer ${keeperToken}`)
          .expect(403);
      });

      it('GET /audit -> 200 OK for ADMINISTRATOR', async () => {
        const res = await request(app.getHttpServer())
          .get('/audit')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('GET /audit -> 200 OK for AUDITOR', async () => {
        const res = await request(app.getHttpServer())
          .get('/audit')
          .set('Authorization', `Bearer ${auditorToken}`)
          .expect(200);

        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('Employee Registry Write Operations (POST /employees & POST /employees/departments)', () => {
      it('POST /employees -> 403 Forbidden for REQUESTER', async () => {
        await request(app.getHttpServer())
          .post('/employees')
          .set('Authorization', `Bearer ${requesterToken}`)
          .send({
            employeeCode: `EMP-REQ-${Date.now()}`,
            fullName: 'Unauthorized Requester Staff',
            departmentId,
          })
          .expect(403);
      });

      it('POST /employees -> 201 Created for ADMINISTRATOR', async () => {
        const res = await request(app.getHttpServer())
          .post('/employees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            employeeCode: `EMP-ADM-${Date.now()}`,
            fullName: 'Admin Registered Employee',
            departmentId,
          })
          .expect(201);

        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('employeeCode');
      });

      it('POST /employees -> 201 Created for STORE_MANAGER', async () => {
        const res = await request(app.getHttpServer())
          .post('/employees')
          .set('Authorization', `Bearer ${managerAToken}`)
          .send({
            employeeCode: `EMP-MGR-${Date.now()}`,
            fullName: 'Store Manager Registered Employee',
            departmentId,
          })
          .expect(201);

        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('employeeCode');
      });

      it('POST /employees/departments -> 403 Forbidden for STORE_MANAGER', async () => {
        await request(app.getHttpServer())
          .post('/employees/departments')
          .set('Authorization', `Bearer ${managerAToken}`)
          .send({
            code: `DEP-MGR-${Date.now().toString().slice(-4)}`,
            name: 'Unauthorized Dept by Manager',
          })
          .expect(403);
      });

      it('POST /employees/departments -> 201 Created for ADMINISTRATOR', async () => {
        const res = await request(app.getHttpServer())
          .post('/employees/departments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            code: `DEP-ADM-${Date.now().toString().slice(-4)}`,
            name: 'Authorized Admin Department',
            description: 'Department created exclusively by Admin',
          })
          .expect(201);

        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('code');
      });
    });

    describe('Supplier Management (POST /suppliers & PATCH /suppliers/:id)', () => {
      let createdSupplierId: string;

      it('POST /suppliers -> 403 Forbidden for REQUESTER', async () => {
        await request(app.getHttpServer())
          .post('/suppliers')
          .set('Authorization', `Bearer ${requesterToken}`)
          .send({
            supplierCode: `SUP-REQ-${Date.now()}`,
            name: 'Unauthorized Supplier',
          })
          .expect(403);
      });

      it('POST /suppliers -> 201 Created for ADMINISTRATOR', async () => {
        const res = await request(app.getHttpServer())
          .post('/suppliers')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            supplierCode: `SUP-ADM-${Date.now()}`,
            name: 'Admin Created Supplier',
          })
          .expect(201);

        expect(res.body.data).toHaveProperty('id');
        createdSupplierId = res.body.data.id;
      });

      it('POST /suppliers -> 201 Created for STORE_MANAGER', async () => {
        const res = await request(app.getHttpServer())
          .post('/suppliers')
          .set('Authorization', `Bearer ${managerAToken}`)
          .send({
            supplierCode: `SUP-MGR-${Date.now()}`,
            name: 'Manager Created Supplier',
          })
          .expect(201);

        expect(res.body.data).toHaveProperty('id');
      });

      it('PATCH /suppliers/:id -> 200 OK for STORE_MANAGER', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/suppliers/${createdSupplierId}`)
          .set('Authorization', `Bearer ${managerAToken}`)
          .send({
            contactPerson: 'Updated by Manager',
          })
          .expect(200);

        expect(res.body.data.contactPerson).toBe('Updated by Manager');
      });
    });
  });

  describe('R2: Store-Scope Enforcement on Request Approvals', () => {
    it('Store Manager A cannot approve request targeting Store B (HTTP 403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/requests/${storeBRequestId}/approve-reject`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ action: 'APPROVE', remarks: 'Store A Manager cross-store approval attempt' })
        .expect(403);

      expect(res.body.message).toContain('Access denied');
      expect(res.body.message).toContain(storeBId);
    });

    it('Store Manager B cannot approve request targeting Store A (HTTP 403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/requests/${storeARequestId}/approve-reject`)
        .set('Authorization', `Bearer ${managerBToken}`)
        .send({ action: 'APPROVE', remarks: 'Store B Manager cross-store approval attempt' })
        .expect(403);

      expect(res.body.message).toContain('Access denied');
      expect(res.body.message).toContain(storeAId);
    });

    it('Non-managers (REQUESTER, STOREKEEPER, AUDITOR) cannot approve requests (HTTP 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/requests/${storeARequestId}/approve-reject`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ action: 'APPROVE' })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/requests/${storeARequestId}/approve-reject`)
        .set('Authorization', `Bearer ${keeperToken}`)
        .send({ action: 'APPROVE' })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/requests/${storeARequestId}/approve-reject`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({ action: 'APPROVE' })
        .expect(403);
    });

    it('Store Manager A can approve request targeting Store A (HTTP 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/requests/${storeARequestId}/approve-reject`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ action: 'APPROVE', remarks: 'Store A Manager approved' })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.storeId).toBe(storeAId);
    });

    it('Store Manager B can approve request targeting Store B (HTTP 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/requests/${storeBRequestId}/approve-reject`)
        .set('Authorization', `Bearer ${managerBToken}`)
        .send({ action: 'APPROVE', remarks: 'Store B Manager approved' })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.storeId).toBe(storeBId);
    });

    it('Global Store Manager can approve requests targeting any store (Store A or Store B) (HTTP 200 OK)', async () => {
      // Create fresh pending requests for Store A and Store B
      const reqForStoreA = await prisma.materialRequest.create({
        data: {
          requestNumber: `REQ-GLOBAL-A-${Date.now()}`,
          purpose: 'Global Manager Approval Test for Store A',
          storeId: storeAId,
          departmentId,
          requesterId: (await prisma.user.findUnique({ where: { email: 'requester@store.com' } }))!.id,
          items: { create: [{ materialId, quantityRequested: 1 }] },
        },
      });

      const reqForStoreB = await prisma.materialRequest.create({
        data: {
          requestNumber: `REQ-GLOBAL-B-${Date.now()}`,
          purpose: 'Global Manager Approval Test for Store B',
          storeId: storeBId,
          departmentId,
          requesterId: (await prisma.user.findUnique({ where: { email: 'requester@store.com' } }))!.id,
          items: { create: [{ materialId, quantityRequested: 1 }] },
        },
      });

      // Global Manager approves Store A request
      const resA = await request(app.getHttpServer())
        .post(`/requests/${reqForStoreA.id}/approve-reject`)
        .set('Authorization', `Bearer ${globalManagerToken}`)
        .send({ action: 'APPROVE', remarks: 'Global Manager approved Store A request' })
        .expect(200);

      expect(resA.body.data.status).toBe('APPROVED');

      // Global Manager approves Store B request
      const resB = await request(app.getHttpServer())
        .post(`/requests/${reqForStoreB.id}/approve-reject`)
        .set('Authorization', `Bearer ${globalManagerToken}`)
        .send({ action: 'APPROVE', remarks: 'Global Manager approved Store B request' })
        .expect(200);

      expect(resB.body.data.status).toBe('APPROVED');
    });
  });
});
