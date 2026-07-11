// features/store/hooks.ts
// TanStack Query hooks del módulo Tienda.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from './api';
import type { ProductInput, ProductFilters, OrderFilters } from './types';

const KEYS = {
  products: (orgId: string, filters: ProductFilters) => ['store', 'products', orgId, filters] as const,
  product: (orgId: string, id: string) => ['store', 'product', orgId, id] as const,
  orders: (orgId: string, filters: OrderFilters) => ['store', 'orders', orgId, filters] as const,
  order: (orgId: string, id: string) => ['store', 'order', orgId, id] as const,
};

export function useProducts(orgId: string | undefined, filters: ProductFilters = {}) {
  return useQuery({
    queryKey: KEYS.products(orgId ?? '', filters),
    queryFn: () => storeApi.getProducts(orgId as string, filters),
    enabled: !!orgId,
  });
}

export function useProduct(orgId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: KEYS.product(orgId ?? '', id ?? ''),
    queryFn: () => storeApi.getProduct(orgId as string, id as string),
    enabled: !!orgId && !!id,
  });
}

export function useCreateProduct(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) => storeApi.createProduct(orgId as string, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store', 'products', orgId] }),
  });
}

export function useUpdateProduct(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductInput> }) =>
      storeApi.updateProduct(orgId as string, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store', 'products', orgId] }),
  });
}

export function useDeleteProduct(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storeApi.deleteProduct(orgId as string, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store', 'products', orgId] }),
  });
}

export function useUpdateInventory(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, quantityAvailable }: { variantId: string; quantityAvailable: number }) =>
      storeApi.updateInventory(orgId as string, variantId, quantityAvailable),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store', 'products', orgId] }),
  });
}

export function useOrders(orgId: string | undefined, filters: OrderFilters = {}) {
  return useQuery({
    queryKey: KEYS.orders(orgId ?? '', filters),
    queryFn: () => storeApi.getOrders(orgId as string, filters),
    enabled: !!orgId,
  });
}

export function useOrder(orgId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: KEYS.order(orgId ?? '', id ?? ''),
    queryFn: () => storeApi.getOrder(orgId as string, id as string),
    enabled: !!orgId && !!id,
  });
}
