import { api } from './api';

export type OfflineOperationStatus = 'queued' | 'sending' | 'confirmed' | 'conflict' | 'failed';

export interface OfflineOperation {
  id: string;
  endpoint: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: OfflineOperationStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

const DB_NAME = 'amu-inventory-sync';
const STORE_NAME = 'operations';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline queue'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = work(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error('Offline queue operation failed'));
  });
}

export async function listOfflineOperations(): Promise<OfflineOperation[]> {
  const operations = await withStore<OfflineOperation[]>('readonly', (store) => store.getAll());
  return operations.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function enqueueOfflineOperation(
  endpoint: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
): Promise<OfflineOperation> {
  const now = new Date().toISOString();
  const operation: OfflineOperation = {
    id: crypto.randomUUID(),
    endpoint,
    payload,
    idempotencyKey,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  };
  await withStore('readwrite', (store) => store.put(operation));
  return operation;
}

export async function updateOfflineOperation(operation: OfflineOperation): Promise<void> {
  await withStore('readwrite', (store) => store.put(operation));
}

export async function removeOfflineOperation(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function replayOfflineOperations(): Promise<void> {
  const operations = await listOfflineOperations();
  for (const operation of operations) {
    if (operation.status === 'confirmed') {
      await removeOfflineOperation(operation.id);
      continue;
    }
    const sending = { ...operation, status: 'sending' as const, updatedAt: new Date().toISOString() };
    await updateOfflineOperation(sending);
    try {
      await api.post(operation.endpoint, operation.payload);
      await removeOfflineOperation(operation.id);
    } catch (error: any) {
      const status = error.response?.status;
      const nextStatus: OfflineOperationStatus = status === 409 ? 'conflict' : 'failed';
      await updateOfflineOperation({
        ...sending,
        status: nextStatus,
        error: error.response?.data?.message || error.message || 'Replay failed',
        updatedAt: new Date().toISOString(),
      });
      if (!status || status >= 500) break;
    }
  }
}
