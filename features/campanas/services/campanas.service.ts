import { apiClient, buildQuery } from '@/lib/api-client';
import type { MetricasCampana, PaginatedCampanas, CampanaFilters } from '../types';

export const getCampanas = (filters: CampanaFilters = {}): Promise<PaginatedCampanas> =>
  apiClient.get('campanas', `/campanas${buildQuery(filters as Record<string, unknown>)}`);

export const getMetricasCampana = (campanaId: string): Promise<MetricasCampana> =>
  apiClient.get('campanas', `/campanas/${campanaId}/metricas`);
