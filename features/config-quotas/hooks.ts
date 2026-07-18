/**
 * features/config-quotas/hooks.ts
 *
 * useQuotas(orgId)       → trpc.configQuotas.list
 * useUpdateQuotaLimit()  → trpc.configQuotas.updateLimit
 */
import { trpc } from '@/lib/trpc/client';

export function useQuotas(organizationId: string | null | undefined) {
  return trpc.configQuotas.list.useQuery(
    undefined,
    {
      enabled:         !!organizationId,
      staleTime:       30_000,
      refetchInterval: 30_000, // se actualiza cada 30s igual que antes
    },
  );
}

export function useUpdateQuotaLimit() {
  const utils = trpc.useUtils();
  return trpc.configQuotas.updateLimit.useMutation({
    onSuccess: () => void utils.configQuotas.list.invalidate(),
  });
}
