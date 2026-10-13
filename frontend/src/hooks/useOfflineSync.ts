import { useCallback, useEffect, useState } from 'react';
import {
  enqueueOfflineOperation,
  listOfflineOperations,
  replayOfflineOperations,
  type OfflineOperation,
} from '../lib/offlineQueue';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [operations, setOperations] = useState<OfflineOperation[]>([]);

  const refresh = useCallback(async () => {
    setOperations(await listOfflineOperations());
  }, []);

  const replay = useCallback(async () => {
    if (!navigator.onLine) return;
    await replayOfflineOperations();
    await refresh();
    window.dispatchEvent(new CustomEvent('inventory-sync-complete'));
  }, [refresh]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void replay();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    void refresh();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh, replay]);

  const queue = useCallback(async (endpoint: string, payload: Record<string, unknown>, idempotencyKey: string) => {
    const operation = await enqueueOfflineOperation(endpoint, payload, idempotencyKey);
    await refresh();
    return operation;
  }, [refresh]);

  return { isOnline, operations, queue, replay, refresh };
}
