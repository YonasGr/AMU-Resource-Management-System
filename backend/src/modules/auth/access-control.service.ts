import { ForbiddenException, Injectable } from '@nestjs/common';
import { MaterialRequest, Role, ScopeType } from '@prisma/client';
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

  canViewRequest(user: SafeUser, request: Pick<MaterialRequest, 'requesterId' | 'departmentId' | 'storeId'>): boolean {
    if (user.role === Role.ADMINISTRATOR || user.role === Role.AUDITOR) {
      return true;
    }

    if (user.role === Role.REQUESTER) {
      return request.requesterId === user.id;
    }

    if (
      (user.role === Role.STORE_MANAGER || user.role === Role.STOREKEEPER) &&
      user.scopeType === ScopeType.GLOBAL
    ) {
      return true;
    }

    return (
      (user.role === Role.STORE_MANAGER || user.role === Role.STOREKEEPER) &&
      user.scopeType === ScopeType.STORE &&
      Boolean(user.storeId) &&
      request.storeId === user.storeId
    );
  }

  getRequestVisibilityWhere(user: SafeUser) {
    if (user.role === Role.ADMINISTRATOR || user.role === Role.AUDITOR) {
      return {};
    }

    if (user.role === Role.REQUESTER) {
      return { requesterId: user.id };
    }

    if (
      (user.role === Role.STORE_MANAGER || user.role === Role.STOREKEEPER) &&
      user.scopeType === ScopeType.GLOBAL
    ) {
      return {};
    }

    if (
      (user.role === Role.STORE_MANAGER || user.role === Role.STOREKEEPER) &&
      user.scopeType === ScopeType.STORE &&
      user.storeId
    ) {
      return { storeId: user.storeId };
    }

    return { id: '__no_visible_requests__' };
  }

  getTransactionVisibilityWhere(user: SafeUser) {
    if (user.role === Role.ADMINISTRATOR || user.role === Role.AUDITOR) {
      return {};
    }

    if (user.role === Role.REQUESTER) {
      return {
        request: { requesterId: user.id },
      };
    }

    if (
      (user.role === Role.STORE_MANAGER || user.role === Role.STOREKEEPER) &&
      user.scopeType === ScopeType.GLOBAL
    ) {
      return {};
    }

    if (
      (user.role === Role.STORE_MANAGER || user.role === Role.STOREKEEPER) &&
      user.scopeType === ScopeType.STORE &&
      user.storeId
    ) {
      return {
        OR: [
          { request: { storeId: user.storeId } },
          { issuedBy: { storeId: user.storeId } },
        ],
      };
    }

    return { id: '__no_visible_transactions__' };
  }
}
