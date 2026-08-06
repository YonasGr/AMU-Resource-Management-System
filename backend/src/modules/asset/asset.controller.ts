import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { AssetService } from './asset.service';
import { BorrowService } from './borrow.service';
import { BorrowActionDto, InspectReturnDto } from './dto/borrow-actions.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { DisposalService } from './disposal.service';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetController {
  constructor(
    private readonly assets: AssetService,
    private readonly borrowing: BorrowService,
    private readonly disposals: DisposalService,
  ) {}

  @Post() @RequirePermission('asset.manage')
  @ApiOperation({ summary: 'Register one fixed-asset inventory unit' })
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: SafeUser) { return this.assets.create(dto, user); }

  @Get() @RequirePermission('asset.view')
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  list(@CurrentUser() user: SafeUser, @Query() query: Record<string, string>) { return this.assets.findAll(user, query); }

  @Get('borrowing') @RequirePermission('borrow.view')
  listBorrowing(@CurrentUser() user: SafeUser, @Query('status') status?: string) { return this.borrowing.findAll(user, status); }

  @Post('borrowing/:id/issue') @RequirePermission('borrow.manage')
  issue(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BorrowActionDto, @CurrentUser() user: SafeUser) {
    return this.borrowing.issue(id, dto.notes, user);
  }

  @Post('borrowing/:id/return') @RequirePermission('borrow.return')
  returnAsset(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BorrowActionDto, @CurrentUser() user: SafeUser) {
    return this.borrowing.returnAsset(id, dto.notes, user);
  }

  @Post('borrowing/:id/inspect') @RequirePermission('borrow.inspect')
  inspect(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InspectReturnDto, @CurrentUser() user: SafeUser) {
    return this.borrowing.inspect(id, dto.condition, dto.notes, user);
  }

  @Get('disposals/records') @RequirePermission('disposal.view')
  listDisposals(@CurrentUser() user: SafeUser) { return this.disposals.findAll(user); }

  @Get('disposals/:id/certificate') @RequirePermission('disposal.view')
  async certificate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const certificate = await this.disposals.getCertificate(id, user);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${certificate.filename}"`);
    return certificate.buffer;
  }

  @Get(':id') @RequirePermission('asset.view')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) { return this.assets.findOne(id, user); }

  @Patch(':id') @RequirePermission('asset.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto, @CurrentUser() user: SafeUser) {
    return this.assets.update(id, dto, user);
  }

  @Post(':id/complete-maintenance') @RequirePermission('asset.manage')
  @ApiOperation({ summary: 'Complete maintenance/inspection and return asset to AVAILABLE or ASSIGNED' })
  completeMaintenance(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.assets.completeMaintenance(id, user);
  }

  @Post(':id/unassign') @RequirePermission('asset.manage')
  @ApiOperation({ summary: 'Unassign asset from organization and set status to AVAILABLE' })
  unassign(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.assets.unassign(id, user);
  }
}

