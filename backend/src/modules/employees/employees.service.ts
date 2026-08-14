import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateDepartmentDto {
  code: string;
  name: string;
  description?: string;
}

export interface CreateEmployeeDto {
  employeeCode: string;
  fullName: string;
  email?: string;
  phone?: string;
  position?: string;
  departmentId: string;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // Department Management
  async createDepartment(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Department code "${dto.code}" already exists`);
    }
    return this.prisma.department.create({ data: dto });
  }

  async findAllDepartments() {
    return this.prisma.department.findMany({
      include: {
        _count: { select: { employees: true, users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Employee Management
  async createEmployee(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { employeeCode: dto.employeeCode },
    });
    if (existing) {
      throw new ConflictException(`Employee code "${dto.employeeCode}" already exists`);
    }
    return this.prisma.employee.create({
      data: dto,
      include: { department: true },
    });
  }

  async findAllEmployees(departmentId?: string) {
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;

    return this.prisma.employee.findMany({
      where,
      include: { department: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOneEmployee(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        transactions: {
          include: {
            material: true,
            issuedBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return employee;
  }

  async getDepartmentIssueHistory(departmentId: string) {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) {
      throw new NotFoundException(`Department ${departmentId} not found`);
    }

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: { departmentId, type: 'STOCK_OUT' },
      include: {
        material: true,
        employee: true,
        issuedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      department: dept,
      transactions,
    };
  }
}
