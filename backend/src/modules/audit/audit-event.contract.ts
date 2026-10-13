import { randomUUID } from 'node:crypto';

export type AuditModule = 'INVENTORY' | 'USERS' | 'REQUESTS' | 'PROCUREMENT' | 'SYSTEM';

export type InventoryAuditAction =
  | 'STOCK_IN'
  | 'CREATE_GOODS_RECEIPT'
  | 'INSPECT_GOODS_RECEIPT'
  | 'POST_GOODS_RECEIPT'
  | 'REJECT_GOODS_RECEIPT'
  | 'CREATE_CYCLE_COUNT'
  | 'REQUEST_CYCLE_COUNT_RECOUNT'
  | 'SUBMIT_CYCLE_COUNT'
  | 'APPROVE_CYCLE_COUNT'
  | 'CREATE_RETURN_INSPECTION'
  | 'INSPECT_RETURN'
  | 'POST_RETURN_INSPECTION'
  | 'STOCK_OUT'
  | 'RETURN'
  | 'STOCK_ADJUSTMENT'
  | 'REVERSE_STOCK_OUT'
  | 'CREATE_TRANSFER'
  | 'DISPATCH_TRANSFER'
  | 'RECEIVE_TRANSFER'
  | 'CANCEL_TRANSFER';

export type UserAuditAction = 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER';

export type RequestAuditAction =
  | 'CREATE_REQUEST'
  | 'APPROVE_REQUEST'
  | 'REJECT_REQUEST'
  | 'ISSUE_REQUEST'
  | 'BACKORDER_REQUEST'
  | 'CANCEL_REQUEST'
  | 'HANDOVER_REQUEST'
  | 'CONFIRM_REQUEST';

export type ProcurementAuditAction =
  | 'CREATE_PURCHASE_ORDER'
  | `PURCHASE_ORDER_${'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PARTIALLY_RECEIVED' | 'RECEIVED'}`;

export type SystemAuditAction = 'SYSTEM_CHECK';

export type AuditAction =
  | InventoryAuditAction
  | UserAuditAction
  | RequestAuditAction
  | ProcurementAuditAction
  | SystemAuditAction;

export interface AuditLogOptions {
  actorRole?: string;
  storeId?: string;
  deviceId?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  reversalOfId?: string;
  reason?: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
}

interface AuditEventBase {
  userId: string | null;
  details?: string;
  actorRole?: string;
  storeId?: string;
  deviceId?: string;
  entityType?: string;
  entityId?: string;
  correlationId: string;
  reversalOfId?: string;
  reason?: string;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
}

export type InventoryAuditEvent = AuditEventBase & {
  module: 'INVENTORY';
  action: InventoryAuditAction;
};

export type UserAuditEvent = AuditEventBase & {
  module: 'USERS';
  action: UserAuditAction;
};

export type RequestAuditEvent = AuditEventBase & {
  module: 'REQUESTS';
  action: RequestAuditAction;
};

export type ProcurementAuditEvent = AuditEventBase & {
  module: 'PROCUREMENT';
  action: ProcurementAuditAction;
};

export type SystemAuditEvent = AuditEventBase & {
  module: 'SYSTEM';
  action: SystemAuditAction;
};

export type AuditEvent =
  | InventoryAuditEvent
  | UserAuditEvent
  | RequestAuditEvent
  | ProcurementAuditEvent
  | SystemAuditEvent;

export function createAuditEvent(
  event: Omit<AuditEvent, 'correlationId'> & { correlationId?: string },
): AuditEvent {
  return {
    ...event,
    correlationId: event.correlationId || randomUUID(),
  } as AuditEvent;
}
