import { apiClient, buildQuery } from '@/lib/api-client';
import type { BalanceSummary, PaginatedTransacciones, TransaccionFilters } from '../types';

export const getBalance = (): Promise<BalanceSummary> =>
  apiClient.get('pagos', '/balance');

export const getTransacciones = (filters: TransaccionFilters = {}): Promise<PaginatedTransacciones> =>
  apiClient.get('pagos', `/transacciones${buildQuery(filters as Record<string, unknown>)}`);
