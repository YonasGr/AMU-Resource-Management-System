import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WorkflowEngineService } from './workflow-engine.service';
import { CreateWorkflowInstanceDto } from './dto/create-instance.dto';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('workflow')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowEngineService: WorkflowEngineService) {}

  @Get('templates')
  @ApiOperation({ summary: 'List all workflow templates and their steps' })
  listTemplates() {
    return this.workflowEngineService.listTemplates();
  }

  @Get('my-pending-approvals')
  @ApiOperation({ summary: 'List every pending workflow instance the current user can act on right now' })
  getMyPendingApprovals(@CurrentUser() user: SafeUser) {
    return this.workflowEngineService.getMyPendingApprovals(user.id);
  }

  @Post('instances')
  @RequirePermission('request.create')
  @ApiOperation({
    summary:
      'Start a workflow instance for an entity (mainly used directly by Phase 5+ modules; exposed here for testing the engine itself)',
  })
  createInstance(@Body() dto: CreateWorkflowInstanceDto, @CurrentUser() user: SafeUser) {
    return this.workflowEngineService.createInstance(dto, user.id);
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get a workflow instance by id, with its template, steps, and history' })
  getInstance(@Param('id') id: string) {
    return this.workflowEngineService.getInstance(id);
  }

  @Get('instances')
  @ApiOperation({ summary: 'Get the latest workflow instance for a given entity' })
  @ApiQuery({ name: 'entityType', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  getInstanceForEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.workflowEngineService.getInstanceForEntity(entityType, entityId);
  }

  @Post('instances/:id/approve')
  @RequirePermission('request.approve')
  @ApiOperation({ summary: 'Approve the current pending step (must be an eligible approver)' })
  approve(@Param('id') id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: SafeUser) {
    return this.workflowEngineService.approve(id, user, dto.comment);
  }

  @Post('instances/:id/reject')
  @RequirePermission('request.approve')
  @ApiOperation({ summary: 'Reject at the current pending step (must be an eligible approver)' })
  reject(@Param('id') id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: SafeUser) {
    return this.workflowEngineService.reject(id, user, dto.comment);
  }

  @Post('instances/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending workflow (requester only)' })
  cancel(@Param('id') id: string, @Body() dto: ApprovalActionDto, @CurrentUser() user: SafeUser) {
    return this.workflowEngineService.cancel(id, user, dto.comment);
  }
}
