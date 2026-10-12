import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestStatus, Role } from '@prisma/client';
import { RequestsService } from './requests.service';
import {
  ApproveRejectRequestDto,
  CancelRequestDto,
  CreateRequestDto,
  HandoverRequestDto,
  IssueRequestDto,
} from './dto/request.dto';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new material request' })
  create(@CurrentUser() user: SafeUser, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all material requests' })
  findAll(
    @CurrentUser() user: SafeUser,
    @Query('status') status?: RequestStatus,
    @Query('requesterId') requesterId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.requestsService.findAll(user, { status, requesterId, departmentId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single material request' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.requestsService.findOne(id, user);
  }

  @Post(':id/approve-reject')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Approve or reject a material request (Store Manager / Admin - UC13)' })
  approveOrReject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
    @Body() body: ApproveRejectRequestDto,
  ) {
    return this.requestsService.approveOrReject(id, user, body.action, body.remarks);
  }

  @Post(':id/issue')
  @Roles(Role.STOREKEEPER)
  @ApiOperation({ summary: 'Fulfill/Issue an approved request (Storekeeper only - UC9)' })
  issueItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
    @Body() body: IssueRequestDto,
  ) {
    return this.requestsService.issueItems(id, user, body.employeeId, body.remarks, body.items);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a request before fulfillment' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser, @Body() body: CancelRequestDto) {
    return this.requestsService.cancel(id, user, body.reason);
  }

  @Post(':id/backorder')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Move an approved request to backorder' })
  backorder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser, @Body() body: ApproveRejectRequestDto) {
    return this.requestsService.backorder(id, user, body.remarks);
  }

  @Post(':id/handover')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Record request handover evidence' })
  handover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser, @Body() body: HandoverRequestDto) {
    return this.requestsService.handover(id, user, body.evidence);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Requester confirms receipt and closes request' })
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.requestsService.confirm(id, user);
  }
}
