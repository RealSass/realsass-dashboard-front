import { apiClient, buildQuery } from '@/lib/api-client';
import type {
  Conversacion,
  Mensaje,
  PaginatedConversaciones,
  PaginatedMensajes,
  ConversacionFilters,
  EnviarMensajeInput,
} from '../types';

export const getConversaciones = (filters: ConversacionFilters = {}): Promise<PaginatedConversaciones> =>
  apiClient.get('chat', `/conversaciones${buildQuery(filters as Record<string, unknown>)}`);

export const getMensajes = (conversacionId: string, page = 1, limit = 50): Promise<PaginatedMensajes> =>
  apiClient.get('chat', `/conversaciones/${conversacionId}/mensajes${buildQuery({ page, limit })}`);

export const enviarMensaje = (input: EnviarMensajeInput): Promise<Mensaje> =>
  apiClient.post('chat', `/conversaciones/${input.conversacionId}/mensajes`, {
    contenido: input.contenido,
  });

export const marcarLeidos = (conversacionId: string): Promise<{ updated: number }> =>
  apiClient.post('chat', `/conversaciones/${conversacionId}/leer`);

export const tomarOportunidad = (conversacionId: string): Promise<Conversacion> =>
  apiClient.post('chat', `/conversaciones/${conversacionId}/oportunidad`);
