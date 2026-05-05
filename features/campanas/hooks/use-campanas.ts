import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getCampanas, getMetricasCampana } from '../services/campanas.service';
import type { CampanaFilters } from '../types';

export function useCampanas(filters: CampanaFilters = {}) {
  return useQuery({
    queryKey:  [...QUERY_KEYS.campanas, filters],
    queryFn:   () => getCampanas(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useMetricasCampana(campanaId: string | null) {
  return useQuery({
    queryKey:  [...QUERY_KEYS.metricasCampana, campanaId],
    queryFn:   () => getMetricasCampana(campanaId!),
    enabled:   !!campanaId,
    staleTime: 1000 * 60 * 2,
  });
}
