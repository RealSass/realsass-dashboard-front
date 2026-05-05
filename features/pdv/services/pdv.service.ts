import { apiClient } from '@/lib/api-client';
import type { PuntoDeVenta, PuntoDeVentaInput } from '../types';

export const getPdvList = (): Promise<PuntoDeVenta[]> =>
  apiClient.get('dashboard', '/pdv');

export const getPdv = (id: string): Promise<PuntoDeVenta> =>
  apiClient.get('dashboard', `/pdv/${id}`);

export const createPdv = (data: PuntoDeVentaInput): Promise<PuntoDeVenta> =>
  apiClient.post('dashboard', '/pdv', data);

export const updatePdv = (id: string, data: Partial<PuntoDeVentaInput>): Promise<PuntoDeVenta> =>
  apiClient.patch('dashboard', `/pdv/${id}`, data);

export const deletePdv = (id: string): Promise<{ message: string }> =>
  apiClient.delete('dashboard', `/pdv/${id}`);
