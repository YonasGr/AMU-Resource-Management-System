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
    // Phase 1 is now complete. Phase 2 (Store, Item Catalog) gets registered here next.
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
