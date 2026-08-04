import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { DistributionService } from './distribution.service';
import { CreateDistributionPlanDto } from './dto/create-distribution-plan.dto';

@ApiTags('distribution')
@ApiBearerAuth()
@Controller('distribution-plans')
export class DistributionController {
  constructor(private readonly service: DistributionService) {}

  @Post() @RequirePermission('distribution.manage')
  @ApiOperation({ summary: 'Create a draft distribution plan with per-store allocations' })
  create(@Body() dto: CreateDistributionPlanDto, @CurrentUser() user: SafeUser) {
    return this.service.create(dto, user);
  }

  @Get() @RequirePermission('distribution.view')
  findAll() { return this.service.findAll(); }

  @Get(':id') @RequirePermission('distribution.view')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }

  @Post(':id/activate') @RequirePermission('distribution.manage')
  activate(@Param('id', ParseUUIDPipe) id: string) { return this.service.activate(id); }

  @Post(':id/cancel') @RequirePermission('distribution.manage')
  cancel(@Param('id', ParseUUIDPipe) id: string) { return this.service.cancel(id); }

  @Post('allocations/:id/confirm') @RequirePermission('distribution.confirm')
  @ApiOperation({ summary: 'Destination-store receipt confirmation; transfers inventory exactly once' })
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.service.confirm(id, user);
  }
}
