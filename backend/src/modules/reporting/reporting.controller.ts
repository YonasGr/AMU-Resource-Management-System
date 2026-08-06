import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

type Format = 'json' | 'csv' | 'pdf';

function parseFormat(raw?: string): Format {
  if (raw === 'csv' || raw === 'pdf') return raw;
  return 'json';
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  private async send(
    res: Response,
    format: Format,
    filename: string,
    title: string,
    data: Record<string, unknown>[],
  ) {
    if (format === 'csv') {
      const csv = this.reportingService.toCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }
    if (format === 'pdf') {
      const pdf = this.reportingService.toPDF(title, data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return res.send(pdf);
    }
    return res.json(data);
  }

  @Get('inventory')
  @RequirePermission('report.view')
  @ApiOperation({ summary: 'Current inventory levels across all stores' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'pdf'] })
  async inventory(
    @Res() res: Response,
    @Query('storeId') storeId?: string,
    @Query('format') format?: string,
  ) {
    const data = await this.reportingService.currentInventory(storeId);
    await this.send(res, parseFormat(format), 'inventory-report', 'Current Inventory Report', data as any);
  }

  @Get('low-stock')
  @RequirePermission('report.view')
  @ApiOperation({ summary: 'Items below their minimum stock level' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'pdf'] })
  async lowStock(
    @Res() res: Response,
    @Query('storeId') storeId?: string,
    @Query('format') format?: string,
  ) {
    const data = await this.reportingService.lowStock(storeId);
    await this.send(res, parseFormat(format), 'low-stock-report', 'Low Stock Report', data as any);
  }

  @Get('movements')
  @RequirePermission('report.view')
  @ApiOperation({ summary: 'Stock movement history' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'pdf'] })
  async movements(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('storeId') storeId?: string,
    @Query('type') type?: string,
    @Query('format') format?: string,
  ) {
    const data = await this.reportingService.stockMovements({ from, to, storeId, type });
    await this.send(res, parseFormat(format), 'movements-report', 'Stock Movement Report', data as any);
  }

  @Get('consumption')
  @RequirePermission('report.view')
  @ApiOperation({ summary: 'Department consumption (ISSUE movements grouped by org/store/item)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'pdf'] })
  async consumption(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('orgId') orgId?: string,
    @Query('format') format?: string,
  ) {
    const data = await this.reportingService.departmentConsumption({ from, to, orgId });
    await this.send(res, parseFormat(format), 'consumption-report', 'Department Consumption Report', data as any);
  }

  @Get('purchases')
  @RequirePermission('report.view')
  @ApiOperation({ summary: 'Purchase orders and goods receipts' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'pdf'] })
  async purchases(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
  ) {
    const data = await this.reportingService.purchaseReport({ from, to });
    await this.send(res, parseFormat(format), 'purchase-report', 'Purchase Report', data as any);
  }

  @Get('transfers')
  @RequirePermission('report.view')
  @ApiOperation({ summary: 'Inter-store transfer history' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'pdf'] })
  async transfers(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
  ) {
    const data = await this.reportingService.transferReport({ from, to });
    await this.send(res, parseFormat(format), 'transfer-report', 'Transfer Report', data as any);
  }

  @Get('assets')
  @RequirePermission('report.view')
  @ApiOperation({ summary: 'Asset registry report' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'pdf'] })
  async assets(
    @Res() res: Response,
    @Query('storeId') storeId?: string,
    @Query('status') status?: string,
    @Query('format') format?: string,
  ) {
    const data = await this.reportingService.assetReport({ storeId, status });
    await this.send(res, parseFormat(format), 'asset-report', 'Asset Report', data as any);
  }

  @Get('user-activity')
  @RequirePermission('report.view')
  @ApiOperation({ summary: 'User activity report from audit log' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'pdf'] })
  async userActivity(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
  ) {
    const data = await this.reportingService.userActivityReport({ from, to });
    await this.send(res, parseFormat(format), 'user-activity-report', 'User Activity Report', data as any);
  }
}
