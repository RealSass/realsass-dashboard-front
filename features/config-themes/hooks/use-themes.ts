import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getThemes, createTheme, activateTheme, deleteTheme } from '../services/themes.service';
import type { CreateThemeInput } from '@/features/config/types';

export function useThemes(orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configThemes, orgId],
    queryFn:  () => getThemes(orgId!),
    enabled:  !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, orgId }: { data: CreateThemeInput; orgId: string }) =>
      createTheme(data, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configThemes }),
  });
}

export function useActivateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      activateTheme(id, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configThemes }),
  });
}

export function useDeleteTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      deleteTheme(id, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configThemes }),
  });
}
