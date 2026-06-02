// features/zonas/types.ts
import type { PaginationMeta } from '@/types/api';

export interface Zona {
  id:             string;
  nombre:         string;
  ciudad:         string | null;
  provincia:      string | null;
  descripcion:    string | null;
  isActive:       boolean;
  organizationId: string;
  createdAt:      string;
  updatedAt:      string;
  _count?: { propiedades: number };
}

export interface CreateZonaInput {
  nombre:      string;
  ciudad?:     string;
  provincia?:  string;
  descripcion?: string;
}

export type UpdateZonaInput = Partial<CreateZonaInput>;
