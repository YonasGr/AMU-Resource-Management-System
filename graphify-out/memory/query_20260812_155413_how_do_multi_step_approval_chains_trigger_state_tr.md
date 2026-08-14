---
type: "query"
date: "2026-08-12T15:54:13.665020+00:00"
question: "How do multi-step approval chains trigger state transitions in MovementService?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["backend_src_modules_workflow_workflow_engine_service_workflowengineservice", "backend_src_modules_request_request_service_requestservice", "backend_src_modules_inventory_movement_service_movementservice"]
---

# Q: How do multi-step approval chains trigger state transitions in MovementService?

## Answer

State lifecycle: DRAFT -> SUBMITTED -> PENDING_APPROVAL -> APPROVED -> EXECUTED. WorkflowEngineService manages approval step progression without knowledge of physical inventory. When WorkflowEngineService.approve() reaches final approval (instance.status == 'APPROVED'), RequestService.approve() calls RequestService.execute(). This invokes MovementService (.applySingleStoreMovement or .applyTransfer) with authorizedByWorkflow: true and an idempotent executionKey to perform stock deduction exactly once.

## Outcome

- Signal: useful

## Source Nodes

- backend_src_modules_workflow_workflow_engine_service_workflowengineservice
- backend_src_modules_request_request_service_requestservice
- backend_src_modules_inventory_movement_service_movementservice