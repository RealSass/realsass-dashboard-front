// features/zonas/services/zonas.service.ts
import { apiClient, buildQuery } from '@/lib/api-client';
import type { Zona, CreateZonaInput, UpdateZonaInput } from '../types';

const BASE = '/zonas';

export const getZonas = (organizationId: string): Promise<Zona[]> =>
  apiClient.get('dashboard', BASE, organizationId);

export const getZona = (id: string, organizationId: string): Promise<Zona> =>
  apiClient.get('dashboard', `${BASE}/${id}`, organizationId);

export const createZona = (data: CreateZonaInput, organizationId: string): Promise<Zona> =>
  apiClient.post('dashboard', BASE, data, organizationId);

export const updateZona = (id: string, data: UpdateZonaInput, organizationId: string): Promise<Zona> =>
  apiClient.patch('dashboard', `${BASE}/${id}`, data, organizationId);

export const deleteZona = (id: string, organizationId: string): Promise<{ success: boolean; message: string }> =>
  apiClient.delete('dashboard', `${BASE}/${id}`, organizationId);
