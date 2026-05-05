import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import {
  getSubAccesorios,
  createSubAccesorio,
  updateSubAccesorio,
  deleteSubAccesorio,
} from '../services/stock.service';
import type { SubAccesorioFilters, SubAccesorioInput } from '../types';

export function useSubAccesorios(filters: SubAccesorioFilters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.subAccesorios, filters],
    queryFn:  () => getSubAccesorios(filters),
    staleTime: 1000 * 60,
  });
}

export function useCreateSubAccesorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubAccesorioInput) => createSubAccesorio(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.subAccesorios }); },
  });
}

export function useUpdateSubAccesorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubAccesorioInput> }) =>
      updateSubAccesorio(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.subAccesorios }); },
  });
}

export function useDeleteSubAccesorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubAccesorio(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.subAccesorios }); },
  });
}
