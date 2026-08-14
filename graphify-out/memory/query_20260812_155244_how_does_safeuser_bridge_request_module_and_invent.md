---
type: "query"
date: "2026-08-12T15:52:44.218507+00:00"
question: "How does SafeUser bridge Request Module and Inventory Module?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["backend_src_modules_auth_decorators_current_user_decorator_safeuser", "backend_src_modules_request_request_service", "backend_src_modules_inventory_movement_service"]
---

# Q: How does SafeUser bridge Request Module and Inventory Module?

## Answer

SafeUser (from current-user.decorator.ts) acts as the mandatory authenticated actor context (userId, orgUnitId, roles, permissions). RequestService methods (.createItemRequest, .approve, .execute) take SafeUser to authorize user actions, and when a request is approved/executed, RequestService hands the SafeUser actor to InventoryService and MovementService (.issue, .transfer, .adjust) to enforce multi-tenant organization scoping and audit logs.

## Outcome

- Signal: useful

## Source Nodes

- backend_src_modules_auth_decorators_current_user_decorator_safeuser
- backend_src_modules_request_request_service
- backend_src_modules_inventory_movement_service