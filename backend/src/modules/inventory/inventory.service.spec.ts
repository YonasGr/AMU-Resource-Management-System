import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;
  let notifications: any;
  let auditService: any;

  const mockMaterial = {
    id: 'mat-uuid-1',
    materialCode: 'MAT-001',
    name: 'A4 Printing Paper',
    unit: 'Ream',
    minimumStock: 10,
    stockSummary: {
      id: 'summary-uuid-1',
      materialId: 'mat-uuid-1',
      quantityReceived: 50,
      quantityIssued: 20,
      remainingQuantity: 30,
    },
  };

  beforeEach(async () => {
    const mockTx = {
      inventoryTransaction: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'txn-uuid-1',
          transactionCode: data.transactionCode,
          ...data,
          createdAt: new Date(),
        })),
      },
      materialRequestItem: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      stockSummary: {
        upsert: jest.fn().mockResolvedValue({
          id: 'summary-uuid-1',
          materialId: 'mat-uuid-1',
          quantityReceived: 60,
          quantityIssued: 20,
          remainingQuantity: 40,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'summary-uuid-1',
          materialId: 'mat-uuid-1',
          ...data,
        })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: {
            material: {
              findUnique: jest.fn(),
            },
            materialRequestItem: {
              findUnique: jest.fn(),
            },
            inventoryTransaction: {
              findMany: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(mockTx)),
            _mockTx: mockTx,
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            getUserIdsByRole: jest.fn().mockResolvedValue(['user-mgr-1', 'user-kpr-1']),
            createForUsers: jest.fn().mockResolvedValue({ count: 2 }),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
    notifications = module.get<NotificationsService>(NotificationsService);
    auditService = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('stockIn()', () => {
    it('should successfully record stock in, update stock summary, notify and audit', async () => {
      prisma.material.findUnique.mockResolvedValue(mockMaterial);

      const dto = {
        materialId: 'mat-uuid-1',
        quantity: 25,
        unitPrice: 150.5,
        supplierId: 'sup-1',
        purpose: 'Monthly restock',
        remarks: 'Batch #2026-A',
      };

      const result = await service.stockIn('keeper-1', dto);

      expect(result).toBeDefined();
      expect(result.type).toBe(TransactionType.STOCK_IN);
      expect(result.quantity).toBe(25);
      expect(result.unitPrice).toBe(150.5);

      // Verify stockSummary was upserted
      expect(prisma._mockTx.stockSummary.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { materialId: 'mat-uuid-1' },
          update: {
            quantityReceived: { increment: 25 },
            remainingQuantity: { increment: 25 },
          },
        }),
      );

      // Verify notifications dispatched
      expect(notifications.createForUsers).toHaveBeenCalledWith(
        expect.arrayContaining(['user-mgr-1', 'user-kpr-1']),
        'STOCK_IN_RECORDED',
        expect.stringContaining('A4 Printing Paper'),
        expect.any(String),
        expect.objectContaining({ materialId: 'mat-uuid-1', quantity: 25 }),
      );

      // Verify audit log
      expect(auditService.log).toHaveBeenCalledWith(
        'keeper-1',
        'STOCK_IN',
        'INVENTORY',
        expect.stringContaining('Received 25 Ream(s) of "A4 Printing Paper"'),
      );
    });

    it('should throw NotFoundException if material does not exist', async () => {
      prisma.material.findUnique.mockResolvedValue(null);

      await expect(
        service.stockIn('keeper-1', {
          materialId: 'non-existent',
          quantity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('stockOut()', () => {
    it('should successfully issue stock and decrement remaining balance', async () => {
      // 30 remaining, minimum is 10. Issuing 15 leaves 15 (above minimum).
      prisma.material.findUnique
        .mockResolvedValueOnce(mockMaterial) // stockOut lookup
        .mockResolvedValueOnce({
          ...mockMaterial,
          stockSummary: { ...mockMaterial.stockSummary, remainingQuantity: 15 },
        }); // maybeAlertLowStock lookup

      const dto = {
        materialId: 'mat-uuid-1',
        quantity: 15,
        employeeId: 'emp-101',
        departmentId: 'dept-cs',
        purpose: 'Lab exam usage',
      };

      const result = await service.stockOut('keeper-1', dto);

      expect(result.type).toBe(TransactionType.STOCK_OUT);
      expect(result.quantity).toBe(15);

      expect(prisma._mockTx.stockSummary.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            materialId: 'mat-uuid-1',
            remainingQuantity: { gte: 15 },
          },
          data: {
            quantityIssued: { increment: 15 },
            remainingQuantity: { decrement: 15 },
          },
        }),
      );

      expect(auditService.log).toHaveBeenCalledWith(
        'keeper-1',
        'STOCK_OUT',
        'INVENTORY',
        expect.stringContaining('Issued 15 Ream(s) of "A4 Printing Paper"'),
      );

      // Should not trigger low stock alert since remaining (15) >= minimumStock (10)
      expect(notifications.createForUsers).not.toHaveBeenCalled();
    });

    it('should trigger LOW_STOCK_ALERT if remaining quantity drops below minimum stock', async () => {
      // 30 remaining, minimum is 10. Issuing 25 leaves 5 (below minimum 10).
      prisma.material.findUnique
        .mockResolvedValueOnce(mockMaterial)
        .mockResolvedValueOnce({
          ...mockMaterial,
          stockSummary: { ...mockMaterial.stockSummary, remainingQuantity: 5 },
        });

      const dto = {
        materialId: 'mat-uuid-1',
        quantity: 25,
      };

      await service.stockOut('keeper-1', dto);

      expect(notifications.createForUsers).toHaveBeenCalledWith(
        expect.arrayContaining(['user-mgr-1', 'user-kpr-1']),
        'LOW_STOCK_ALERT',
        expect.stringContaining('⚠️ Low Stock: A4 Printing Paper'),
        expect.stringContaining('5 Ream(s) remaining, minimum is 10'),
        expect.objectContaining({ remainingQuantity: 5, minimumStock: 10 }),
      );
    });

    it('should reject with BadRequestException when requested quantity exceeds available balance', async () => {
      prisma.material.findUnique.mockResolvedValue(mockMaterial); // available = 30
      prisma._mockTx.stockSummary.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.stockOut('keeper-1', {
          materialId: 'mat-uuid-1',
          quantity: 35, // exceeds 30
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma._mockTx.inventoryTransaction.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if material does not exist', async () => {
      prisma.material.findUnique.mockResolvedValue(null);

      await expect(
        service.stockOut('keeper-1', {
          materialId: 'non-existent',
          quantity: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('returnMaterial()', () => {
    it('should accept returned materials, update stock summary, and audit', async () => {
      prisma.materialRequestItem.findUnique.mockResolvedValue({
        id: 'request-item-1',
        requestId: 'request-1',
        materialId: 'mat-uuid-1',
        quantityIssued: 10,
        quantityReturned: 0,
        request: {
          id: 'request-1',
          requestNumber: 'REQ-2026-0001',
          status: 'ISSUED',
          departmentId: 'dept-cs',
        },
        material: mockMaterial,
      });

      const dto = {
        materialId: 'mat-uuid-1',
        requestId: 'request-1',
        requestItemId: 'request-item-1',
        quantity: 5,
        employeeId: 'emp-101',
        departmentId: 'dept-cs',
        remarks: 'Unused exam booklets returned',
      };

      const result = await service.returnMaterial('keeper-1', dto);

      expect(result.type).toBe(TransactionType.RETURN);
      expect(result.quantity).toBe(5);

      expect(prisma._mockTx.stockSummary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { materialId: 'mat-uuid-1' },
          data: {
            quantityIssued: { decrement: 5 },
            remainingQuantity: { increment: 5 },
          },
        }),
      );

      expect(auditService.log).toHaveBeenCalledWith(
        'keeper-1',
        'RETURN',
        'INVENTORY',
        expect.stringContaining('Accepted return of 5 Ream(s) of "A4 Printing Paper"'),
      );
    });

    it('should throw NotFoundException if the issued request item does not exist', async () => {
      prisma.materialRequestItem.findUnique.mockResolvedValue(null);

      await expect(
        service.returnMaterial('keeper-1', {
          materialId: 'missing-id',
          requestId: 'request-1',
          requestItemId: 'missing-item',
          quantity: 2,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustStock()', () => {
    it('should adjust physical count, compute delta, update stock balance and audit', async () => {
      // Current remaining = 30. Adjust to 28 (Delta: -2).
      prisma.material.findUnique
        .mockResolvedValueOnce(mockMaterial)
        .mockResolvedValueOnce({
          ...mockMaterial,
          stockSummary: { ...mockMaterial.stockSummary, remainingQuantity: 28 },
        });

      const dto = {
        materialId: 'mat-uuid-1',
        newQuantity: 28,
        reason: 'Physical inventory audit variance count',
      };

      const result = await service.adjustStock('keeper-1', dto);

      expect(result.type).toBe(TransactionType.ADJUSTMENT);
      expect(result.quantity).toBe(2); // abs(28 - 30) = 2

      expect(prisma._mockTx.stockSummary.update).toHaveBeenCalledWith({
        where: { materialId: 'mat-uuid-1' },
        data: { remainingQuantity: 28 },
      });

      expect(auditService.log).toHaveBeenCalledWith(
        'keeper-1',
        'STOCK_ADJUSTMENT',
        'INVENTORY',
        expect.stringContaining('Delta: -2'),
      );
    });

    it('should alert if stock adjustment brings balance below minimum stock', async () => {
      // Current remaining = 30. Adjust to 4 (Delta: -26, below minimum 10).
      prisma.material.findUnique
        .mockResolvedValueOnce(mockMaterial)
        .mockResolvedValueOnce({
          ...mockMaterial,
          stockSummary: { ...mockMaterial.stockSummary, remainingQuantity: 4 },
        });

      const dto = {
        materialId: 'mat-uuid-1',
        newQuantity: 4,
        reason: 'Water damage during warehouse roof inspection',
      };

      await service.adjustStock('keeper-1', dto);

      expect(notifications.createForUsers).toHaveBeenCalledWith(
        expect.any(Array),
        'LOW_STOCK_ALERT',
        expect.stringContaining('⚠️ Low Stock: A4 Printing Paper'),
        expect.stringContaining('4 Ream(s) remaining, minimum is 10'),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if material does not exist', async () => {
      prisma.material.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustStock('keeper-1', {
          materialId: 'non-existent',
          newQuantity: 10,
          reason: 'Count',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transferMaterial()', () => {
    it('should reject transfers until location-aware stock is implemented', async () => {
      await expect(
        service.transferMaterial('keeper-1', {
          materialId: 'mat-uuid-1',
          quantity: 10,
          toDepartmentId: 'dept-ee',
          purpose: 'Faculty inter-department loan',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.material.findUnique).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

  });

  describe('findAllTransactions()', () => {
    it('should query transactions with applied filters and correct ordering', async () => {
      const mockTxns = [
        { id: 'txn-1', transactionCode: 'TXN-IN-1', type: TransactionType.STOCK_IN },
        { id: 'txn-2', transactionCode: 'TXN-OUT-2', type: TransactionType.STOCK_OUT },
      ];
      prisma.inventoryTransaction.findMany.mockResolvedValue(mockTxns);

      const result = await service.findAllTransactions({
        type: TransactionType.STOCK_IN,
        materialId: 'mat-uuid-1',
      });

      expect(result).toEqual(mockTxns);
      expect(prisma.inventoryTransaction.findMany).toHaveBeenCalledWith({
        where: {
          type: TransactionType.STOCK_IN,
          materialId: 'mat-uuid-1',
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should query all transactions without filter if query is empty', async () => {
      prisma.inventoryTransaction.findMany.mockResolvedValue([]);

      const result = await service.findAllTransactions();

      expect(result).toEqual([]);
      expect(prisma.inventoryTransaction.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
