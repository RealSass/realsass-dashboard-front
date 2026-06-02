import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getFlags, updateFlag } from '../services/flags.service';
import type { UpdateFlagInput } from '@/features/config/types';

export function useFlags(orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configFlags, orgId],
    queryFn:  () => getFlags(orgId!),
    enabled:  !!orgId,
    staleTime: 1000 * 60,
  });
}

export function useUpdateFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data, orgId }: { key: string; data: UpdateFlagInput; orgId: string }) =>
      updateFlag(key, data, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configFlags }),
  });
}
