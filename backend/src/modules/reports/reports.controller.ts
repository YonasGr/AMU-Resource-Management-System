import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('current-stock')
  @ApiOperation({ summary: 'Current Stock Report' })
  getCurrentStock() {
    return this.reportsService.getCurrentStockReport();
  }

  @Get('stock-in')
  @ApiOperation({ summary: 'Stock In Report' })
  getStockIn() {
    return this.reportsService.getStockInReport();
  }

  @Get('stock-out')
  @ApiOperation({ summary: 'Stock Out Report' })
  getStockOut() {
    return this.reportsService.getStockOutReport();
  }

  @Get('material-balance')
  @ApiOperation({ summary: 'Material Balance Report' })
  getMaterialBalance() {
    return this.reportsService.getMaterialBalanceReport();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Low Stock Alert Report' })
  getLowStock() {
    return this.reportsService.getLowStockReport();
  }

  @Get('employee-issue')
  @ApiOperation({ summary: 'Employee Material Issue Report' })
  getEmployeeIssue(@Query('employeeId') employeeId?: string) {
    return this.reportsService.getEmployeeIssueReport(employeeId);
  }

  @Get('supplier')
  @ApiOperation({ summary: 'Supplier Report' })
  getSupplier() {
    return this.reportsService.getSupplierReport();
  }

  @Get('transaction-history')
  @ApiOperation({ summary: 'Full Transaction History Report' })
  getTransactionHistory() {
    return this.reportsService.getTransactionHistoryReport();
  }
}
