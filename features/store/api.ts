// features/store/api.ts
// Cliente HTTP del módulo Tienda. Consume real-ecommerce-back.
// Ajustar rutas si tus controllers reales difieren del contrato asumido.

import type {
  Product, ProductInput, ProductFilters,
  Order, OrderFilters, Paginated,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_ECOMMERCE_API_URL ?? '';

function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function storeFetch<T>(
  path: string,
  options: RequestInit = {},
  organizationId?: string,
): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      'NEXT_PUBLIC_ECOMMERCE_API_URL no está configurado. Agregalo a tu .env.local.',
    );
  }

  const token = typeof window !== 'undefined'
    ? await import('@/lib/firebase').then((m) => m.getCurrentUserToken?.()).catch(() => undefined)
    : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(organizationId ? { 'x-organization-id': organizationId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (json as { message?: string })?.message ??
      (json as { error?: string })?.error ??
      `Error ${res.status}`;
    throw new Error(msg);
  }

  return (json as { data?: T })?.data ?? (json as T);
}

// ─── Products ─────────────────────────────────────────────────────────────

export const storeApi = {
  getProducts: (orgId: string, filters: ProductFilters = {}) =>
    storeFetch<Paginated<Product>>(`/products${buildQuery(filters)}`, {}, orgId),

  getProduct: (orgId: string, id: string) =>
    storeFetch<Product>(`/products/${id}`, {}, orgId),

  createProduct: (orgId: string, data: ProductInput) =>
    storeFetch<Product>('/products', { method: 'POST', body: JSON.stringify(data) }, orgId),

  updateProduct: (orgId: string, id: string, data: Partial<ProductInput>) =>
    storeFetch<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, orgId),

  deleteProduct: (orgId: string, id: string) =>
    storeFetch<{ message: string }>(`/products/${id}`, { method: 'DELETE' }, orgId),

  updateInventory: (orgId: string, variantId: string, quantityAvailable: number) =>
    storeFetch<{ message: string }>(
      `/inventory/${variantId}`,
      { method: 'PATCH', body: JSON.stringify({ quantityAvailable }) },
      orgId,
    ),

  // ─── Orders ───────────────────────────────────────────────────────────────

  getOrders: (orgId: string, filters: OrderFilters = {}) =>
    storeFetch<Paginated<Order>>(`/orders${buildQuery(filters)}`, {}, orgId),

  getOrder: (orgId: string, id: string) =>
    storeFetch<Order>(`/orders/${id}`, {}, orgId),
};
