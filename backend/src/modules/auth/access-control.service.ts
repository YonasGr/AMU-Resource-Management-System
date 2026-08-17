import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role, ScopeType } from '@prisma/client';
import { SafeUser } from './decorators/current-user.decorator';

@Injectable()
export class AccessControlService {
  /**
   * Checks if a user has permission to manage/approve actions for a specific store.
   * - ADMINISTRATOR: Always allowed (GLOBAL system admin).
   * - Non-STORE_MANAGER: Denied (false).
   * - STORE_MANAGER with GLOBAL scope: Allowed for all stores.
   * - STORE_MANAGER with STORE scope: Allowed ONLY if user.storeId === targetStoreId.
   * - Otherwise: Denied (false).
   */
  canManageStore(user: SafeUser, targetStoreId?: string | null): boolean {
    if (user.role === Role.ADMINISTRATOR) {
      return true;
    }

    if (user.role !== Role.STORE_MANAGER) {
      return false;
    }

    if (user.scopeType === ScopeType.GLOBAL) {
      return true;
    }

    if (user.scopeType === ScopeType.STORE && user.storeId && targetStoreId && user.storeId === targetStoreId) {
      return true;
    }

    return false;
  }

  /**
   * Enforces store-level access control. Throws ForbiddenException if access is denied.
   */
  enforceStoreScope(user: SafeUser, targetStoreId?: string | null): void {
    if (!this.canManageStore(user, targetStoreId)) {
      throw new ForbiddenException(
        `Access denied: You do not have permission to manage or approve requests for store [${targetStoreId || 'UNASSIGNED'}]`,
      );
    }
  }
}
