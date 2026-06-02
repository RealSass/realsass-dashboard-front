// features/zonas/hooks/use-zonas.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import {
  getZonas, getZona, createZona, updateZona, deleteZona,
} from '../services/zonas.service';
import type { CreateZonaInput, UpdateZonaInput } from '../types';

export function useZonas(organizationId: string | null) {
  return useQuery({
    queryKey:  [...QUERY_KEYS.zonas, organizationId],
    queryFn:   () => getZonas(organizationId!),
    enabled:   !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useZona(id: string | null, organizationId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.zona, id, organizationId],
    queryFn:  () => getZona(id!, organizationId!),
    enabled:  !!id && !!organizationId,
  });
}

export function useCreateZona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, orgId }: { data: CreateZonaInput; orgId: string }) =>
      createZona(data, orgId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.zonas }); },
  });
}

export function useUpdateZona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, orgId }: { id: string; data: UpdateZonaInput; orgId: string }) =>
      updateZona(id, data, orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.zonas });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.zona });
    },
  });
}

export function useDeleteZona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      deleteZona(id, orgId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.zonas }); },
  });
}
