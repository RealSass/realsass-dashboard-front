import type { PaginationMeta } from '@/types/api';

export type Canal = 'whatsapp' | 'instagram' | 'telegram' | 'web';
export type EtapaCliente = 'prospecto' | 'oportunidad' | 'post_venta' | 'recompra' | 'inactivo';

export interface Cliente {
  id: string;
  nombre: string;
  canal: Canal;
  etapa: EtapaCliente;
  avatar?: string;
  telefono?: string;
  ultimaInteraccion: string;
  preferencias: string[];
  historialCompras: { producto: string; fecha: string; monto: number }[];
  organizacionId?: string;
}

export interface Mensaje {
  id: string;
  clienteId: string;
  conversacionId: string;
  contenido: string;
  origen: 'cliente' | 'agente' | 'bot';
  timestamp: string;
  leido: boolean;
}

export interface Conversacion {
  id: string;
  cliente: Cliente;
  ultimoMensaje?: Mensaje;
  noLeidos: number;
  oportunidadDetectada: boolean;
  updatedAt: string;
}

export interface PaginatedConversaciones {
  items: Conversacion[];
  meta: PaginationMeta;
}

export interface PaginatedMensajes {
  items: Mensaje[];
  meta: PaginationMeta;
}

export interface ConversacionFilters {
  canal?: Canal;
  etapa?: EtapaCliente;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EnviarMensajeInput {
  conversacionId: string;
  contenido: string;
}
