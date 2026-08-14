import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmployeesService, CreateDepartmentDto, CreateEmployeeDto } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('departments')
  @ApiOperation({ summary: 'List all departments' })
  getDepartments() {
    return this.employeesService.findAllDepartments();
  }

  @Post('departments')
  @ApiOperation({ summary: 'Register a new department' })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.employeesService.createDepartment(dto);
  }

  @Get('departments/:id/issue-history')
  @ApiOperation({ summary: 'View material issue history for a department' })
  getDepartmentHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.getDepartmentIssueHistory(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new employee' })
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.createEmployee(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all employees' })
  findAllEmployees(@Query('departmentId') departmentId?: string) {
    return this.employeesService.findAllEmployees(departmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee details and material issue history' })
  findOneEmployee(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOneEmployee(id);
  }
}
