export type ProductCategory = 'iPhone' | 'iPad' | 'Mac' | 'Watch' | 'AirPods' | 'Accesorios';

export interface Producto {
  id: string;
  modelo: string;
  categoria: ProductCategory;
  memoria: string;
  color: string;
  precio: string;
  bateria: number | null;
  usado: boolean;
  stock: number;
  isActive: boolean;
}

export interface ProductoInput {
  modelo: string;
  categoria: ProductCategory;
  memoria: string;
  color: string;
  precio: number;
  bateria?: number | null;
  usado: boolean;
  stock: number;
}

export interface ProductFilters {
  categoria?: ProductCategory;
  usado?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  items: Producto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
