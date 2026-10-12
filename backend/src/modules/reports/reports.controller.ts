import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportQueryDto } from './dto/report-query.dto';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(Role.ADMINISTRATOR, Role.STORE_MANAGER, Role.STOREKEEPER, Role.AUDITOR)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('current-stock')
  @ApiOperation({ summary: 'Current Stock Report' })
  getCurrentStock(@Query() query: ReportQueryDto) {
    return this.reportsService.getCurrentStockReport(query);
  }

  @Get('stock-in')
  @ApiOperation({ summary: 'Stock In Report' })
  getStockIn(@Query() query: ReportQueryDto) {
    return this.reportsService.getStockInReport(query);
  }

  @Get('stock-out')
  @ApiOperation({ summary: 'Stock Out Report' })
  getStockOut(@Query() query: ReportQueryDto) {
    return this.reportsService.getStockOutReport(query);
  }

  @Get('material-balance')
  @ApiOperation({ summary: 'Material Balance Report' })
  getMaterialBalance(@Query() query: ReportQueryDto) {
    return this.reportsService.getMaterialBalanceReport(query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Low Stock Alert Report' })
  getLowStock(@Query() query: ReportQueryDto) {
    return this.reportsService.getLowStockReport(query);
  }

  @Get('employee-issue')
  @ApiOperation({ summary: 'Employee Material Issue Report' })
  getEmployeeIssue(@Query('employeeId') employeeId: string | undefined, @Query() query: ReportQueryDto) {
    return this.reportsService.getEmployeeIssueReport(employeeId, query);
  }

  @Get('supplier')
  @ApiOperation({ summary: 'Supplier Report' })
  getSupplier(@Query() query: ReportQueryDto) {
    return this.reportsService.getSupplierReport(query);
  }

  @Get('transaction-history')
  @ApiOperation({ summary: 'Full Transaction History Report' })
  getTransactionHistory(@Query() query: ReportQueryDto) {
    return this.reportsService.getTransactionHistoryReport(query);
  }
}
