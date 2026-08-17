import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('ReportsController RBAC & Guard Verification', () => {
  let controller: ReportsController;
  let service: Partial<ReportsService>;
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    service = {
      getCurrentStockReport: jest.fn().mockResolvedValue([]),
      getStockInReport: jest.fn().mockResolvedValue([]),
      getStockOutReport: jest.fn().mockResolvedValue([]),
      getMaterialBalanceReport: jest.fn().mockResolvedValue([]),
      getLowStockReport: jest.fn().mockResolvedValue([]),
      getEmployeeIssueReport: jest.fn().mockResolvedValue([]),
      getSupplierReport: jest.fn().mockResolvedValue([]),
      getTransactionHistoryReport: jest.fn().mockResolvedValue([]),
    };
    controller = new ReportsController(service as ReportsService);
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    handler: Function,
    user: { id?: string; role?: Role } | null,
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => ReportsController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Metadata Reflection Verification', () => {
    it('should have @Roles on class level allowing Admin, Store Manager, Storekeeper, and Auditor', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, ReportsController);
      expect(roles).toEqual([
        Role.ADMINISTRATOR,
        Role.STORE_MANAGER,
        Role.STOREKEEPER,
        Role.AUDITOR,
      ]);
    });
  });

  describe('Guard Execution on Reports Generation', () => {
    const reportHandlers = [
      'getCurrentStock',
      'getStockIn',
      'getStockOut',
      'getMaterialBalance',
      'getLowStock',
      'getEmployeeIssue',
      'getSupplier',
      'getTransactionHistory',
    ] as const;

    const allowedRoles = [
      Role.ADMINISTRATOR,
      Role.STORE_MANAGER,
      Role.STOREKEEPER,
      Role.AUDITOR,
    ];

    reportHandlers.forEach((name) => {
      describe(`${name}()`, () => {
        allowedRoles.forEach((role) => {
          it(`should ALLOW ${role} to generate report`, () => {
            const ctx = createMockContext(controller[name], { id: 'u1', role });
            expect(guard.canActivate(ctx)).toBe(true);
          });
        });

        it('should REJECT REQUESTER with ForbiddenException (HTTP 403)', () => {
          const ctx = createMockContext(controller[name], { id: 'u-req', role: Role.REQUESTER });
          expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });
      });
    });
  });
});
