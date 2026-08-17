import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('AuditController RBAC & Guard Verification (Empirical Challenge M1)', () => {
  let controller: AuditController;
  let service: Partial<AuditService>;
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
    };
    controller = new AuditController(service as AuditService);
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    user: { id?: string; role?: Role } | null,
  ): ExecutionContext => {
    return {
      getHandler: () => controller.findAll,
      getClass: () => AuditController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Metadata Reflection Verification', () => {
    it('should have @Roles(ADMINISTRATOR, AUDITOR) on findAll', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.findAll);
      expect(roles).toEqual([Role.ADMINISTRATOR, Role.AUDITOR]);
    });
  });

  describe('Guard Execution on Audit Log Inspection (Admin & Auditor exclusive)', () => {
    it('should ALLOW ADMINISTRATOR to access audit logs', () => {
      const ctx = createMockContext({ id: 'u1', role: Role.ADMINISTRATOR });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should ALLOW AUDITOR to access audit logs', () => {
      const ctx = createMockContext({ id: 'u2', role: Role.AUDITOR });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should REJECT STORE_MANAGER with ForbiddenException (HTTP 403)', () => {
      const ctx = createMockContext({ id: 'u3', role: Role.STORE_MANAGER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx)).toThrow(/Access denied.*ADMINISTRATOR, AUDITOR.*STORE_MANAGER/);
    });

    it('should REJECT STOREKEEPER with ForbiddenException (HTTP 403)', () => {
      const ctx = createMockContext({ id: 'u4', role: Role.STOREKEEPER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT REQUESTER with ForbiddenException (HTTP 403)', () => {
      const ctx = createMockContext({ id: 'u5', role: Role.REQUESTER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
