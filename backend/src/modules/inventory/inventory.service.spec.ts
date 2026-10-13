import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, ScopeType, TransactionType, UserStatus } from '@prisma/client';
import { AccessControlService } from '../auth/access-control.service';
import { StockConflictException } from './stock-conflict.exception';

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
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'txn-uuid-1',
          transactionCode: data.transactionCode,
          ...data,
          createdAt: new Date(),
        })),
      },
      outboxEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventoryTransfer: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'transfer-1',
          transferCode: 'TRF-001',
          materialId: 'mat-uuid-1',
          sourceStoreId: 'store-1',
          destinationStoreId: 'store-2',
          status: 'CANCELLED',
        }),
      },
      goodsReceipt: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'receipt-uuid-1',
          status: 'POSTED',
          ...data,
        })),
      },
      cycleCount: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      cycleCountLine: {
        update: jest.fn(),
      },
      materialReturn: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockImplementation(({ data }) => ({ id: 'return-1', status: 'POSTED', ...data })),
      },
      materialRequestItem: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      stockBalance: {
        upsert: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          id: 'balance-uuid-1',
          remainingQuantity: 30,
          reservedQuantity: 0,
        }),
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
              findMany: jest.fn(),
            },
            store: {
              findFirst: jest.fn(),
            },
            goodsReceipt: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            cycleCount: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            materialReturn: {
              create: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            materialRequestItem: {
              findUnique: jest.fn(),
            },
            stockBalance: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'balance-uuid-1',
                remainingQuantity: 30,
                reservedQuantity: 0,
              }),
            },
            inventoryTransaction: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            inventoryTransfer: {
              findUnique: jest.fn(),
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
            logInTransaction: jest.fn().mockResolvedValue(undefined),
          },
        },
        AccessControlService,
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
    it('requires a store for global administrators', async () => {
      await expect(
        service.stockIn(
          {
            id: 'admin-1',
            role: 'ADMINISTRATOR',
            scopeType: 'GLOBAL',
            storeId: null,
          } as any,
          { materialId: 'mat-uuid-1', quantity: 1 },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.material.findUnique).not.toHaveBeenCalled();
    });

    it('rejects store-scoped users attempting to mutate another store', async () => {
      await expect(
        service.stockIn(
          {
            id: 'keeper-1',
            role: 'STOREKEEPER',
            scopeType: 'STORE',
            storeId: 'store-a',
          } as any,
          { materialId: 'mat-uuid-1', quantity: 1, storeId: 'store-b' },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.material.findUnique).not.toHaveBeenCalled();
    });

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

  describe('goods receipts', () => {
    const draftReceipt = {
      id: 'receipt-uuid-1',
      receiptCode: 'GRN-12345678-123',
      materialId: 'mat-uuid-1',
      storeId: 'store-1',
      supplierId: 'sup-1',
      quantityReceived: 10,
      quantityAccepted: 0,
      quantityRejected: 0,
      status: 'DRAFT',
      condition: null,
      remarks: null,
    };

    it('creates a draft without changing stock', async () => {
      prisma.material.findUnique.mockResolvedValue({ id: 'mat-uuid-1' });
      prisma.store.findFirst.mockResolvedValue({ id: 'store-1', status: 'ACTIVE' });
      prisma.goodsReceipt.create.mockResolvedValue(draftReceipt);

      const result = await service.createGoodsReceipt(
        { id: 'keeper-1', role: Role.STOREKEEPER, scopeType: ScopeType.STORE, storeId: 'store-1' } as any,
        { materialId: 'mat-uuid-1', storeId: 'store-1', quantityReceived: 10 },
      );

      expect(result).toEqual(draftReceipt);
      expect(prisma._mockTx.stockBalance.upsert).not.toHaveBeenCalled();
      expect(prisma.goodsReceipt.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantityReceived: 10, createdById: 'keeper-1' }) }),
      );
    });

    it('requires accepted and rejected quantities to reconcile', async () => {
      prisma.goodsReceipt.findUnique.mockResolvedValue(draftReceipt);

      await expect(
        service.inspectGoodsReceipt(
          'receipt-uuid-1',
          { id: 'keeper-1', role: Role.STOREKEEPER, scopeType: ScopeType.STORE, storeId: 'store-1' } as any,
          {
          quantityAccepted: 8,
          quantityRejected: 1,
          },
        ),
      ).rejects.toThrow('Accepted and rejected quantities must equal the received quantity');
    });

    it('requires a condition note when quantities are rejected', async () => {
      prisma.goodsReceipt.findUnique.mockResolvedValue(draftReceipt);

      await expect(
        service.inspectGoodsReceipt(
          'receipt-uuid-1',
          { id: 'keeper-1', role: Role.STOREKEEPER, scopeType: ScopeType.STORE, storeId: 'store-1' } as any,
          {
          quantityAccepted: 8,
          quantityRejected: 2,
          },
        ),
      ).rejects.toThrow('A condition note is required when quantities are rejected');
    });

    it('posts only accepted quantity and creates one stock-in transaction', async () => {
      prisma.goodsReceipt.findUnique.mockResolvedValue({
        ...draftReceipt,
        status: 'INSPECTED',
        quantityAccepted: 8,
        quantityRejected: 2,
        remarks: 'Two damaged units',
      });

      await service.postGoodsReceipt(
        'receipt-uuid-1',
        { id: 'keeper-1', role: Role.STOREKEEPER, scopeType: ScopeType.STORE, storeId: 'store-1' } as any,
      );

      expect(prisma._mockTx.stockBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { quantityReceived: { increment: 8 }, remainingQuantity: { increment: 8 } },
        }),
      );
      expect(prisma._mockTx.stockSummary.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { quantityReceived: { increment: 8 }, remainingQuantity: { increment: 8 } },
        }),
      );
      expect(prisma._mockTx.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 8,
            type: TransactionType.STOCK_IN,
            storeId: 'store-1',
          }),
        }),
      );
      expect(auditService.logInTransaction).toHaveBeenCalledWith(
        prisma._mockTx,
        'keeper-1',
        'POST_GOODS_RECEIPT',
        'INVENTORY',
        'Posted goods receipt GRN-12345678-123',
        expect.objectContaining({
          entityType: 'GOODS_RECEIPT',
          entityId: 'receipt-uuid-1',
          afterData: expect.objectContaining({ status: 'POSTED', quantityAccepted: 8 }),
        }),
      );
    });

    it('does not post a receipt that is no longer inspected', async () => {
      prisma.goodsReceipt.findUnique.mockResolvedValue({ ...draftReceipt, status: 'POSTED' });

      await expect(
        service.postGoodsReceipt(
          'receipt-uuid-1',
          { id: 'keeper-1', role: Role.STOREKEEPER, scopeType: ScopeType.STORE, storeId: 'store-1' } as any,
        ),
      ).rejects.toThrow(
        'Only INSPECTED receipts can be posted',
      );
      expect(prisma._mockTx.stockBalance.upsert).not.toHaveBeenCalled();
    });

    it('rejects a draft receipt with structured evidence without changing stock', async () => {
      prisma.goodsReceipt.findUnique
        .mockResolvedValueOnce({
          ...draftReceipt,
          status: 'DRAFT',
          createdById: 'keeper-1',
        })
        .mockResolvedValueOnce({
          ...draftReceipt,
          status: 'REJECTED',
          inspectedById: 'manager-1',
          rejectionReasonCode: 'DAMAGED',
          remarks: 'Shipment arrived with damaged packaging',
        });

      const result = await service.rejectGoodsReceipt(
        'receipt-uuid-1',
        { id: 'manager-1', role: Role.STORE_MANAGER, scopeType: ScopeType.STORE, storeId: 'store-1' } as any,
        { reasonCode: 'DAMAGED', remarks: 'Shipment arrived with damaged packaging' },
      );

      expect(result).toEqual(expect.objectContaining({ status: 'REJECTED' }));
      expect(prisma.goodsReceipt.updateMany).toHaveBeenCalledWith({
        where: { id: 'receipt-uuid-1', status: 'DRAFT' },
        data: expect.objectContaining({
          status: 'REJECTED',
          inspectedById: 'manager-1',
          rejectionReasonCode: 'DAMAGED',
          remarks: 'Shipment arrived with damaged packaging',
        }),
      });
      expect(prisma._mockTx.stockBalance.upsert).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        'manager-1',
        'REJECT_GOODS_RECEIPT',
        'INVENTORY',
        'Rejected goods receipt GRN-12345678-123',
        expect.objectContaining({
          entityType: 'GOODS_RECEIPT',
          entityId: 'receipt-uuid-1',
        }),
      );
    });

    it('prevents the receipt creator from rejecting a receipt', async () => {
      prisma.goodsReceipt.findUnique.mockResolvedValue({
        ...draftReceipt,
        createdById: 'manager-1',
      });

      await expect(
        service.rejectGoodsReceipt(
          'receipt-uuid-1',
          { id: 'manager-1', role: Role.STORE_MANAGER, scopeType: ScopeType.STORE, storeId: 'store-1' } as any,
          { reasonCode: 'OTHER', remarks: 'Rejected after review' },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.goodsReceipt.updateMany).not.toHaveBeenCalled();
    });

    it('requires rejection remarks', async () => {
      await expect(
        service.rejectGoodsReceipt('receipt-uuid-1', 'manager-1', {
          reasonCode: 'OTHER',
          remarks: '   ',
        }),
      ).rejects.toThrow('Goods receipt rejection remarks are required');
      expect(prisma.goodsReceipt.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('cycle counts', () => {
    const actor = {
      id: 'keeper-1',
      role: Role.STOREKEEPER,
      scopeType: ScopeType.STORE,
      storeId: 'store-1',
    } as any;

    it('snapshots store quantities when creating a count', async () => {
      prisma.store.findFirst.mockResolvedValue({ id: 'store-1', status: 'ACTIVE' });
      prisma.material.findMany.mockResolvedValue([
        { id: 'mat-uuid-1', stockBalances: [{ remainingQuantity: 30 }] },
      ]);
      prisma.cycleCount.create.mockResolvedValue({ id: 'count-1', status: 'DRAFT' });

      await service.createCycleCount(actor, {
        storeId: 'store-1',
        lines: [{ materialId: 'mat-uuid-1' }],
      });

      expect(prisma.cycleCount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            storeId: 'store-1',
            lines: { create: [{ materialId: 'mat-uuid-1', systemQuantity: 30 }] },
          }),
        }),
      );
    });

    it('requires a reason for every non-zero variance', async () => {
      prisma.cycleCount.findUnique.mockResolvedValue({
        id: 'count-1',
        storeId: 'store-1',
        status: 'DRAFT',
        lines: [{ id: 'line-1', materialId: 'mat-uuid-1', systemQuantity: 30 }],
      });

      await expect(
        service.submitCycleCount('count-1', actor, {
          lines: [{ lineId: 'line-1', physicalQuantity: 28 }],
        }),
      ).rejects.toThrow('A variance reason is required');
    });

    it('posts an approved variance to the store balance and ledger', async () => {
      prisma.cycleCount.findUnique.mockResolvedValue({
        id: 'count-1',
        countCode: 'CC-12345678-123',
        storeId: 'store-1',
        status: 'COUNTED',
        lines: [{
          id: 'line-1',
          materialId: 'mat-uuid-1',
          systemQuantity: 30,
          physicalQuantity: 28,
          variance: -2,
          varianceReason: 'Two damaged units found',
        }],
      });

      await service.approveCycleCount('count-1', {
        ...actor,
        role: Role.STORE_MANAGER,
      });

      expect(prisma._mockTx.stockBalance.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ remainingQuantity: 30 }),
          data: { remainingQuantity: 28 },
        }),
      );
      expect(prisma._mockTx.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: TransactionType.ADJUSTMENT,
            quantity: 2,
            storeId: 'store-1',
          }),
        }),
      );
      expect(auditService.logInTransaction).toHaveBeenCalledWith(
        prisma._mockTx,
        'keeper-1',
        'APPROVE_CYCLE_COUNT',
        'INVENTORY',
        'Approved cycle count CC-12345678-123',
        expect.objectContaining({
          entityType: 'CYCLE_COUNT',
          entityId: 'count-1',
          afterData: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('prevents the cycle count creator from approving its variance', async () => {
      prisma.cycleCount.findUnique.mockResolvedValue({
        id: 'count-1',
        storeId: 'store-1',
        createdById: 'keeper-1',
        status: 'COUNTED',
        lines: [],
      });

      await expect(
        service.approveCycleCount('count-1', {
          ...actor,
          role: Role.STORE_MANAGER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('return inspections', () => {
    const actor = {
      id: 'keeper-1',
      role: Role.STOREKEEPER,
      scopeType: ScopeType.STORE,
      storeId: 'store-1',
    } as any;

    const requestItem = {
      id: 'item-1',
      requestId: 'request-1',
      materialId: 'mat-uuid-1',
      quantityIssued: 10,
      quantityReturned: 2,
      request: { id: 'request-1', requestNumber: 'REQ-2026-001', status: 'ISSUED', storeId: 'store-1' },
      material: mockMaterial,
    };

    it('creates an inspection record without increasing stock or returned quantity', async () => {
      prisma.materialRequestItem.findUnique.mockResolvedValue(requestItem);
      prisma.materialReturn.findMany.mockResolvedValue([]);
      prisma.materialReturn.create.mockResolvedValue({ id: 'return-1', status: 'DRAFT' });

      await service.createReturnInspection(actor, {
        requestId: 'request-1',
        requestItemId: 'item-1',
        quantity: 3,
      });

      expect(prisma.materialReturn.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestId: 'request-1',
            requestItemId: 'item-1',
            materialId: 'mat-uuid-1',
            storeId: 'store-1',
            quantity: 3,
          }),
        }),
      );
      expect(prisma._mockTx.stockBalance.upsert).not.toHaveBeenCalled();
      expect(prisma._mockTx.materialRequestItem.updateMany).not.toHaveBeenCalled();
    });

    it('rejects return inspections that exceed issued and pending quantities', async () => {
      prisma.materialRequestItem.findUnique.mockResolvedValue(requestItem);
      prisma.materialReturn.findMany.mockResolvedValue([{ quantity: 7 }]);

      await expect(
        service.createReturnInspection(actor, {
          requestId: 'request-1',
          requestItemId: 'item-1',
          quantity: 2,
        }),
      ).rejects.toThrow('Only 1 item(s) remain eligible for inspection');
    });

    it('posts accepted returns into the store balance and request ledger', async () => {
      prisma.materialReturn.findUnique.mockResolvedValue({
        id: 'return-1',
        returnCode: 'RET-12345678-123',
        requestId: 'request-1',
        requestItemId: 'item-1',
        materialId: 'mat-uuid-1',
        storeId: 'store-1',
        quantity: 3,
        status: 'INSPECTED',
        disposition: 'ACCEPT_TO_STOCK',
        createdById: 'requester-1',
        inspectedById: 'inspector-1',
        requestItem: { quantityIssued: 10, quantityReturned: 2 },
      });

      await service.postReturnInspection('return-1', {
        ...actor,
        role: Role.STORE_MANAGER,
      });

      expect(prisma._mockTx.materialRequestItem.updateMany).toHaveBeenCalled();
      expect(prisma._mockTx.stockBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            quantityIssued: { decrement: 3 },
            remainingQuantity: { increment: 3 },
          },
        }),
      );
      expect(prisma._mockTx.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: TransactionType.RETURN,
            quantity: 3,
            storeId: 'store-1',
          }),
        }),
      );
    });

    it('posts quarantine returns without adding available stock', async () => {
      prisma.materialReturn.findUnique.mockResolvedValue({
        id: 'return-1',
        returnCode: 'RET-12345678-123',
        requestId: 'request-1',
        requestItemId: 'item-1',
        materialId: 'mat-uuid-1',
        storeId: 'store-1',
        quantity: 3,
        status: 'INSPECTED',
        disposition: 'QUARANTINE',
        createdById: 'requester-1',
        inspectedById: 'inspector-1',
        requestItem: { quantityIssued: 10, quantityReturned: 2 },
      });

      await service.postReturnInspection('return-1', {
        ...actor,
        role: Role.STORE_MANAGER,
      });

      expect(prisma._mockTx.materialRequestItem.updateMany).toHaveBeenCalled();
      expect(prisma._mockTx.stockBalance.upsert).not.toHaveBeenCalled();
      expect(prisma._mockTx.inventoryTransaction.create).not.toHaveBeenCalled();
    });

    it('prevents the return creator from inspecting the return', async () => {
      prisma.materialReturn.findUnique.mockResolvedValue({
        id: 'return-1',
        storeId: 'store-1',
        status: 'DRAFT',
        createdById: 'keeper-1',
      });

      await expect(
        service.inspectReturn('return-1', actor, { disposition: 'ACCEPT_TO_STOCK' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.materialReturn.update).not.toHaveBeenCalled();
    });

    it('prevents the creator or inspector from posting a return', async () => {
      prisma.materialReturn.findUnique.mockResolvedValue({
        id: 'return-1',
        storeId: 'store-1',
        status: 'INSPECTED',
        disposition: 'ACCEPT_TO_STOCK',
        createdById: 'keeper-1',
        inspectedById: 'manager-1',
        requestItem: { quantityIssued: 10, quantityReturned: 2 },
      });

      await expect(
        service.postReturnInspection('return-1', {
          ...actor,
          id: 'manager-1',
          role: Role.STORE_MANAGER,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('stockOut()', () => {
    it('replays a keyed stock-out without mutating stock again', async () => {
      prisma.material.findUnique.mockResolvedValueOnce(mockMaterial);
      const existing = {
        id: 'txn-existing',
        type: TransactionType.STOCK_OUT,
        materialId: 'mat-uuid-1',
        storeId: 'store-1',
        transactionCode: 'TXN-OUT-existing',
      };
      prisma.inventoryTransaction.findUnique.mockResolvedValueOnce(existing);

      await expect(
        service.stockOut(
          {
            id: 'keeper-1',
            role: Role.STOREKEEPER,
            scopeType: ScopeType.STORE,
            storeId: 'store-1',
          } as any,
          { materialId: 'mat-uuid-1', storeId: 'store-1', quantity: 2, idempotencyKey: 'scan-1' },
        ),
      ).resolves.toEqual(existing);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma._mockTx.stockBalance.updateMany).not.toHaveBeenCalled();
    });

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

      expect(auditService.logInTransaction).toHaveBeenCalledWith(
        prisma._mockTx,
        'keeper-1',
        'STOCK_OUT',
        'INVENTORY',
        expect.stringContaining('Issued 15 Ream(s) of "A4 Printing Paper"'),
        expect.objectContaining({
          entityType: 'INVENTORY_TRANSACTION',
          afterData: expect.objectContaining({ availableQuantity: 15, quantityIssued: 15 }),
        }),
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
          stockBalances: [{ remainingQuantity: 5 }],
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

    it('returns a typed conflict when the aggregate summary changes during issue', async () => {
      prisma.material.findUnique.mockResolvedValue(mockMaterial);
      prisma._mockTx.stockSummary.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.stockOut('keeper-1', { materialId: 'mat-uuid-1', quantity: 5 }),
      ).rejects.toBeInstanceOf(StockConflictException);
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

    it('requires administrator approval for large manager adjustments', async () => {
      prisma.material.findUnique.mockResolvedValueOnce(mockMaterial);
      prisma.stockBalance.findUnique.mockResolvedValueOnce({
        remainingQuantity: 30,
        reservedQuantity: 0,
      });

      await expect(
        service.adjustStock({
          id: 'manager-1',
          role: Role.STORE_MANAGER,
          scopeType: ScopeType.STORE,
          storeId: 'legacy-store',
        } as any, {
          materialId: 'mat-uuid-1',
          newQuantity: 15,
          reasonCode: 'COUNT_VARIANCE' as const,
          remarks: 'Large variance requires escalation',
        }),
      ).rejects.toThrow('require administrator approval');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('allows administrators to post large adjustments', async () => {
      prisma.material.findUnique
        .mockResolvedValueOnce(mockMaterial)
        .mockResolvedValueOnce({
          ...mockMaterial,
          stockBalances: [{ remainingQuantity: 0 }],
        });
      prisma.stockBalance.findUnique.mockResolvedValueOnce({
        remainingQuantity: 30,
        reservedQuantity: 0,
      });

      await expect(
        service.adjustStock({
          id: 'admin-1',
          role: Role.ADMINISTRATOR,
          scopeType: ScopeType.GLOBAL,
          storeId: null,
        } as any, {
          materialId: 'mat-uuid-1',
          storeId: 'legacy-store',
          newQuantity: 0,
          reasonCode: 'LOSS' as const,
          remarks: 'Administrator-approved large variance',
          breakGlass: true,
        }),
      ).resolves.toBeDefined();
    });

    it('requires explicit break-glass authorization for large administrator adjustments', async () => {
      prisma.material.findUnique.mockResolvedValueOnce(mockMaterial);
      prisma.stockBalance.findUnique.mockResolvedValueOnce({
        remainingQuantity: 30,
        reservedQuantity: 0,
      });

      await expect(
        service.adjustStock({
          id: 'admin-1',
          role: Role.ADMINISTRATOR,
          scopeType: ScopeType.GLOBAL,
          storeId: null,
        } as any, {
          materialId: 'mat-uuid-1',
          storeId: 'legacy-store',
          newQuantity: 0,
          reasonCode: 'LOSS' as const,
          remarks: 'Missing stock requires escalation',
        }),
      ).rejects.toThrow('break-glass authorization');
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
          storeId: 'legacy-store',
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

      expect(auditService.logInTransaction).toHaveBeenCalledWith(
        prisma._mockTx,
        'keeper-1',
        'RETURN',
        'INVENTORY',
        expect.stringContaining('Accepted return of 5 Ream(s) of "A4 Printing Paper"'),
        expect.objectContaining({
          entityType: 'INVENTORY_TRANSACTION',
          afterData: expect.objectContaining({ quantityReturned: 5, quantityAcceptedToStock: 5 }),
        }),
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
          stockBalances: [{ remainingQuantity: 28 }],
        });

      const dto = {
        materialId: 'mat-uuid-1',
        newQuantity: 28,
        reasonCode: 'COUNT_VARIANCE' as const,
        remarks: 'Physical inventory audit variance count',
      };

      const result = await service.adjustStock({
        id: 'manager-1',
        role: Role.STORE_MANAGER,
        scopeType: ScopeType.STORE,
        storeId: 'legacy-store',
      } as any, dto);

      expect(result.type).toBe(TransactionType.ADJUSTMENT);
      expect(result.quantity).toBe(2); // abs(28 - 30) = 2

      expect(prisma._mockTx.stockSummary.update).toHaveBeenCalledWith({
        where: { materialId: 'mat-uuid-1' },
        data: { remainingQuantity: { increment: -2 } },
      });

      expect(auditService.logInTransaction).toHaveBeenCalledWith(
        prisma._mockTx,
        'manager-1',
        'STOCK_ADJUSTMENT',
        'INVENTORY',
        expect.stringContaining('Delta: -2'),
        expect.objectContaining({
          actorRole: Role.STORE_MANAGER,
          source: 'api',
          beforeData: { remainingQuantity: 30 },
          afterData: { remainingQuantity: 28, reasonCode: 'COUNT_VARIANCE' },
        }),
      );
    });

    it('should alert if stock adjustment brings balance below minimum stock', async () => {
      // Current remaining = 30. Adjust to 4 (Delta: -26, below minimum 10).
      prisma.material.findUnique
        .mockResolvedValueOnce(mockMaterial)
        .mockResolvedValueOnce({
          ...mockMaterial,
          stockBalances: [{ remainingQuantity: 4 }],
        });

      const dto = {
        materialId: 'mat-uuid-1',
        storeId: 'legacy-store',
        newQuantity: 4,
        reasonCode: 'DAMAGE' as const,
        remarks: 'Water damage during warehouse roof inspection',
        breakGlass: true,
      };

      await service.adjustStock({
        id: 'admin-1',
        role: Role.ADMINISTRATOR,
        scopeType: ScopeType.GLOBAL,
        storeId: null,
      } as any, dto);

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
        service.adjustStock({
          id: 'manager-1',
          role: Role.STORE_MANAGER,
          scopeType: ScopeType.STORE,
          storeId: 'legacy-store',
        } as any, {
          materialId: 'non-existent',
          newQuantity: 10,
          reasonCode: 'COUNT_VARIANCE' as const,
          remarks: 'Count',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transferMaterial()', () => {
    it('should reject transfers where source and destination stores match', async () => {
      await expect(
        service.transferMaterial('keeper-1', {
          materialId: 'mat-uuid-1',
          sourceStoreId: 'legacy-store',
          destinationStoreId: 'legacy-store',
          quantity: 10,
          purpose: 'Faculty inter-department loan',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.material.findUnique).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('cancels a draft transfer with structured cancellation evidence', async () => {
      const draftTransfer = {
        id: 'transfer-1',
        transferCode: 'TRF-001',
        materialId: 'mat-uuid-1',
        sourceStoreId: 'store-1',
        destinationStoreId: 'store-2',
        status: 'DRAFT',
      };
      prisma.inventoryTransfer.findUnique.mockResolvedValue(draftTransfer);

      const result = await service.cancelTransfer(
        'transfer-1',
        {
          id: 'manager-1',
          role: Role.STORE_MANAGER,
          scopeType: ScopeType.STORE,
          storeId: 'store-1',
        } as any,
        {
          reasonCode: 'NO_LONGER_REQUIRED',
          remarks: 'Destination no longer needs this material',
        },
      );

      expect(result).toEqual(expect.objectContaining({ status: 'CANCELLED' }));
      expect(prisma._mockTx.inventoryTransfer.updateMany).toHaveBeenCalledWith({
        where: { id: 'transfer-1', status: 'DRAFT' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancelledById: 'manager-1',
          cancellationReasonCode: 'NO_LONGER_REQUIRED',
          cancellationRemarks: 'Destination no longer needs this material',
        }),
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'manager-1',
        'CANCEL_TRANSFER',
        'INVENTORY',
        'Cancelled transfer TRF-001',
        expect.objectContaining({
          entityType: 'INVENTORY_TRANSFER',
          entityId: 'transfer-1',
          afterData: { status: 'CANCELLED', reasonCode: 'NO_LONGER_REQUIRED' },
        }),
      );
    });

    it('rejects cancellation after dispatch because stock has already moved', async () => {
      prisma.inventoryTransfer.findUnique.mockResolvedValue({
        id: 'transfer-1',
        transferCode: 'TRF-001',
        materialId: 'mat-uuid-1',
        sourceStoreId: 'store-1',
        destinationStoreId: 'store-2',
        status: 'DISPATCHED',
      });

      await expect(
        service.cancelTransfer(
          'transfer-1',
          {
            id: 'manager-1',
            role: Role.STORE_MANAGER,
            scopeType: ScopeType.STORE,
            storeId: 'store-1',
          } as any,
          { reasonCode: 'STOCK_CORRECTION', remarks: 'Incorrect transfer request' },
        ),
      ).rejects.toThrow('Only DRAFT transfers can be cancelled');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('requires cancellation remarks', async () => {
      await expect(
        service.cancelTransfer('transfer-1', 'manager-1', {
          reasonCode: 'OTHER',
          remarks: '   ',
        }),
      ).rejects.toThrow('Transfer cancellation remarks are required');
      expect(prisma.inventoryTransfer.findUnique).not.toHaveBeenCalled();
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
        id: 'manager-1',
        fullName: 'Global Manager',
        email: 'manager@example.com',
        phone: null,
        role: Role.STORE_MANAGER,
        status: UserStatus.ACTIVE,
        scopeType: ScopeType.GLOBAL,
        departmentId: null,
        storeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, {
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

      const result = await service.findAllTransactions({
        id: 'manager-1',
        fullName: 'Global Manager',
        email: 'manager@example.com',
        phone: null,
        role: Role.STORE_MANAGER,
        status: UserStatus.ACTIVE,
        scopeType: ScopeType.GLOBAL,
        departmentId: null,
        storeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result).toEqual([]);
      expect(prisma.inventoryTransaction.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
