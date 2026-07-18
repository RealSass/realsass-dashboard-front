// features/store/api.ts
// Consume real-ecommerce-back vía ecommerceFetch.
// Las rutas están prefijadas con /api/v1 dentro de NEXT_PUBLIC_ECOMMERCE_API_URL.

import { ecommerceFetch, buildQuery } from '@/lib/api-client';
import type {
  Product, ProductInput, ProductFilters,
  Order, OrderFilters, Paginated,
} from './types';

export const storeApi = {
  // ─── Catálogo (admin) ───────────────────────────────────────────────────────
  getProducts: (orgId: string, filters: ProductFilters = {}) =>
    ecommerceFetch.get<Paginated<Product>>(
      `/ecommerce/catalog/admin${buildQuery(filters as Record<string, unknown>)}`,
      orgId,
    ),

  getProduct: (orgId: string, id: string) =>
    ecommerceFetch.get<Product>(`/ecommerce/catalog/admin/${id}`, orgId),

  createProduct: (orgId: string, data: ProductInput) =>
    ecommerceFetch.post<Product>('/ecommerce/catalog/admin', data, orgId),

  updateProduct: (orgId: string, id: string, data: Partial<ProductInput>) =>
    ecommerceFetch.patch<Product>(`/ecommerce/catalog/admin/${id}`, data, orgId),

  deleteProduct: (orgId: string, id: string) =>
    ecommerceFetch.delete<{ message: string }>(`/ecommerce/catalog/admin/${id}`, orgId),

  // ─── Inventario ─────────────────────────────────────────────────────────────
  updateInventory: (orgId: string, variantId: string, quantityAvailable: number) =>
    ecommerceFetch.patch<{ message: string }>(
      `/ecommerce/inventory/${variantId}`,
      { quantityAvailable },
      orgId,
    ),

  // ─── Pedidos ────────────────────────────────────────────────────────────────
  getOrders: (orgId: string, filters: OrderFilters = {}) =>
    ecommerceFetch.get<Paginated<Order>>(
      `/ecommerce/orders${buildQuery(filters as Record<string, unknown>)}`,
      orgId,
    ),

  getOrder: (orgId: string, id: string) =>
    ecommerceFetch.get<Order>(`/ecommerce/orders/${id}`, orgId),
};
