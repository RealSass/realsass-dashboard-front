import type { PaginationMeta } from '@/types/api';

export interface AccesorioColor {
  id: string;
  color: string;
}

export interface AccesorioImagen {
  id: string;
  url: string;
  orden: number;
}

export interface Accesorio {
  id: string;
  nombre: string;
  modelo: string;
  tipo: string;
  descripcion?: string;
  cantidad: number;
  isActive: boolean;
  puntoDeVentaId: string;
  colores: AccesorioColor[];
  imagenes: AccesorioImagen[];
}

export interface AccesorioInput {
  nombre: string;
  modelo: string;
  tipo: string;
  descripcion?: string;
  cantidad: number;
  puntoDeVentaId: string;
  colores: string[];
  imagenes: string[];
}

export interface AccesorioFilters {
  puntoDeVentaId?: string;
  tipo?: string;
  nombre?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAccesorios {
  items: Accesorio[];
  meta: PaginationMeta;
}

// ─── Sub-accesorios ───────────────────────────────────────────────────────────

export interface SubAccesorio {
  id: string;
  nombre: string;
  tipo: string;
  descripcion?: string;
  cantidad: number;
  isActive: boolean;
  puntoDeVentaId: string;
  colores: AccesorioColor[];
  imagenes: AccesorioImagen[];
}

export interface SubAccesorioInput {
  nombre: string;
  tipo: string;
  descripcion?: string;
  cantidad: number;
  puntoDeVentaId: string;
  colores: string[];
  imagenes: string[];
}

export interface SubAccesorioFilters {
  puntoDeVentaId?: string;
  tipo?: string;
  nombre?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedSubAccesorios {
  items: SubAccesorio[];
  meta: PaginationMeta;
}
