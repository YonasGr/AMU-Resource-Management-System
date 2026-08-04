import { SupplierService } from './supplier.service';

describe('SupplierService', () => {
  it('soft-deactivates suppliers so purchase history remains intact', async () => {
    const prisma: any = {
      supplier: {
        findUnique: jest.fn().mockResolvedValue({ id: 'supplier-1', status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({ id: 'supplier-1', status: 'INACTIVE' }),
      },
    };
    const service = new SupplierService(prisma);

    await service.deactivate('supplier-1');

    expect(prisma.supplier.update).toHaveBeenCalledWith({
      where: { id: 'supplier-1' }, data: { status: 'INACTIVE' },
    });
  });
});
