// features/propiedades/hooks/use-propiedades.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import {
  getPropiedades, getPropiedad, createPropiedad, updatePropiedad, deletePropiedad,
} from '../services/propiedades.service';
import type { PropiedadFilters, CreatePropiedadInput, UpdatePropiedadInput } from '../types';

export function usePropiedades(filters: PropiedadFilters = {}, organizationId: string | null) {
  return useQuery({
    queryKey:  [...QUERY_KEYS.propiedades, filters, organizationId],
    queryFn:   () => getPropiedades(filters, organizationId!),
    enabled:   !!organizationId,
    staleTime: 1000 * 30,
  });
}

export function usePropiedad(id: string | null, organizationId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.propiedad, id, organizationId],
    queryFn:  () => getPropiedad(id!, organizationId!),
    enabled:  !!id && !!organizationId,
  });
}

export function useCreatePropiedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, orgId }: { data: CreatePropiedadInput; orgId: string }) =>
      createPropiedad(data, orgId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.propiedades }); },
  });
}

export function useUpdatePropiedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, orgId }: { id: string; data: UpdatePropiedadInput; orgId: string }) =>
      updatePropiedad(id, data, orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.propiedades });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.propiedad });
    },
  });
}

export function useDeletePropiedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      deletePropiedad(id, orgId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.propiedades }); },
  });
}
