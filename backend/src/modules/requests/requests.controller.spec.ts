import { Reflector } from '@nestjs/core';
import { Role, RequestStatus } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('RequestsController RBAC & Approval Verification', () => {
  let controller: RequestsController;
  let service: Partial<RequestsService>;
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'req-1', requestNumber: 'REQ-2026-0001' }),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'req-1', requestNumber: 'REQ-2026-0001' }),
      approveOrReject: jest.fn().mockResolvedValue({ id: 'req-1', status: RequestStatus.APPROVED }),
      issueItems: jest.fn().mockResolvedValue({ id: 'req-1', status: RequestStatus.ISSUED }),
    };
    controller = new RequestsController(service as RequestsService);
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    handler: Function,
    user: { id?: string; role?: Role } | null,
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => RequestsController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Metadata Reflection Verification', () => {
    it('should have @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR) on approveOrReject', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.approveOrReject);
      expect(roles).toEqual([Role.STORE_MANAGER, Role.ADMINISTRATOR]);
    });

    it('should have @Roles(Role.STOREKEEPER) on issueItems', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.issueItems);
      expect(roles).toEqual([Role.STOREKEEPER]);
    });

    it('should NOT have @Roles on create (any authenticated user can submit a request)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.create);
      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on findAll (open to authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.findAll);
      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on findOne (open to authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.findOne);
      expect(roles).toBeUndefined();
    });
  });

  describe('Guard Execution on approveOrReject()', () => {
    it('should ALLOW STORE_MANAGER to access', () => {
      const ctx = createMockContext(controller.approveOrReject, { id: 'u1', role: Role.STORE_MANAGER });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should ALLOW ADMINISTRATOR to access', () => {
      const ctx = createMockContext(controller.approveOrReject, { id: 'u2', role: Role.ADMINISTRATOR });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should REJECT STOREKEEPER (HTTP 403 Forbidden)', () => {
      const ctx = createMockContext(controller.approveOrReject, { id: 'u3', role: Role.STOREKEEPER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT AUDITOR (HTTP 403 Forbidden)', () => {
      const ctx = createMockContext(controller.approveOrReject, { id: 'u4', role: Role.AUDITOR });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT REQUESTER (HTTP 403 Forbidden)', () => {
      const ctx = createMockContext(controller.approveOrReject, { id: 'u5', role: Role.REQUESTER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('Guard Execution on issueItems()', () => {
    it('should ALLOW STOREKEEPER to access', () => {
      const ctx = createMockContext(controller.issueItems, { id: 'u1', role: Role.STOREKEEPER });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should REJECT STORE_MANAGER (HTTP 403 Forbidden)', () => {
      const ctx = createMockContext(controller.issueItems, { id: 'u2', role: Role.STORE_MANAGER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT ADMINISTRATOR (HTTP 403 Forbidden)', () => {
      const ctx = createMockContext(controller.issueItems, { id: 'u3', role: Role.ADMINISTRATOR });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
