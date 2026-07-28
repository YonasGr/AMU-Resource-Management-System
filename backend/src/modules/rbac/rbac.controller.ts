import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { PermissionService } from './permission.service';
import { AccessControlService } from './access-control.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RequirePermission } from './decorators/require-permission.decorator';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('rbac')
@ApiBearerAuth()
@Controller()
export class RbacController {
  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get('roles')
  @ApiOperation({ summary: 'List all roles' })
  listRoles() {
    return this.roleService.findAll();
  }

  @Post('roles')
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Create a custom role' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Post('roles/:id/permissions')
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Replace the full permission set for a role' })
  setRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('permissionKeys') permissionKeys: string[],
  ) {
    return this.roleService.setRolePermissions(id, permissionKeys);
  }

  @Delete('roles/:id')
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Delete a custom (non-system) role' })
  async deleteRole(@Param('id', ParseUUIDPipe) id: string) {
    await this.roleService.delete(id);
    return { success: true };
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all available permission keys' })
  listPermissions() {
    return this.permissionService.findAll();
  }

  @Post('user-roles')
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Assign a role to a user, scoped to global/organization/store' })
  assignRole(@Body() dto: AssignRoleDto) {
    return this.accessControlService.assignRole(dto);
  }

  @Delete('user-roles/:id')
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Revoke a specific role assignment' })
  async revokeRole(@Param('id', ParseUUIDPipe) id: string) {
    await this.accessControlService.revokeRoleAssignment(id);
    return { success: true };
  }

  @Get('users/:id/roles')
  @ApiOperation({ summary: "List a user's role assignments (with scope)" })
  getUserRoles(@Param('id', ParseUUIDPipe) id: string) {
    return this.accessControlService.getUserRoleAssignments(id);
  }

  @Get('me/permissions')
  @ApiOperation({ summary: "Get the current user's effective permission keys" })
  async getMyPermissions(@CurrentUser() user: SafeUser) {
    const keys = await this.accessControlService.getUserPermissionKeys(user.id);
    return { permissions: Array.from(keys) };
  }
}
