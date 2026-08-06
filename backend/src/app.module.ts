import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RbacModule } from './modules/rbac/rbac.module';
import { PermissionGuard } from './modules/rbac/guards/permission.guard';
import { StoreModule } from './modules/store/store.module';
import { ItemCatalogModule } from './modules/item-catalog/item-catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { RequestModule } from './modules/request/request.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { AssetModule } from './modules/asset/asset.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReportingModule } from './modules/reporting/reporting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    OrganizationModule,
    UsersModule,
    AuthModule,
    RbacModule,
    StoreModule,
    ItemCatalogModule,
    InventoryModule,
    WorkflowModule,
    RequestModule,
    ProcurementModule,
    DistributionModule,
    AssetModule,
    AuditModule,
    NotificationModule,
    ReportingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Every route requires a valid access token by default; mark a route
    // @Public() to opt out (login, refresh, health check, etc.).
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Runs after JwtAuthGuard. Routes without @RequirePermission() just need
    // to be authenticated; routes with it also need the matching permission.
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
