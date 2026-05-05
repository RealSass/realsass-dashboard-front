import type { PaginationMeta } from '@/types/api';

export type EstadoTransaccion = 'completado' | 'pendiente' | 'fallido' | 'reembolsado';

export interface Transaccion {
  id: string;
  monto: number;
  moneda: string;
  estado: EstadoTransaccion;
  proveedor: string;
  descripcion?: string;
  referencia?: string;
  createdAt: string;
  updatedAt: string;
  organizacionId?: string;
}

export interface BalanceSummary {
  totalIngresos: number;
  totalPendiente: number;
  totalFallido: number;
  transaccionesHoy: number;
  moneda: string;
}

export interface PaginatedTransacciones {
  items: Transaccion[];
  meta: PaginationMeta;
}

export interface TransaccionFilters {
  estado?: EstadoTransaccion;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}
