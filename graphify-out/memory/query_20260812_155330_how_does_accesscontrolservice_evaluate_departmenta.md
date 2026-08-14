---
type: "query"
date: "2026-08-12T15:53:30.387836+00:00"
question: "How does AccessControlService evaluate departmental boundaries for MovementService?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["backend_src_modules_rbac_access_control_service_accesscontrolservice", "backend_src_modules_inventory_movement_service_movementservice", "backend_src_modules_rbac_decorators_require_permission_decorator_requirepermission"]
---

# Q: How does AccessControlService evaluate departmental boundaries for MovementService?

## Answer

AccessControlService provides two-tier RBAC/ABAC enforcement: 1) PermissionGuard checks global permissions (@RequirePermission), 2) MovementService and InventoryService invoke accessControlService.hasScopeAccess() via assertStoreAccess() to verify if currentUser.id has explicit scope rights over specific target stores/colleges. For queries, getAccessibleStoreIds() and getAccessibleOrganizationIds() inject scopeFilter into Prisma WHERE clauses.

## Outcome

- Signal: useful

## Source Nodes

- backend_src_modules_rbac_access_control_service_accesscontrolservice
- backend_src_modules_inventory_movement_service_movementservice
- backend_src_modules_rbac_decorators_require_permission_decorator_requirepermission