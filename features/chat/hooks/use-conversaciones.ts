import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import {
  getConversaciones,
  getMensajes,
  enviarMensaje,
  marcarLeidos,
  tomarOportunidad,
} from '../services/chat.service';
import type { ConversacionFilters, EnviarMensajeInput } from '../types';

export function useConversaciones(filters: ConversacionFilters = {}) {
  return useQuery({
    queryKey:       [...QUERY_KEYS.conversaciones, filters],
    queryFn:        () => getConversaciones(filters),
    staleTime:      1000 * 30,
    refetchInterval: 1000 * 30,
  });
}

export function useMensajes(conversacionId: string | null) {
  return useQuery({
    queryKey:        [...QUERY_KEYS.mensajes, conversacionId],
    queryFn:         () => getMensajes(conversacionId!),
    enabled:         !!conversacionId,
    staleTime:       1000 * 15,
    refetchInterval: 1000 * 15,
  });
}

export function useEnviarMensaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EnviarMensajeInput) => enviarMensaje(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEYS.mensajes, variables.conversacionId] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.conversaciones });
    },
  });
}

export function useMarcarLeidos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversacionId: string) => marcarLeidos(conversacionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.conversaciones }); },
  });
}

export function useTomarOportunidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversacionId: string) => tomarOportunidad(conversacionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.conversaciones }); },
  });
}
