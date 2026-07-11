// features/store/types.ts
// Tipos del módulo Tienda (real-ecommerce-back). Ajustar si el contrato real difiere.

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  priceMinor: number;
  currency: string;
  quantityAvailable: number;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  slug: string;
  isActive: boolean;
  categoryId?: string | null;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
  variants: Array<{
    sku: string;
    name: string;
    priceMinor: number;
    currency: string;
    quantityAvailable: number;
  }>;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export type OrderStatus =
  | 'PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface Order {
  id: string;
  organizationId: string;
  customerId: string;
  customerEmail?: string | null;
  status: OrderStatus;
  totalMinor: number;
  currency: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
