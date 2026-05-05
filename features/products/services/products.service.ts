import { apiClient, buildQuery } from '@/lib/api-client';
import type { Producto, ProductoInput, ProductFilters, PaginatedProducts } from '../types';

export const productsService = {
  getAll: (filters: ProductFilters = {}) =>
    apiClient.get<PaginatedProducts>('dashboard', `/products${buildQuery(filters as Record<string, unknown>)}`),

  create: (data: ProductoInput) =>
    apiClient.post<Producto>('dashboard', '/products', data),

  update: (id: string, data: Partial<ProductoInput>) =>
    apiClient.patch<Producto>('dashboard', `/products/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ message: string }>('dashboard', `/products/${id}`),
};
