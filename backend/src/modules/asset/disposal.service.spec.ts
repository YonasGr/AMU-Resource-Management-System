import { DisposalService } from './disposal.service';

describe('DisposalService certificate', () => {
  it('generates a valid PDF certificate for an accessible record', async () => {
    const prisma = { disposalRecord: { findUnique: jest.fn().mockResolvedValue({
      id: 'disposal-1', certificateNumber: 'DSP-ABC12345', reason: 'Beyond repair', method: 'Recycler',
      inspectionNotes: 'Inspected', disposedAt: new Date('2026-08-05T00:00:00Z'), storeId: 'store-1',
      asset: { assetTag: 'AMU-001', serialNumber: 'SN-1', item: { name: 'Laptop' } },
      store: { name: 'Central Store', organizationId: 'org-1' }, disposedBy: { fullName: 'Admin' },
      request: { requester: { fullName: 'Store Manager' } },
    }) } };
    const access = { hasScopeAccess: jest.fn().mockResolvedValue(true) };
    const result = await new DisposalService(prisma as any, access as any).getCertificate('disposal-1', { id: 'user-1' } as any);
    expect(result.filename).toBe('DSP-ABC12345.pdf');
    expect(result.buffer.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(result.buffer.toString()).toContain('AMU-001');
  });
});
