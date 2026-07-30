import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

interface OrgUnit {
  id: string;
  name: string;
  type: string;
}

/** Self + ancestor chain, root-first — the breadcrumb shown in the top bar. */
export function useMyOrgPath() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useQuery({
    queryKey: ['my-org-path', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const [selfRes, ancestorsRes] = await Promise.all([
        api.get<{ data: OrgUnit }>(`/organization-units/${organizationId}`),
        api.get<{ data: OrgUnit[] }>(`/organization-units/${organizationId}/ancestors`),
      ]);
      const ancestors = ancestorsRes.data.data; // immediate parent first
      return [...ancestors].reverse().concat(selfRes.data.data); // root-first
    },
  });
}
