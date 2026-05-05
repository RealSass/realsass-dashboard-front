import { apiClient, buildQuery } from '@/lib/api-client';
import type {
  Accesorio,
  AccesorioInput,
  AccesorioFilters,
  PaginatedAccesorios,
  SubAccesorio,
  SubAccesorioInput,
  SubAccesorioFilters,
  PaginatedSubAccesorios,
} from '../types';

// ─── Accesorios ───────────────────────────────────────────────────────────────

export const getAccesorios = (filters: AccesorioFilters = {}): Promise<PaginatedAccesorios> =>
  apiClient.get('dashboard', `/accesorios${buildQuery(filters as Record<string, unknown>)}`);

export const getAccesorio = (id: string): Promise<Accesorio> =>
  apiClient.get('dashboard', `/accesorios/${id}`);

export const createAccesorio = (data: AccesorioInput): Promise<Accesorio> =>
  apiClient.post('dashboard', '/accesorios', data);

export const updateAccesorio = (id: string, data: Partial<AccesorioInput>): Promise<Accesorio> =>
  apiClient.patch('dashboard', `/accesorios/${id}`, data);

export const deleteAccesorio = (id: string): Promise<{ message: string }> =>
  apiClient.delete('dashboard', `/accesorios/${id}`);

// ─── Sub-accesorios ───────────────────────────────────────────────────────────

export const getSubAccesorios = (filters: SubAccesorioFilters = {}): Promise<PaginatedSubAccesorios> =>
  apiClient.get('dashboard', `/sub-accesorios${buildQuery(filters as Record<string, unknown>)}`);

export const getSubAccesorio = (id: string): Promise<SubAccesorio> =>
  apiClient.get('dashboard', `/sub-accesorios/${id}`);

export const createSubAccesorio = (data: SubAccesorioInput): Promise<SubAccesorio> =>
  apiClient.post('dashboard', '/sub-accesorios', data);

export const updateSubAccesorio = (id: string, data: Partial<SubAccesorioInput>): Promise<SubAccesorio> =>
  apiClient.patch('dashboard', `/sub-accesorios/${id}`, data);

export const deleteSubAccesorio = (id: string): Promise<{ message: string }> =>
  apiClient.delete('dashboard', `/sub-accesorios/${id}`);
