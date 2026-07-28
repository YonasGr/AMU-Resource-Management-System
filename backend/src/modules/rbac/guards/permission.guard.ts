import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access-control.service';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission() on this route — JwtAuthGuard already ran
    // globally, so being authenticated is enough.
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false; // JwtAuthGuard should already reject this, but be defensive.
    }

    const hasPermission = await this.accessControlService.hasPermission(
      user.id,
      requiredPermission,
    );
    if (!hasPermission) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
    }
    return true;
  }
}
