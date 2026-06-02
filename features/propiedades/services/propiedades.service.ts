// features/propiedades/services/propiedades.service.ts
import { apiClient, buildQuery } from '@/lib/api-client';
import type {
  Propiedad, CreatePropiedadInput, UpdatePropiedadInput,
  PropiedadFilters, PaginatedPropiedades,
} from '../types';

const BASE = '/propiedades';

export const getPropiedades = (
  filters: PropiedadFilters = {},
  organizationId: string,
): Promise<PaginatedPropiedades> =>
  apiClient.get('dashboard', `${BASE}${buildQuery(filters as Record<string, unknown>)}`, organizationId);

export const getPropiedad = (id: string, organizationId: string): Promise<Propiedad> =>
  apiClient.get('dashboard', `${BASE}/${id}`, organizationId);

export const createPropiedad = (
  data: CreatePropiedadInput,
  organizationId: string,
): Promise<Propiedad> =>
  apiClient.post('dashboard', BASE, data, organizationId);

export const updatePropiedad = (
  id: string,
  data: UpdatePropiedadInput,
  organizationId: string,
): Promise<Propiedad> =>
  apiClient.patch('dashboard', `${BASE}/${id}`, data, organizationId);

export const deletePropiedad = (
  id: string,
  organizationId: string,
): Promise<{ success: boolean; message: string }> =>
  apiClient.delete('dashboard', `${BASE}/${id}`, organizationId);
