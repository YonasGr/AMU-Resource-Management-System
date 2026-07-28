import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Permissions are seed-defined, not created via API — the set of valid
   * permission keys is meant to match what the codebase actually checks
   * (@RequirePermission(...) call sites), so it's intentionally not
   * user-editable. This just lists what exists.
   */
  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }
}
