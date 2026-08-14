import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { MaterialsModule } from './modules/materials/materials.module';
import { RequestsModule } from './modules/requests/requests.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MaterialsModule,
    RequestsModule,
    InventoryModule,
    EmployeesModule,
    SuppliersModule,
    ReportsModule,
    AuditModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
