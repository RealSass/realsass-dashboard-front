// features/propiedades/types.ts
import type { PaginationMeta } from '@/types/api';

export type TipoPropiedad   = 'CASA' | 'DEPARTAMENTO' | 'TERRENO' | 'LOCAL' | 'OFICINA' | 'GALPON' | 'CAMPO';
export type TipoOperacion   = 'VENTA' | 'ALQUILER' | 'ALQUILER_TEMP';
export type EstadoPropiedad = 'DISPONIBLE' | 'RESERVADA' | 'VENDIDA' | 'ALQUILADA' | 'PAUSADA';

export const TIPO_LABELS: Record<TipoPropiedad, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Departamento', TERRENO: 'Terreno',
  LOCAL: 'Local', OFICINA: 'Oficina', GALPON: 'Galpón', CAMPO: 'Campo',
};

export const OPERACION_LABELS: Record<TipoOperacion, string> = {
  VENTA: 'Venta', ALQUILER: 'Alquiler', ALQUILER_TEMP: 'Alquiler Temporal',
};

export const ESTADO_LABELS: Record<EstadoPropiedad, string> = {
  DISPONIBLE: 'Disponible', RESERVADA: 'Reservada', VENDIDA: 'Vendida',
  ALQUILADA: 'Alquilada', PAUSADA: 'Pausada',
};

export const ESTADO_COLORS: Record<EstadoPropiedad, { bg: string; color: string; border: string }> = {
  DISPONIBLE: { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)'  },
  RESERVADA:  { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  VENDIDA:    { bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
  ALQUILADA:  { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  PAUSADA:    { bg: 'rgba(120,120,120,0.12)',color: '#a1a1aa', border: 'rgba(120,120,120,0.3)'},
};

export interface PropiedadImagen {
  id:  string;
  url: string;
  orden: number;
  alt?: string | null;
}

export interface Propiedad {
  id:             string;
  titulo:         string;
  descripcion:    string | null;
  tipo:           TipoPropiedad;
  operacion:      TipoOperacion;
  precio:         string;
  moneda:         string;
  superficie:     string | null;
  ambientes:      number | null;
  banos:          number | null;
  dormitorios:    number | null;
  direccion:      string | null;
  estado:         EstadoPropiedad;
  destacada:      boolean;
  isActive:       boolean;
  organizationId: string;
  zonaId:         string | null;
  zona:           { id: string; nombre: string; ciudad?: string | null } | null;
  imagenes:       PropiedadImagen[];
  createdAt:      string;
  updatedAt:      string;
}

export interface CreatePropiedadInput {
  titulo:      string;
  tipo:        TipoPropiedad;
  operacion:   TipoOperacion;
  precio:      number;
  descripcion?: string;
  moneda?:     string;
  superficie?: number;
  ambientes?:  number;
  banos?:      number;
  dormitorios?: number;
  direccion?:  string;
  estado?:     EstadoPropiedad;
  destacada?:  boolean;
  zonaId?:     string;
  imagenes?:   string[];
}

export type UpdatePropiedadInput = Partial<CreatePropiedadInput>;

export interface PropiedadFilters {
  tipo?:       TipoPropiedad;
  operacion?:  TipoOperacion;
  estado?:     EstadoPropiedad;
  zonaId?:     string;
  precioMin?:  number;
  precioMax?:  number;
  buscar?:     string;
  page?:       number;
  limit?:      number;
}

export interface PaginatedPropiedades {
  data: Propiedad[];
  meta: PaginationMeta;
}
