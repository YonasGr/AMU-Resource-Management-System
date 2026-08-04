import { BadRequestException } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';

const user = { id: 'approver-1' } as any;
const step = {
  id: 'step-1', order: 1, name: 'Approval',
  approverResolutionType: 'FIXED_ROLE', roleCode: 'APPROVER',
};

describe('WorkflowEngineService approval concurrency', () => {
  let prisma: any;
  let tx: any;
  let service: WorkflowEngineService;

  beforeEach(() => {
    const instance = {
      id: 'workflow-1', status: 'PENDING', currentStepOrder: 1,
      contextData: {}, workflowTemplate: { steps: [step] },
    };
    tx = {
      workflowInstance: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...instance, status: 'APPROVED' }),
      },
      approvalHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      workflowInstance: { findUnique: jest.fn().mockResolvedValue(instance) },
      $transaction: jest.fn((callback: any) => callback(tx)),
    };
    const access = { userHasRole: jest.fn().mockResolvedValue(true) };
    service = new WorkflowEngineService(prisma, access as any);
  });

  it('claims the pending step before recording approval history', async () => {
    await service.approve('workflow-1', user);

    expect(tx.workflowInstance.updateMany).toHaveBeenCalledWith({
      where: { id: 'workflow-1', status: 'PENDING', currentStepOrder: 1 },
      data: { status: 'APPROVED' },
    });
    expect(tx.approvalHistory.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a stale concurrent approval without writing history', async () => {
    tx.workflowInstance.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.approve('workflow-1', user))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.approvalHistory.create).not.toHaveBeenCalled();
  });
});
