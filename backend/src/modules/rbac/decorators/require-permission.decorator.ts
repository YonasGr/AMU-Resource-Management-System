import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

/**
 * Marks a route as requiring the given permission key (e.g. 'inventory.issue').
 * Checked by PermissionGuard against the current user's role assignments.
 * This checks permission POSSESSION only — it does not check WHERE the user
 * can use it. For endpoints acting on a specific org/store, also call
 * AccessControlService.hasScopeAccess(...) inside the handler/service.
 */
export const RequirePermission = (permissionKey: string) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permissionKey);
