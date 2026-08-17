import { ForbiddenException } from '@nestjs/common';
import { Role, ScopeType, UserStatus } from '@prisma/client';
import { AccessControlService } from './access-control.service';
import { SafeUser } from './decorators/current-user.decorator';

describe('AccessControlService (Unit & Store Scope Verification)', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService();
  });

  const createMockUser = (overrides: Partial<SafeUser> = {}): SafeUser => ({
    id: 'user-uuid-1',
    fullName: 'Test User',
    email: 'test@amu.edu.et',
    phone: '+251911000000',
    role: Role.STORE_MANAGER,
    status: UserStatus.ACTIVE,
    scopeType: ScopeType.STORE,
    departmentId: 'dept-uuid-1',
    storeId: 'store-a',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('canManageStore(user, targetStoreId)', () => {
    describe('ADMINISTRATOR Role (Global System Authority)', () => {
      it('should return true for targetStoreId "store-a"', () => {
        const user = createMockUser({ role: Role.ADMINISTRATOR, scopeType: ScopeType.GLOBAL, storeId: null });
        expect(service.canManageStore(user, 'store-a')).toBe(true);
      });

      it('should return true for targetStoreId "store-b"', () => {
        const user = createMockUser({ role: Role.ADMINISTRATOR, scopeType: ScopeType.STORE, storeId: 'store-a' });
        expect(service.canManageStore(user, 'store-b')).toBe(true);
      });

      it('should return true when targetStoreId is null', () => {
        const user = createMockUser({ role: Role.ADMINISTRATOR, scopeType: ScopeType.GLOBAL, storeId: null });
        expect(service.canManageStore(user, null)).toBe(true);
      });

      it('should return true when targetStoreId is undefined', () => {
        const user = createMockUser({ role: Role.ADMINISTRATOR, scopeType: ScopeType.GLOBAL, storeId: null });
        expect(service.canManageStore(user, undefined)).toBe(true);
      });
    });

    describe('STORE_MANAGER with ScopeType.GLOBAL', () => {
      it('should return true for any targetStoreId ("store-a")', () => {
        const user = createMockUser({ role: Role.STORE_MANAGER, scopeType: ScopeType.GLOBAL, storeId: null });
        expect(service.canManageStore(user, 'store-a')).toBe(true);
      });

      it('should return true for any targetStoreId ("store-b")', () => {
        const user = createMockUser({ role: Role.STORE_MANAGER, scopeType: ScopeType.GLOBAL, storeId: null });
        expect(service.canManageStore(user, 'store-b')).toBe(true);
      });

      it('should return true when targetStoreId is null', () => {
        const user = createMockUser({ role: Role.STORE_MANAGER, scopeType: ScopeType.GLOBAL, storeId: null });
        expect(service.canManageStore(user, null)).toBe(true);
      });

      it('should return true when targetStoreId is undefined', () => {
        const user = createMockUser({ role: Role.STORE_MANAGER, scopeType: ScopeType.GLOBAL, storeId: null });
        expect(service.canManageStore(user, undefined)).toBe(true);
      });
    });

    describe('STORE_MANAGER with ScopeType.STORE', () => {
      const user = createMockUser({
        role: Role.STORE_MANAGER,
        scopeType: ScopeType.STORE,
        storeId: 'store-a',
      });

      it('should return true when targetStoreId exactly matches user.storeId ("store-a")', () => {
        expect(service.canManageStore(user, 'store-a')).toBe(true);
      });

      it('should return false when targetStoreId does not match user.storeId ("store-b")', () => {
        expect(service.canManageStore(user, 'store-b')).toBe(false);
      });

      it('should return false when targetStoreId is null', () => {
        expect(service.canManageStore(user, null)).toBe(false);
      });

      it('should return false when targetStoreId is undefined', () => {
        expect(service.canManageStore(user, undefined)).toBe(false);
      });

      it('should return false when user has ScopeType.STORE but user.storeId is null', () => {
        const userNoStore = createMockUser({
          role: Role.STORE_MANAGER,
          scopeType: ScopeType.STORE,
          storeId: null,
        });
        expect(service.canManageStore(userNoStore, 'store-a')).toBe(false);
      });
    });

    describe('STORE_MANAGER with other scopes (ScopeType.ORGANIZATION)', () => {
      it('should return false for ScopeType.ORGANIZATION', () => {
        const user = createMockUser({
          role: Role.STORE_MANAGER,
          scopeType: ScopeType.ORGANIZATION,
          storeId: 'store-a',
        });
        expect(service.canManageStore(user, 'store-a')).toBe(false);
      });
    });

    describe('Non-STORE_MANAGER and Non-ADMINISTRATOR Roles', () => {
      const nonManagerRoles = [
        Role.STOREKEEPER,
        Role.AUDITOR,
        Role.REQUESTER,
      ];

      nonManagerRoles.forEach((role) => {
        describe(`Role.${role}`, () => {
          it('should return false for matching storeId', () => {
            const user = createMockUser({ role, scopeType: ScopeType.STORE, storeId: 'store-a' });
            expect(service.canManageStore(user, 'store-a')).toBe(false);
          });

          it('should return false for different storeId', () => {
            const user = createMockUser({ role, scopeType: ScopeType.STORE, storeId: 'store-a' });
            expect(service.canManageStore(user, 'store-b')).toBe(false);
          });

          it('should return false even with ScopeType.GLOBAL', () => {
            const user = createMockUser({ role, scopeType: ScopeType.GLOBAL, storeId: null });
            expect(service.canManageStore(user, 'store-a')).toBe(false);
          });
        });
      });
    });
  });

  describe('enforceStoreScope(user, targetStoreId)', () => {
    it('should NOT throw when user is ADMINISTRATOR', () => {
      const user = createMockUser({ role: Role.ADMINISTRATOR, scopeType: ScopeType.GLOBAL });
      expect(() => service.enforceStoreScope(user, 'store-a')).not.toThrow();
    });

    it('should NOT throw when STORE_MANAGER has ScopeType.GLOBAL', () => {
      const user = createMockUser({ role: Role.STORE_MANAGER, scopeType: ScopeType.GLOBAL, storeId: null });
      expect(() => service.enforceStoreScope(user, 'store-b')).not.toThrow();
    });

    it('should NOT throw when STORE_MANAGER has ScopeType.STORE and matches targetStoreId', () => {
      const user = createMockUser({ role: Role.STORE_MANAGER, scopeType: ScopeType.STORE, storeId: 'store-a' });
      expect(() => service.enforceStoreScope(user, 'store-a')).not.toThrow();
    });

    it('should throw ForbiddenException when STORE_MANAGER targets a different store', () => {
      const user = createMockUser({ role: Role.STORE_MANAGER, scopeType: ScopeType.STORE, storeId: 'store-a' });
      expect(() => service.enforceStoreScope(user, 'store-b')).toThrow(ForbiddenException);
      expect(() => service.enforceStoreScope(user, 'store-b')).toThrow(
        'Access denied: You do not have permission to manage or approve requests for store [store-b]',
      );
    });

    it('should throw ForbiddenException when STORE_MANAGER targets null storeId', () => {
      const user = createMockUser({ role: Role.STORE_MANAGER, scopeType: ScopeType.STORE, storeId: 'store-a' });
      expect(() => service.enforceStoreScope(user, null)).toThrow(ForbiddenException);
      expect(() => service.enforceStoreScope(user, null)).toThrow(
        'Access denied: You do not have permission to manage or approve requests for store [UNASSIGNED]',
      );
    });

    it('should throw ForbiddenException when non-manager role attempts store management', () => {
      const user = createMockUser({ role: Role.REQUESTER, scopeType: ScopeType.STORE, storeId: 'store-a' });
      expect(() => service.enforceStoreScope(user, 'store-a')).toThrow(ForbiddenException);
      expect(() => service.enforceStoreScope(user, 'store-a')).toThrow(
        'Access denied: You do not have permission to manage or approve requests for store [store-a]',
      );
    });
  });
});
