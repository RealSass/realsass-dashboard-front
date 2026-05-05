import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getPdvList, createPdv, updatePdv, deletePdv } from '../services/pdv.service';
import type { PuntoDeVentaInput } from '../types';

export function usePuntosDeVenta() {
  return useQuery({
    queryKey: QUERY_KEYS.pdv,
    queryFn:  getPdvList,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePdv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PuntoDeVentaInput) => createPdv(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.pdv }); },
  });
}

export function useUpdatePdv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PuntoDeVentaInput> }) =>
      updatePdv(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.pdv }); },
  });
}

export function useDeletePdv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePdv(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.pdv }); },
  });
}
