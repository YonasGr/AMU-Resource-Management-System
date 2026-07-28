import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RoleService } from './role.service';
import { PermissionService } from './permission.service';
import { AccessControlService } from './access-control.service';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [RbacController],
  providers: [RoleService, PermissionService, AccessControlService],
  exports: [AccessControlService, RoleService, PermissionService],
})
export class RbacModule {}
