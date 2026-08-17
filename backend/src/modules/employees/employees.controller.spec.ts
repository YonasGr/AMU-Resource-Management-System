import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('EmployeesController RBAC & Guard Verification (Empirical Challenge M1)', () => {
  let controller: EmployeesController;
  let service: Partial<EmployeesService>;
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    service = {
      findAllDepartments: jest.fn().mockResolvedValue([]),
      createDepartment: jest.fn().mockResolvedValue({ id: 'dept-1', name: 'IT' }),
      getDepartmentIssueHistory: jest.fn().mockResolvedValue([]),
      createEmployee: jest.fn().mockResolvedValue({ id: 'emp-1', fullName: 'Abebe Kebede' }),
      findAllEmployees: jest.fn().mockResolvedValue([]),
      findOneEmployee: jest.fn().mockResolvedValue({ id: 'emp-1', fullName: 'Abebe Kebede' }),
    };
    controller = new EmployeesController(service as EmployeesService);
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    handler: Function,
    user: { id?: string; role?: Role } | null,
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => EmployeesController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Metadata Reflection Verification', () => {
    it('should have @Roles(ADMINISTRATOR, STORE_MANAGER) on createEmployee', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.createEmployee);
      expect(roles).toEqual([Role.ADMINISTRATOR, Role.STORE_MANAGER]);
    });

    it('should have @Roles(ADMINISTRATOR) on createDepartment', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.createDepartment);
      expect(roles).toEqual([Role.ADMINISTRATOR]);
    });

    it('should NOT have @Roles on getDepartments (open to all authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getDepartments);
      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on getDepartmentHistory (open to all authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getDepartmentHistory);
      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on findAllEmployees (open to all authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.findAllEmployees);
      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on findOneEmployee (open to all authenticated users)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.findOneEmployee);
      expect(roles).toBeUndefined();
    });
  });

  describe('Guard Execution on Employee Registration (Shared Admin & Store Manager)', () => {
    it('should ALLOW ADMINISTRATOR to create employee', () => {
      const ctx = createMockContext(controller.createEmployee, { id: 'u1', role: Role.ADMINISTRATOR });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should ALLOW STORE_MANAGER to create employee', () => {
      const ctx = createMockContext(controller.createEmployee, { id: 'u2', role: Role.STORE_MANAGER });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should REJECT STOREKEEPER with ForbiddenException', () => {
      const ctx = createMockContext(controller.createEmployee, { id: 'u3', role: Role.STOREKEEPER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT AUDITOR with ForbiddenException', () => {
      const ctx = createMockContext(controller.createEmployee, { id: 'u4', role: Role.AUDITOR });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT REQUESTER with ForbiddenException', () => {
      const ctx = createMockContext(controller.createEmployee, { id: 'u5', role: Role.REQUESTER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('Guard Execution on Department Creation (ADMINISTRATOR exclusive)', () => {
    it('should ALLOW ADMINISTRATOR to create department', () => {
      const ctx = createMockContext(controller.createDepartment, { id: 'u1', role: Role.ADMINISTRATOR });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should REJECT STORE_MANAGER with ForbiddenException', () => {
      const ctx = createMockContext(controller.createDepartment, { id: 'u2', role: Role.STORE_MANAGER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT STOREKEEPER with ForbiddenException', () => {
      const ctx = createMockContext(controller.createDepartment, { id: 'u3', role: Role.STOREKEEPER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT AUDITOR with ForbiddenException', () => {
      const ctx = createMockContext(controller.createDepartment, { id: 'u4', role: Role.AUDITOR });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should REJECT REQUESTER with ForbiddenException', () => {
      const ctx = createMockContext(controller.createDepartment, { id: 'u5', role: Role.REQUESTER });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('Guard Execution on Read Operations (Open to all authenticated roles)', () => {
    const readHandlers = [
      'getDepartments',
      'getDepartmentHistory',
      'findAllEmployees',
      'findOneEmployee',
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
