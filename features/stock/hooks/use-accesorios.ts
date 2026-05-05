import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import {
  getAccesorios,
  createAccesorio,
  updateAccesorio,
  deleteAccesorio,
} from '../services/stock.service';
import type { AccesorioFilters, AccesorioInput } from '../types';

export function useAccesorios(filters: AccesorioFilters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.accesorios, filters],
    queryFn:  () => getAccesorios(filters),
    staleTime: 1000 * 60,
  });
}

export function useCreateAccesorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AccesorioInput) => createAccesorio(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.accesorios }); },
  });
}

export function useUpdateAccesorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccesorioInput> }) =>
      updateAccesorio(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.accesorios }); },
  });
}

export function useDeleteAccesorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccesorio(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.accesorios }); },
  });
}
