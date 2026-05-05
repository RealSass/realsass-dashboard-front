import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getBalance, getTransacciones } from '../services/pagos.service';
import type { TransaccionFilters } from '../types';

export function useBalanceSummary() {
  return useQuery({
    queryKey:  QUERY_KEYS.balance,
    queryFn:   getBalance,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTransacciones(filters: TransaccionFilters = {}) {
  return useQuery({
    queryKey:  [...QUERY_KEYS.transacciones, filters],
    queryFn:   () => getTransacciones(filters),
    staleTime: 1000 * 60,
  });
}
