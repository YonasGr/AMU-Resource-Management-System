---
type: "query"
date: "2026-08-12T15:44:55.941311+00:00"
question: "Why does @prisma/client connect Dto Module to Item-Catalog Module, Request Module, Guards Module, Asset Module, Audit Module, Workflow Module, Prisma Module?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["ref_prisma_client", "backend_src_prisma_prisma_service"]
---

# Q: Why does @prisma/client connect Dto Module to Item-Catalog Module, Request Module, Guards Module, Asset Module, Audit Module, Workflow Module, Prisma Module?

## Answer

Expanded from original query via vocab: [client, prisma, service, module, dto]. Traversed nodes centered at ref_prisma_client (@prisma/client) and backend_src_prisma_prisma_service (PrismaService). Found that @prisma/client serves as the single source of truth for database access types and enums across NestJS backend services and DTOs. PrismaService extends PrismaClient and is injected into services across all domain modules (Asset, Audit, Auth, Item-Catalog, Notification, Organization, Procurement, RBAC, Request, Store, Users, Workflow). DTOs import generated TypeScript enums directly from @prisma/client.

## Outcome

- Signal: useful

## Source Nodes

- ref_prisma_client
- backend_src_prisma_prisma_service