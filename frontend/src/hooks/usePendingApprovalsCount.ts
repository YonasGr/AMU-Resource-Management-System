import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function usePendingApprovalsCount() {
  const { data } = useQuery({
    queryKey: ['my-pending-approvals-count'],
    queryFn: async () => {
      const res = await api.get('/workflows/my-pending-approvals');
      return res.data.data.length as number;
    },
    refetchInterval: 30_000,
  });
  return data ?? 0;
}
