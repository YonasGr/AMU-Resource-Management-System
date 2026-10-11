import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestStatus, Role, ScopeType, UserStatus } from '@prisma/client';
import { RequestsService } from './requests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../auth/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';

describe('RequestsService Store-Scope Enforcement Verification', () => {
  let service: RequestsService;
  let prisma: any;
  let notifications: any;
  let accessControlService: AccessControlService;
  let auditService: any;

  beforeEach(() => {
    accessControlService = new AccessControlService();
    const mockTx = {
      requestNumberCounter: {
        upsert: jest.fn().mockResolvedValue({ nextNumber: 2 }),
      },
      materialRequest: {
        create: jest.fn().mockResolvedValue({
          id: 'req-1',
          requestNumber: 'REQ-2026-0001',
          purpose: 'Office stationery',
          requester: { fullName: 'Requester User' },
          department: { name: 'Computer Science' },
          items: [],
        }),
      },
    };

    prisma = {
      materialRequest: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      requestNumberCounter: {
        upsert: jest.fn().mockResolvedValue({ nextNumber: 2 }),
      },
      store: {
        findFirst: jest.fn().mockResolvedValue({ id: 'store-a' }),
      },
      $transaction: jest.fn((callback) => callback(mockTx)),
      _mockTx: mockTx,
    };

    notifications = {
      getUserIdsByRole: jest.fn().mockResolvedValue([]),
      createForUsers: jest.fn().mockResolvedValue([]),
    };

    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    service = new RequestsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      accessControlService,
      auditService,
    );
  });

  const createMockUser = (overrides: Partial<SafeUser> = {}): SafeUser => ({
    id: 'user-mgr-1',
    fullName: 'Store Manager',
    email: 'manager@store.com',
    phone: '+251911000000',
    role: Role.STORE_MANAGER,
    status: UserStatus.ACTIVE,
    scopeType: ScopeType.STORE,
    departmentId: 'dept-1',
    storeId: 'store-a',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const mockPendingRequest = {
    id: 'req-1',
    requestNumber: 'REQ-2026-0001',
    purpose: 'Office stationery',
    status: RequestStatus.PENDING,
    storeId: 'store-a',
    requesterId: 'user-req-1',
    requester: { id: 'user-req-1', fullName: 'Requester User', email: 'req@amu.edu.et' },
    items: [],
  };

  describe('create()', () => {
    it('allocates the next yearly request number inside the creation transaction', async () => {
      const request = await service.create('requester-1', {
        purpose: 'Office stationery',
        departmentId: 'dept-1',
        items: [{ materialId: 'material-1', quantityRequested: 3 }],
      });

      expect(request.requestNumber).toBe('REQ-2026-0001');
      expect(prisma._mockTx.requestNumberCounter.upsert).toHaveBeenCalledWith({
        where: { year: 2026 },
        update: { nextNumber: { increment: 1 } },
        create: { year: 2026, nextNumber: 2 },
        select: { nextNumber: true },
      });
      expect(prisma._mockTx.materialRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ requestNumber: 'REQ-2026-0001' }),
        }),
      );
    });
  });

  describe('approveOrReject() Store Scope Enforcement', () => {
    it('should ALLOW STORE_MANAGER assigned to Store A to approve request for Store A', async () => {
      prisma.materialRequest.findUnique.mockResolvedValue(mockPendingRequest);
      prisma.materialRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: RequestStatus.APPROVED,
        approvedById: 'user-mgr-1',
        requester: mockPendingRequest.requester,
      });

      const user = createMockUser({ storeId: 'store-a', scopeType: ScopeType.STORE });
      const result = await service.approveOrReject('req-1', user, 'APPROVE', 'Looks good');

      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(prisma.materialRequest.update).toHaveBeenCalled();
    });

    it('should REJECT (ForbiddenException) STORE_MANAGER assigned to Store A when approving request for Store B', async () => {
      prisma.materialRequest.findUnique.mockResolvedValue({
        ...mockPendingRequest,
        storeId: 'store-b',
      });

      const user = createMockUser({ storeId: 'store-a', scopeType: ScopeType.STORE });

      await expect(service.approveOrReject('req-1', user, 'APPROVE')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.materialRequest.update).not.toHaveBeenCalled();
    });

    it('should ALLOW STORE_MANAGER with ScopeType.GLOBAL to approve request for ANY store', async () => {
      prisma.materialRequest.findUnique.mockResolvedValue({
        ...mockPendingRequest,
        storeId: 'store-b',
      });
      prisma.materialRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: RequestStatus.APPROVED,
        storeId: 'store-b',
        requester: mockPendingRequest.requester,
      });

      const globalManager = createMockUser({
        id: 'user-mgr-global',
        scopeType: ScopeType.GLOBAL,
        storeId: null,
      });

      const result = await service.approveOrReject('req-1', globalManager, 'APPROVE');
      expect(result.status).toBe(RequestStatus.APPROVED);
    });

    it('should ALLOW ADMINISTRATOR to approve request for ANY store', async () => {
      prisma.materialRequest.findUnique.mockResolvedValue({
        ...mockPendingRequest,
        storeId: 'store-b',
      });
      prisma.materialRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: RequestStatus.APPROVED,
        storeId: 'store-b',
        requester: mockPendingRequest.requester,
      });

      const adminUser = createMockUser({
        id: 'user-admin',
        role: Role.ADMINISTRATOR,
        scopeType: ScopeType.GLOBAL,
      });

      const result = await service.approveOrReject('req-1', adminUser, 'APPROVE');
      expect(result.status).toBe(RequestStatus.APPROVED);
    });

    it('should throw NotFoundException if request does not exist', async () => {
      prisma.materialRequest.findUnique.mockResolvedValue(null);
      const user = createMockUser();

      await expect(service.approveOrReject('non-existent', user, 'APPROVE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if request is not PENDING', async () => {
      prisma.materialRequest.findUnique.mockResolvedValue({
        ...mockPendingRequest,
        status: RequestStatus.APPROVED,
      });
      const user = createMockUser();

      await expect(service.approveOrReject('req-1', user, 'APPROVE')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
