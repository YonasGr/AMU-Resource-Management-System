# Graph Report - .  (2026-08-12)

## Corpus Check
- 194 files · ~63,950 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1529 nodes · 3334 edges · 104 communities (89 shown, 15 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 187 edges (avg confidence: 0.8)
- Token cost: 500 input · 300 output

## Community Hubs (Navigation)
- Organization Module
- Rbac Module
- devDependencies
- Reporting Module
- Request Module
- argon2
- Asset Module
- Distribution Module
- Requests Module
- Inventory Module
- Ui Module
- Dto Module
- Store Module
- Ui Module
- Workflow Module
- Asset Module
- Asset Module
- Audit Module
- tsconfig.json
- Inventory Module
- Request Module
- autoprefixer
- axios
- Dto Module
- Dto Module
- Procurement Module
- Dto Module
- tsconfig.json
- Prisma Module
- Reports Module
- Mail Module
- Item-Catalog Module
- Dto Module
- Item-Catalog Module
- Auth Module
- Asset Module
- Auth Module
- Users Module
- Guards Module
- Item-Catalog Module
- Users Module
- scripts
- Interceptors Module
- Notification Module
- Dto Module
- Dto Module
- jest
- Dto Module
- package.json
- Src Module
- Workflow Module
- package.json
- Procurement Module
- Config Module
- Dto Module
- Dto Module
- Dto Module
- Dto Module
- Dto Module
- Dto Module
- Dto Module
- Dto Module
- Procurement Module
- Dto Module
- Dto Module
- Dto Module
- Request Module
- Assets Module
- tsconfig.node.json
- Dto Module
- Procurement Module
- Procurement Module
- Dto Module
- tsconfig.build.json
- Guards Module
- Item-Catalog Module
- Procurement Module
- Distribution Module
- Inventory Module
- nest-cli.json
- package.json
- pnpm
- Dto Module
- Dto Module
- Notification Module
- Amu-Resource-Management-System Module
- clsx
- Amu-Resource-Management-System Module
- Docs Module
- eslint-plugin-react-refresh
- @hookform/resolvers
- react-router-dom
- recharts
- @types/react-dom
- typescript
- vite
- Amu-Resource-Management-System Module
- Frontend Module
- Amu-Resource-Management-System Module
- Amu-Resource-Management-System Module

## God Nodes (most connected - your core abstractions)
1. `SafeUser` - 129 edges
2. `RequirePermission()` - 94 edges
3. `CurrentUser` - 67 edges
4. `PrismaService` - 53 edges
5. `AccessControlService` - 39 edges
6. `@prisma/client` - 34 edges
7. `RequestService` - 24 edges
8. `NotificationService` - 23 edges
9. `api` - 23 edges
10. `MovementService` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Master Architecture & Design Specifications` --semantically_similar_to--> `Docs Master Architecture Manual`  [INFERRED] [semantically similar]
  SYSTEM_DOCUMENTATION.md → docs/SYSTEM_DOCUMENTATION.md
- `Master Build Plan & Execution Checklist` --semantically_similar_to--> `Docs Build Plan Checklist`  [INFERRED] [semantically similar]
  build-plan.md → docs/build-plan.md
- `PostgreSQL Production Service` --semantically_similar_to--> `PostgreSQL Development Service`  [INFERRED] [semantically similar]
  docker-compose.prod.yml → docker-compose.yml
- `SingleStoreMovementParams` --references--> `SafeUser`  [EXTRACTED]
  backend/src/modules/inventory/movement.service.ts → backend/src/modules/auth/decorators/current-user.decorator.ts
- `TransferParams` --references--> `SafeUser`  [EXTRACTED]
  backend/src/modules/inventory/movement.service.ts → backend/src/modules/auth/decorators/current-user.decorator.ts

## Import Cycles
- None detected.

## Communities (104 total, 15 thin omitted)

### Community 0 - "Organization Module"
Cohesion: 0.06
Nodes (30): CreateOrganizationUnitDto, ApiProperty, ApiPropertyOptional, IsEnum, IsOptional, IsString, IsUUID, MinLength (+22 more)

### Community 1 - "Rbac Module"
Cohesion: 0.06
Nodes (26): AssignRoleDto, ApiProperty, ApiPropertyOptional, IsEnum, IsOptional, IsUUID, CreateRoleDto, ApiProperty (+18 more)

### Community 2 - "devDependencies"
Cohesion: 0.04
Nodes (49): devDependencies, eslint, eslint-config-prettier, eslint-plugin-prettier, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing (+41 more)

### Community 3 - "Reporting Module"
Cohesion: 0.11
Nodes (21): Format, parseFormat(), ReportingController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Controller (+13 more)

### Community 4 - "Request Module"
Cohesion: 0.10
Nodes (5): SafeUser, InventoryService, Injectable, RequestService, Injectable

### Community 5 - "argon2"
Cohesion: 0.05
Nodes (43): argon2, dependencies, argon2, bullmq, class-transformer, class-validator, ioredis, @nestjs/bullmq (+35 more)

### Community 6 - "Asset Module"
Cohesion: 0.13
Nodes (25): AssetModule, Module, DistributionModule, Module, InventoryModule, Module, NotificationModule, Module (+17 more)

### Community 7 - "Distribution Module"
Cohesion: 0.07
Nodes (25): DistributionController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Get, Param (+17 more)

### Community 8 - "Requests Module"
Cohesion: 0.11
Nodes (25): AppShell(), NAV_ITEMS, Sidebar(), TopBar(), OrgUnit, useMyOrgPath(), usePendingApprovalsCount(), api (+17 more)

### Community 9 - "Inventory Module"
Cohesion: 0.11
Nodes (12): MovementService, movement, user, Injectable, NotificationService, Injectable, AccessControlService, Injectable (+4 more)

### Community 10 - "Ui Module"
Cohesion: 0.12
Nodes (24): Badge(), BadgeTone, statusTone(), toneStyles, EmptyState(), PageHeader(), Category, Item (+16 more)

### Community 11 - "Dto Module"
Cohesion: 0.15
Nodes (9): loan, user, SingleStoreMovementParams, TransferParams, TxClient, OrganizationUnitTreeNode, PurchaseRequestDetails, ScopeTarget (+1 more)

### Community 12 - "Store Module"
Cohesion: 0.12
Nodes (15): StoreController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Body, Controller, Delete (+7 more)

### Community 13 - "Ui Module"
Cohesion: 0.12
Nodes (22): Button, Size, sizeStyles, Variant, variantStyles, Input, Label(), Select (+14 more)

### Community 14 - "Workflow Module"
Cohesion: 0.12
Nodes (15): ApprovalActionDto, ApiPropertyOptional, IsOptional, IsString, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags (+7 more)

### Community 15 - "Asset Module"
Cohesion: 0.11
Nodes (16): DisposalService, Injectable, BorrowActionDto, InspectReturnDto, ApiProperty, ApiPropertyOptional, IsEnum, IsOptional (+8 more)

### Community 16 - "Asset Module"
Cohesion: 0.18
Nodes (14): AssetController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Body, Controller, Get (+6 more)

### Community 17 - "Audit Module"
Cohesion: 0.11
Nodes (15): AuditController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Controller, Get, Param (+7 more)

### Community 18 - "tsconfig.json"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+16 more)

### Community 19 - "Inventory Module"
Cohesion: 0.20
Nodes (12): InventoryController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Body, Controller, Get (+4 more)

### Community 20 - "Request Module"
Cohesion: 0.25
Nodes (12): CurrentUser, RequestController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Body, Controller (+4 more)

### Community 21 - "autoprefixer"
Cohesion: 0.10
Nodes (21): autoprefixer, eslint-plugin-react-hooks, devDependencies, autoprefixer, eslint, eslint-plugin-react-hooks, postcss, tailwindcss (+13 more)

### Community 22 - "axios"
Cohesion: 0.10
Nodes (21): axios, dependencies, axios, lucide-react, react, react-dom, react-hook-form, tailwind-merge (+13 more)

### Community 23 - "Dto Module"
Cohesion: 0.13
Nodes (16): AssignManagerDto, ApiProperty, IsUUID, CreateStoreDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+8 more)

### Community 24 - "Dto Module"
Cohesion: 0.12
Nodes (15): LoginDto, ApiProperty, IsEmail, IsString, MinLength, RefreshTokenDto, ApiProperty, IsString (+7 more)

### Community 25 - "Procurement Module"
Cohesion: 0.18
Nodes (10): ProcurementController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Delete, Param (+2 more)

### Community 26 - "Dto Module"
Cohesion: 0.12
Nodes (16): CreateUserDto, ApiProperty, ApiPropertyOptional, IsEmail, IsOptional, IsString, IsUUID, MinLength (+8 more)

### Community 27 - "tsconfig.json"
Cohesion: 0.10
Nodes (19): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+11 more)

### Community 28 - "Prisma Module"
Cohesion: 0.17
Nodes (18): main(), OrgIds, PERMISSION_KEYS, prisma, ROLE_DEFINITIONS, seedAdminRoleAssignment(), seedAdminUser(), seedItemCatalog() (+10 more)

### Community 29 - "Reports Module"
Cohesion: 0.17
Nodes (12): Card(), CardBody(), CardHeader(), ReportConfig, REPORTS, ReportsPage(), Store, StoreDetailPage() (+4 more)

### Community 30 - "Mail Module"
Cohesion: 0.15
Nodes (8): AuthModule, Module, MailModule, Module, MailService, Injectable, Module, UsersModule

### Community 31 - "Item-Catalog Module"
Cohesion: 0.24
Nodes (10): ItemCatalogController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Delete, Param (+2 more)

### Community 32 - "Dto Module"
Cohesion: 0.13
Nodes (16): CreatePurchaseOrderDto, PurchaseOrderLineDto, ApiProperty, ApiPropertyOptional, ArrayMinSize, IsArray, IsDateString, IsInt (+8 more)

### Community 33 - "Item-Catalog Module"
Cohesion: 0.20
Nodes (8): CreateCategoryDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, MinLength, ItemCatalogModule, Module

### Community 34 - "Auth Module"
Cohesion: 0.24
Nodes (4): parseDurationToMs(), AuthService, AuthTokens, Injectable

### Community 35 - "Asset Module"
Cohesion: 0.26
Nodes (4): AssetService, Injectable, BorrowService, Injectable

### Community 36 - "Auth Module"
Cohesion: 0.35
Nodes (9): AuthController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Post, Public() (+1 more)

### Community 37 - "Users Module"
Cohesion: 0.19
Nodes (5): JwtAccessPayload, JwtAccessStrategy, Injectable, Injectable, UsersService

### Community 38 - "Guards Module"
Cohesion: 0.17
Nodes (8): SetMinimumStockDto, ApiProperty, IsInt, Min, REQUIRED_PERMISSION_KEY, PermissionGuard, Injectable, @nestjs/core

### Community 39 - "Item-Catalog Module"
Cohesion: 0.21
Nodes (4): CategoryService, Injectable, ItemService, Injectable

### Community 40 - "Users Module"
Cohesion: 0.19
Nodes (10): ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Get, Param, Patch (+2 more)

### Community 41 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, prisma:generate, prisma:migrate, prisma:seed, prisma:studio (+6 more)

### Community 42 - "Interceptors Module"
Cohesion: 0.19
Nodes (7): AppModule, Module, AllExceptionsFilter, StandardResponse, TransformInterceptor, Injectable, Catch

### Community 43 - "Notification Module"
Cohesion: 0.16
Nodes (6): ApiOperation, ApiQuery, Get, Param, Post, Query

### Community 44 - "Dto Module"
Cohesion: 0.19
Nodes (13): CreateGoodsReceiptDto, GoodsReceiptLineDto, ApiProperty, ApiPropertyOptional, ArrayMinSize, IsArray, IsInt, IsOptional (+5 more)

### Community 45 - "Dto Module"
Cohesion: 0.15
Nodes (13): CreatePurchaseRequestDto, PurchaseRequestLineDto, ApiProperty, ApiPropertyOptional, ArrayMinSize, IsArray, IsInt, IsOptional (+5 more)

### Community 46 - "jest"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 47 - "Dto Module"
Cohesion: 0.26
Nodes (9): CreateSupplierDto, ApiProperty, ApiPropertyOptional, IsEmail, IsOptional, IsString, MinLength, UpdateSupplierDto (+1 more)

### Community 48 - "package.json"
Cohesion: 0.15
Nodes (12): description, name, packageManager, private, scripts, build:backend, build:frontend, dev:backend (+4 more)

### Community 49 - "Src Module"
Cohesion: 0.21
Nodes (7): AppController, ApiOperation, ApiTags, Controller, Get, AppService, Injectable

### Community 50 - "Workflow Module"
Cohesion: 0.24
Nodes (7): CreateWorkflowInstanceDto, ApiProperty, IsString, ContextData, step, user, IsObject

### Community 51 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 52 - "Procurement Module"
Cohesion: 0.22
Nodes (9): errorMessage(), Item, OrderLine, ProcurementPage(), PurchaseOrder, RequestRow, Store, Supplier (+1 more)

### Community 53 - "Config Module"
Cohesion: 0.22
Nodes (8): Environment, EnvironmentVariables, IsEnum, IsNumber, IsOptional, IsString, Min, validateEnv()

### Community 54 - "Dto Module"
Cohesion: 0.22
Nodes (9): CreateAssetDto, ApiProperty, ApiPropertyOptional, IsDateString, IsEnum, IsOptional, IsString, IsUUID (+1 more)

### Community 55 - "Dto Module"
Cohesion: 0.22
Nodes (8): AdjustStockDto, ApiProperty, ApiPropertyOptional, IsInt, IsOptional, IsString, IsUUID, NotEquals

### Community 56 - "Dto Module"
Cohesion: 0.22
Nodes (8): DisposeStockDto, ApiProperty, ApiPropertyOptional, IsInt, IsOptional, IsPositive, IsString, IsUUID

### Community 57 - "Dto Module"
Cohesion: 0.22
Nodes (8): IssueStockDto, ApiProperty, ApiPropertyOptional, IsInt, IsOptional, IsPositive, IsString, IsUUID

### Community 58 - "Dto Module"
Cohesion: 0.22
Nodes (8): ReceiveStockDto, ApiProperty, ApiPropertyOptional, IsInt, IsOptional, IsPositive, IsString, IsUUID

### Community 59 - "Dto Module"
Cohesion: 0.22
Nodes (8): ReturnStockDto, ApiProperty, ApiPropertyOptional, IsInt, IsOptional, IsPositive, IsString, IsUUID

### Community 60 - "Dto Module"
Cohesion: 0.22
Nodes (8): TransferStockDto, ApiProperty, ApiPropertyOptional, IsInt, IsOptional, IsPositive, IsString, IsUUID

### Community 61 - "Dto Module"
Cohesion: 0.22
Nodes (9): CreateItemDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsEnum, IsOptional, IsString, IsUUID (+1 more)

### Community 62 - "Procurement Module"
Cohesion: 0.28
Nodes (4): PurchaseOrderService, dto, user, Injectable

### Community 63 - "Dto Module"
Cohesion: 0.22
Nodes (8): CreateBorrowRequestDto, ApiProperty, ApiPropertyOptional, IsDateString, IsOptional, IsString, IsUUID, MinLength

### Community 64 - "Dto Module"
Cohesion: 0.22
Nodes (8): CreateItemRequestDto, ApiProperty, ApiPropertyOptional, IsInt, IsOptional, IsPositive, IsString, IsUUID

### Community 65 - "Dto Module"
Cohesion: 0.22
Nodes (8): CreateTransferRequestDto, ApiProperty, ApiPropertyOptional, IsInt, IsOptional, IsPositive, IsString, IsUUID

### Community 66 - "Request Module"
Cohesion: 0.22
Nodes (6): BorrowRequestDetails, DisposalRequestDetails, ItemRequestDetails, PurchaseRequestDetails, currentUser, TransferRequestDetails

### Community 67 - "Assets Module"
Cohesion: 0.22
Nodes (8): Asset, AssetsPage(), Disposal, GoodsReceipt, Item, Loan, Store, Tab

### Community 68 - "tsconfig.node.json"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include, vite.config.ts

### Community 69 - "Dto Module"
Cohesion: 0.25
Nodes (8): ApiPropertyOptional, IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength, UpdateItemDto

### Community 70 - "Procurement Module"
Cohesion: 0.32
Nodes (3): ApiQuery, Get, Query

### Community 72 - "Dto Module"
Cohesion: 0.25
Nodes (7): CreateDisposalRequestDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, IsUUID, MinLength

### Community 73 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): exclude, extends, dist, node_modules, **/*spec.ts, test, ./tsconfig.json

### Community 74 - "Guards Module"
Cohesion: 0.33
Nodes (3): IS_PUBLIC_KEY, JwtAuthGuard, Injectable

### Community 75 - "Item-Catalog Module"
Cohesion: 0.29
Nodes (3): ApiQuery, Get, Query

### Community 76 - "Procurement Module"
Cohesion: 0.29
Nodes (4): GoodsReceiptService, dto, user, Injectable

### Community 77 - "Distribution Module"
Cohesion: 0.33
Nodes (6): Allocation, DistributionPage(), Item, message(), Plan, Store

### Community 78 - "Inventory Module"
Cohesion: 0.29
Nodes (5): InventoryDashboardPage(), Movement, MOVEMENT_TONE, Store, StoreInventoryRow

### Community 79 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 80 - "package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 81 - "pnpm"
Cohesion: 0.33
Nodes (6): pnpm, onlyBuiltDependencies, argon2, msgpackr-extract, prisma, @prisma/engines

### Community 82 - "Dto Module"
Cohesion: 0.40
Nodes (4): RequestActionDto, ApiPropertyOptional, IsOptional, IsString

### Community 83 - "Dto Module"
Cohesion: 0.40
Nodes (5): ApiPropertyOptional, IsOptional, IsString, MinLength, UpdateCategoryDto

### Community 84 - "Notification Module"
Cohesion: 0.40
Nodes (4): NotificationController, ApiBearerAuth, ApiTags, Controller

### Community 85 - "Amu-Resource-Management-System Module"
Cohesion: 0.67
Nodes (3): Master Build Plan & Execution Checklist, Docs Build Plan Checklist, University ERP Developer Handoff

## Knowledge Gaps
- **300 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+295 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Dto Module` to `Item-Catalog Module`, `Request Module`, `Guards Module`, `Asset Module`, `Dto Module`, `pnpm`, `Audit Module`, `Workflow Module`, `Dto Module`, `Dto Module`, `Prisma Module`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `onlyBuiltDependencies` connect `pnpm` to `Dto Module`, `Guards Module`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `pnpm` connect `pnpm` to `package.json`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _300 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Organization Module` be split into smaller, more focused modules?**
  _Cohesion score 0.06103896103896104 - nodes in this community are weakly interconnected._
- **Should `Rbac Module` be split into smaller, more focused modules?**
  _Cohesion score 0.0636734693877551 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._