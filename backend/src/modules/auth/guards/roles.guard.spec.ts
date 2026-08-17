import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard (Unit & Empirical RBAC Challenge)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    user: { id?: string; role?: Role } | null,
    handler: Function = () => {},
    controllerClass: Function = class TestController {},
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => controllerClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Unprotected routes (no @Roles decorator)', () => {
    it('should allow access if no roles are required on handler or class', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext({ id: '1', role: Role.REQUESTER });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if required roles array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockContext({ id: '1', role: Role.REQUESTER });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('User / Session credential validation', () => {
    it('should throw ForbiddenException if user session is null', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STORE_MANAGER]);
      const context = createMockContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User session missing role credentials');
    });

    it('should throw ForbiddenException if user object has no role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STORE_MANAGER]);
      const context = createMockContext({ id: '1' } as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User session missing role credentials');
    });
  });

  describe('Single-role restrictions', () => {
    const allRoles: Role[] = [
      Role.ADMINISTRATOR,
      Role.STORE_MANAGER,
      Role.STOREKEEPER,
      Role.AUDITOR,
      Role.REQUESTER,
    ];

    it('should only allow STORE_MANAGER when @Roles(Role.STORE_MANAGER) is set', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STORE_MANAGER]);

      allRoles.forEach((role) => {
        const context = createMockContext({ id: '1', role });
        if (role === Role.STORE_MANAGER) {
          expect(guard.canActivate(context)).toBe(true);
        } else {
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        }
      });
    });

    it('should only allow ADMINISTRATOR when @Roles(Role.ADMINISTRATOR) is set', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMINISTRATOR]);

      allRoles.forEach((role) => {
        const context = createMockContext({ id: '1', role });
        if (role === Role.ADMINISTRATOR) {
          expect(guard.canActivate(context)).toBe(true);
        } else {
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        }
      });
    });
  });

  describe('Multi-role restrictions', () => {
    const allRoles: Role[] = [
      Role.ADMINISTRATOR,
      Role.STORE_MANAGER,
      Role.STOREKEEPER,
      Role.AUDITOR,
      Role.REQUESTER,
    ];

    it('should allow ADMINISTRATOR and STORE_MANAGER when @Roles(ADMINISTRATOR, STORE_MANAGER) is set', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Role.ADMINISTRATOR,
        Role.STORE_MANAGER,
      ]);

      allRoles.forEach((role) => {
        const context = createMockContext({ id: '1', role });
        if (role === Role.ADMINISTRATOR || role === Role.STORE_MANAGER) {
          expect(guard.canActivate(context)).toBe(true);
        } else {
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        }
      });
    });

    it('should allow ADMINISTRATOR and AUDITOR when @Roles(ADMINISTRATOR, AUDITOR) is set', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Role.ADMINISTRATOR,
        Role.AUDITOR,
      ]);

      allRoles.forEach((role) => {
        const context = createMockContext({ id: '1', role });
        if (role === Role.ADMINISTRATOR || role === Role.AUDITOR) {
          expect(guard.canActivate(context)).toBe(true);
        } else {
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        }
      });
    });
  });
});
