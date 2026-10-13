import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMINISTRATOR, Role.AUDITOR)
  @ApiOperation({ summary: 'View audit logs (Administrator & Auditor)' })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }
}
