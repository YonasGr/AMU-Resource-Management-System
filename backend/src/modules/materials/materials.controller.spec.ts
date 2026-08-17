import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('MaterialsController RBAC & Guard Verification (Empirical Challenge M1)', () => {
  let controller: MaterialsController;
  let service: Partial<MaterialsService>;
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    service = {
      findAllCategories: jest.fn().mockResolvedValue([]),
      createCategory: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Stationery' }),
      create: jest.fn().mockResolvedValue({ id: 'mat-1', name: 'A4 Paper' }),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'mat-1', name: 'A4 Paper' }),
      update: jest.fn().mockResolvedValue({ id: 'mat-1', name: 'A4 Paper Updated' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    controller = new MaterialsController(service as MaterialsService);
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    handler: Function,
    user: { id?: string; role?: Role } | null,
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => MaterialsController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Metadata Reflection Verification', () => {
    it('should have @Roles(Role.STORE_MANAGER) on createCategory', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.createCategory);
      expect(roles).toEqual([Role.STORE_MANAGER]);
    });

    it('should have @Roles(Role.STORE_MANAGER) on create (item master)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.create);
      expect(roles).toEqual([Role.STORE_MANAGER]);
    });

    it('should have @Roles(Role.STORE_MANAGER) on update', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.update);
      expect(roles).toEqual([Role.STORE_MANAGER]);
    });

    it('should have @Roles(Role.STORE_MANAGER) on remove', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.remove);
      expect(roles).toEqual([Role.STORE_MANAGER]);
    });

    it('should NOT have @Roles on getCategories (open to all authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getCategories);
      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on findAll (open to all authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.findAll);
      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on findOne (open to all authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.findOne);
      expect(roles).toBeUndefined();
    });
  });

  describe('Guard Execution on Write Operations (STORE_MANAGER ownership)', () => {
    const writeHandlers = [
      'createCategory',
      'create',
      'update',
      'remove',
    ] as const;

    writeHandlers.forEach((name) => {
      describe(`${name}()`, () => {
        it('should ALLOW STORE_MANAGER to access', () => {
          const ctx = createMockContext(controller[name], { id: 'u1', role: Role.STORE_MANAGER });
          expect(guard.canActivate(ctx)).toBe(true);
        });

        it('should REJECT ADMINISTRATOR (HTTP 403 Forbidden)', () => {
          const ctx = createMockContext(controller[name], { id: 'u2', role: Role.ADMINISTRATOR });
          expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
          expect(() => guard.canActivate(ctx)).toThrow(/Access denied.*STORE_MANAGER.*ADMINISTRATOR/);
        });

        it('should REJECT STOREKEEPER (HTTP 403 Forbidden)', () => {
          const ctx = createMockContext(controller[name], { id: 'u3', role: Role.STOREKEEPER });
          expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });

        it('should REJECT AUDITOR (HTTP 403 Forbidden)', () => {
          const ctx = createMockContext(controller[name], { id: 'u4', role: Role.AUDITOR });
          expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });

        it('should REJECT REQUESTER (HTTP 403 Forbidden)', () => {
          const ctx = createMockContext(controller[name], { id: 'u5', role: Role.REQUESTER });
          expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });
      });
    });
  });

  describe('Guard Execution on Read Operations (Open to all authenticated roles)', () => {
    const readHandlers = [
      'getCategories',
      'findAll',
      'findOne',
    ] as const;

    const allRoles = [
      Role.ADMINISTRATOR,
      Role.STORE_MANAGER,
      Role.STOREKEEPER,
      Role.AUDITOR,
      Role.REQUESTER,
    ];

    readHandlers.forEach((name) => {
      describe(`${name}()`, () => {
        allRoles.forEach((role) => {
          it(`should ALLOW role ${role} to access`, () => {
            const ctx = createMockContext(controller[name], { id: 'u1', role });
            expect(guard.canActivate(ctx)).toBe(true);
          });
        });
      });
    });
  });
});
