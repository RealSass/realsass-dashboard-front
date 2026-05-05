// ─── Re-exports for backwards compatibility ────────────────────────────────────
export type { Producto, ProductCategory, ProductoInput, ProductFilters, PaginatedProducts } from '@/features/products/types';

// ─── Generic API wrappers ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

// ─── Shared pagination meta ───────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface FilterParams {
  page?: number;
  limit?: number;
}
