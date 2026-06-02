import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getQuotas, updateQuotaLimit } from '../services/quotas.service';

export function useQuotas(orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configQuotas, orgId],
    queryFn:  () => getQuotas(orgId!),
    enabled:  !!orgId,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });
}

export function useUpdateQuotaLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ resource, limit, orgId }: { resource: string; limit: number; orgId: string }) =>
      updateQuotaLimit(resource, limit, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configQuotas }),
  });
}
