import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestStatus, Role } from '@prisma/client';
import { RequestsService, CreateRequestDto } from './requests.service';
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
  @HttpCode(HttpStatus.OK)
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Approve or reject a material request (Store Manager / Admin - UC13)' })
  approveOrReject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
    @Body() body: { action: 'APPROVE' | 'REJECT'; remarks?: string },
  ) {
    return this.requestsService.approveOrReject(id, user, body.action, body.remarks);
  }

  @Post(':id/issue')
  @Roles(Role.STOREKEEPER)
  @ApiOperation({ summary: 'Fulfill/Issue an approved request (Storekeeper only - UC9)' })
  issueItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
    @Body() body: { employeeId?: string; remarks?: string },
  ) {
    return this.requestsService.issueItems(id, user.id, body.employeeId, body.remarks);
  }
}
