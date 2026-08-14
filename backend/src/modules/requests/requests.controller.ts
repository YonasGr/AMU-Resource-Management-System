import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestsService, CreateRequestDto } from './requests.service';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';
import { RequestStatus } from '@prisma/client';

@ApiTags('requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new material request (Requester)' })
  create(@CurrentUser() user: SafeUser, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all material requests (Filter by status, requester, department)' })
  findAll(
    @Query('status') status?: RequestStatus,
    @Query('requesterId') requesterId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.requestsService.findAll({ status, requesterId, departmentId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single material request' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.findOne(id);
  }

  @Post(':id/approve-reject')
  @ApiOperation({ summary: 'Approve or reject a material request (Store Manager)' })
  approveOrReject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
    @Body() body: { action: 'APPROVE' | 'REJECT'; remarks?: string },
  ) {
    return this.requestsService.approveOrReject(id, user.id, body.action, body.remarks);
  }

  @Post(':id/issue')
  @ApiOperation({ summary: 'Fulfill/Issue an approved request (Storekeeper)' })
  issueItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
    @Body() body: { employeeId?: string; remarks?: string },
  ) {
    return this.requestsService.issueItems(id, user.id, body.employeeId, body.remarks);
  }
}
