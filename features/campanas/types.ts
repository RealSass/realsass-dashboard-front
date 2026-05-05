import type { PaginationMeta } from '@/types/api';

export type PlataformaCampana = 'meta' | 'tiktok' | 'google' | 'youtube';
export type EstadoCampana = 'activa' | 'pausada' | 'finalizada' | 'borrador';

export interface Campana {
  id: string;
  nombre: string;
  plataforma: PlataformaCampana;
  estado: EstadoCampana;
  presupuesto: number;
  presupuestoGastado: number;
  moneda: string;
  fechaInicio: string;
  fechaFin?: string;
  organizacionId?: string;
}

export interface MetricasCampana {
  campanaId: string;
  impresiones: number;
  clics: number;
  ctr: number;
  cpc: number;
  conversiones: number;
  roas: number;
  alcance: number;
  fechaActualizacion: string;
  serie: { fecha: string; impresiones: number; clics: number; gasto: number }[];
}

export interface PaginatedCampanas {
  items: Campana[];
  meta: PaginationMeta;
}

export interface CampanaFilters {
  plataforma?: PlataformaCampana;
  estado?: EstadoCampana;
  page?: number;
  limit?: number;
}
