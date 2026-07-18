/**
 * features/config-flags/hooks.ts
 *
 * Hooks de feature flags via tRPC.
 * API pública idéntica a la versión anterior — las páginas no cambian.
 *
 * useFlags(orgId)     → trpc.configFlags.list
 * useUpdateFlag()     → trpc.configFlags.update (con optimistic update)
 */
import { trpc } from '@/lib/trpc/client';

export function useFlags(organizationId: string | null | undefined) {
  return trpc.configFlags.list.useQuery(
    undefined,
    {
      enabled:         !!organizationId,
      staleTime:       30_000,
      refetchInterval: 60_000,
    },
  );
}

export function useUpdateFlag() {
  const utils = trpc.useUtils();

  return trpc.configFlags.update.useMutation({
    // Optimistic update: el Switch cambia visualmente antes de que responda el server
    onMutate: async (variables) => {
      await utils.configFlags.list.cancel();
      const previous = utils.configFlags.list.getData();

      utils.configFlags.list.setData(undefined, (old: any) => {
        if (!old) return old;
        const list = Array.isArray(old) ? old : old?.data ?? [];
        const updated = list.map((f: any) =>
          f.key === variables.flagId
            ? { ...f, ...(variables.enabled !== undefined && { enabled: variables.enabled }) }
            : f,
        );
        return Array.isArray(old) ? updated : { ...old, data: updated };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        utils.configFlags.list.setData(undefined, context.previous);
      }
    },
    onSettled: () => {
      void utils.configFlags.list.invalidate();
    },
  });
}
