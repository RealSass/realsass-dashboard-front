/**
 * features/config-themes/hooks.ts
 *
 * useThemes(orgId)      → trpc.configThemes.list
 * useCreateTheme()      → trpc.configThemes.update  (crear via update con themeId nuevo)
 * useActivateTheme()    → trpc.configThemes.activate
 * useDeleteTheme()      → no existe en el router tRPC aún (REST legacy temporalmente)
 *
 * NOTA: useDeleteTheme se mantiene como stub hasta que el router
 * del backend exponga configThemes.delete.
 */
import { trpc } from '@/lib/trpc/client';

export function useThemes(organizationId: string | null | undefined) {
  return trpc.configThemes.list.useQuery(
    undefined,
    { enabled: !!organizationId },
  );
}

export function useActivateTheme() {
  const utils = trpc.useUtils();
  return trpc.configThemes.activate.useMutation({
    onSuccess: () => void utils.configThemes.list.invalidate(),
  });
}

export function useCreateTheme() {
  const utils = trpc.useUtils();
  return trpc.configThemes.update.useMutation({
    onSuccess: () => void utils.configThemes.list.invalidate(),
  });
}

/**
 * Stub temporal — configThemes.delete no está en el router aún.
 * Cuando se agregue en el Sprint A del backend, reemplazar el fetch
 * manual por trpc.configThemes.delete.useMutation().
 */
export function useDeleteTheme() {
  const utils = trpc.useUtils();
  // TODO: reemplazar por trpc.configThemes.delete.useMutation() cuando exista
  return {
    mutateAsync: async (_themeId: string) => {
      throw new Error('useDeleteTheme: procedure delete no implementado en el router aún');
    },
    isPending: false,
  };
}
