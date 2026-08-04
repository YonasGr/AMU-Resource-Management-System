import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequestService } from './request.service';
import { CreateItemRequestDto } from './dto/create-item-request.dto';
import { CreateTransferRequestDto } from './dto/create-transfer-request.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { RequestActionDto } from './dto/approval-action.dto';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post('item-request')
  @RequirePermission('request.create')
  @ApiOperation({ summary: 'Draft a request for an item to be issued from a store' })
  createItemRequest(@Body() dto: CreateItemRequestDto, @CurrentUser() user: SafeUser) {
    return this.requestService.createItemRequest(dto, user);
  }

  @Post('transfer-request')
  @RequirePermission('transfer.request')
  @ApiOperation({ summary: 'Draft a request to transfer an item between two stores' })
  createTransferRequest(@Body() dto: CreateTransferRequestDto, @CurrentUser() user: SafeUser) {
    return this.requestService.createTransferRequest(dto, user);
  }

  @Post('purchase-request')
  @RequirePermission('purchase.create')
  @ApiOperation({ summary: 'Draft a multi-line university purchase request' })
  createPurchaseRequest(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: SafeUser) {
    return this.requestService.createPurchaseRequest(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List requests — your own, or all of them if you have global access' })
  @ApiQuery({ name: 'scope', required: false, enum: ['mine', 'all'] })
  findAll(@CurrentUser() user: SafeUser, @Query('scope') scope?: 'mine' | 'all') {
    return scope === 'all' ? this.requestService.findAll(user) : this.requestService.findMine(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a request with its full workflow timeline' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.requestService.findOne(id, user);
  }

  @Post(':id/submit')
  @RequirePermission('request.create')
  @ApiOperation({ summary: 'Submit a draft request, starting its approval chain' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.requestService.submit(id, user);
  }

  @Post(':id/approve')
  @RequirePermission('request.approve')
  @ApiOperation({ summary: "Approve the request's current step (must be an eligible approver)" })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestActionDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.requestService.approve(id, user, dto.comment);
  }

  @Post(':id/reject')
  @RequirePermission('request.approve')
  @ApiOperation({ summary: "Reject the request at its current step" })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestActionDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.requestService.reject(id, user, dto.comment);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel your own request before it completes (requester only)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestActionDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.requestService.cancel(id, user, dto.comment);
  }
}
