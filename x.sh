#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-.}"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${YELLOW}[i]${NC} $1"; }
ok()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn(){ echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

cd "$APP_DIR"
[ -f "package.json" ] || err "No se encontró package.json. Corré este script desde la raíz de real-dashboard-front."
[ -d "features" ] || err "No se encontró la carpeta features/. ¿Estás seguro que esto es real-dashboard-front?"

# =============================================================================
# 1. features/store/types.ts
# =============================================================================
log "Creando features/store/types.ts..."
mkdir -p features/store
cat > features/store/types.ts << 'EOF'
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
EOF
ok "features/store/types.ts creado"

# =============================================================================
# 2. features/store/api.ts
# =============================================================================
log "Creando features/store/api.ts..."
cat > features/store/api.ts << 'EOF'
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
EOF
ok "features/store/api.ts creado"

# =============================================================================
# 3. features/store/hooks.ts
# =============================================================================
log "Creando features/store/hooks.ts..."
cat > features/store/hooks.ts << 'EOF'
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
EOF
ok "features/store/hooks.ts creado"

# =============================================================================
# 4. app/dashboard/tienda/layout.tsx — tabs (mismo patrón que configuracion/layout.tsx)
# =============================================================================
log "Creando app/dashboard/tienda/layout.tsx..."
mkdir -p app/dashboard/tienda/productos app/dashboard/tienda/pedidos app/dashboard/tienda/preview
cat > app/dashboard/tienda/layout.tsx << 'EOF'
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, ClipboardList, Eye, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIENDA_TABS = [
  { name: 'Productos',    href: '/dashboard/tienda/productos', Icon: Package       },
  { name: 'Pedidos',      href: '/dashboard/tienda/pedidos',    Icon: ClipboardList },
  { name: 'Vista previa', href: '/dashboard/tienda/preview',    Icon: Eye           },
] as const;

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Tienda</h1>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TIENDA_TABS.map(({ name, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors',
                active
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {name}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
EOF
ok "app/dashboard/tienda/layout.tsx creado"

# =============================================================================
# 5. app/dashboard/tienda/productos/page.tsx
# =============================================================================
log "Creando app/dashboard/tienda/productos/page.tsx..."
cat > app/dashboard/tienda/productos/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { Loader2, Plus, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useProducts, useDeleteProduct } from '@/features/store/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function ProductosPage() {
  const { organizationId } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useProducts(organizationId, { search, page, limit: 20 });
  const deleteProduct = useDeleteProduct(organizationId);

  const items = data?.items ?? [];
  const meta = data?.meta;

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Producto eliminado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm p-4">
        <AlertCircle className="h-4 w-4" />
        {error instanceof Error ? error.message : 'Error al cargar productos'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <Button size="sm" className="ml-auto gap-1.5">
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          Sin productos todavía.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Variantes</TableHead>
                <TableHead>Stock total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.variants.length}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.variants.reduce((acc, v) => acc + v.quantityAvailable, 0)}
                  </TableCell>
                  <TableCell>
                    <span className={p.isActive ? 'text-emerald-600 text-xs' : 'text-muted-foreground text-xs'}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages} — {meta.total} productos
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!meta.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
EOF
ok "app/dashboard/tienda/productos/page.tsx creado"

# =============================================================================
# 6. app/dashboard/tienda/pedidos/page.tsx
# =============================================================================
log "Creando app/dashboard/tienda/pedidos/page.tsx..."
cat > app/dashboard/tienda/pedidos/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useOrders } from '@/features/store/hooks';
import type { OrderStatus } from '@/features/store/types';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:   'Pendiente',
  PAID:      'Pagado',
  FULFILLED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED:  'Reembolsado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:   'text-amber-600',
  PAID:      'text-blue-600',
  FULFILLED: 'text-emerald-600',
  CANCELLED: 'text-muted-foreground',
  REFUNDED:  'text-destructive',
};

function formatCurrency(minor: number, currency: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(minor / 100);
}

export default function PedidosPage() {
  const { organizationId } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useOrders(organizationId, { page, limit: 20 });
  const items = data?.items ?? [];
  const meta = data?.meta;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm p-4">
        <AlertCircle className="h-4 w-4" />
        {error instanceof Error ? error.message : 'Error al cargar pedidos'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          Sin pedidos todavía.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">{o.customerEmail ?? '—'}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(o.totalMinor, o.currency)}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('es-AR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages} — {meta.total} pedidos
          </p>
        </div>
      )}
    </div>
  );
}
EOF
ok "app/dashboard/tienda/pedidos/page.tsx creado"

# =============================================================================
# 7. app/dashboard/tienda/preview/page.tsx
# =============================================================================
log "Creando app/dashboard/tienda/preview/page.tsx..."
cat > app/dashboard/tienda/preview/page.tsx << 'EOF'
'use client';

import { ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';

export default function PreviewPage() {
  const { activeOrg } = useAuth();
  const storeFrontUrl = process.env.NEXT_PUBLIC_STORE_FRONT_URL;

  if (!storeFrontUrl) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
        <AlertTriangle className="h-4 w-4" />
        NEXT_PUBLIC_STORE_FRONT_URL no está configurado.
      </div>
    );
  }

  const previewUrl = `${storeFrontUrl}${activeOrg?.slug ? `?org=${activeOrg.slug}` : ''}`;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
            Abrir en nueva pestaña
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden bg-background" style={{ height: '75vh' }}>
        <iframe
          src={previewUrl}
          className="w-full h-full"
          title="Vista previa de la tienda"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Si la vista previa no carga (algunos navegadores bloquean iframes cross-origin),
        usá "Abrir en nueva pestaña".
      </p>
    </div>
  );
}
EOF
ok "app/dashboard/tienda/preview/page.tsx creado"

# =============================================================================
# 8. ICON_MAP: agregar 'Store' en dashboard-sidebar.tsx y mobile-header.tsx
# =============================================================================
log "Agregando 'Store' al ICON_MAP en dashboard-sidebar.tsx y mobile-header.tsx..."

ICON_MAP_OLD="Building2, MapPin, MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,"
ICON_MAP_NEW="Building2, MapPin, MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2, Store,"

for f in "components/layout/dashboard-sidebar.tsx" "components/layout/mobile-header.tsx"; do
  if [ -f "$f" ]; then
    if grep -qzF "$ICON_MAP_OLD" "$f" 2>/dev/null || perl -0777 -ne 'exit(index($_, $ARGV[0])==-1)' "$f" "$ICON_MAP_OLD" 2>/dev/null; then
      node -e "
        const fs = require('fs');
        const path = '$f';
        let src = fs.readFileSync(path, 'utf8');
        const old = \`$ICON_MAP_OLD\`;
        const neu = \`$ICON_MAP_NEW\`;
        if (src.includes(old) && !src.includes('Store,')) {
          src = src.replace(old, neu);
          fs.writeFileSync(path, src);
          console.log('  patched: $f');
        } else if (src.includes('Store,')) {
          console.log('  ya tenía Store: $f');
        } else {
          console.log('  NO_MATCH: $f');
        }
      "
    else
      warn "$f no tiene el patrón exacto de ICON_MAP esperado — agregá 'Store' manualmente al import de lucide-react y al ICON_MAP."
    fi
  else
    warn "$f no encontrado, saltando."
  fi
done

# =============================================================================
# 9. .env.local.example — nuevas vars
# =============================================================================
if [ -f ".env.local.example" ]; then
  if ! grep -q "NEXT_PUBLIC_ECOMMERCE_API_URL" .env.local.example; then
    log "Agregando vars de Tienda a .env.local.example..."
    cat >> .env.local.example << 'EOF'

# ─── Tienda (real-ecommerce-back + real-ecommerce-front) ──────────────────────
NEXT_PUBLIC_ECOMMERCE_API_URL=http://localhost:3010/api/v1
NEXT_PUBLIC_STORE_FRONT_URL=http://localhost:3011
EOF
    ok ".env.local.example actualizado"
  else
    ok ".env.local.example ya tenía las vars de Tienda"
  fi
else
  warn ".env.local.example no encontrado — agregá manualmente NEXT_PUBLIC_ECOMMERCE_API_URL y NEXT_PUBLIC_STORE_FRONT_URL"
fi

# =============================================================================
# RESUMEN + instrucción manual para config/navigation.ts
# =============================================================================
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Módulo Tienda scaffoldeado${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  PASO MANUAL REQUERIDO — config/navigation.ts:${NC}"
echo "   No edité este archivo porque no conozco su forma exacta."
echo "   Agregá una entrada así (ajustando al shape real del array NAV_GROUPS):"
echo ""
echo '   { name: '"'"'Tienda'"'"', href: '"'"'/dashboard/tienda'"'"', icon: '"'"'Store'"'"', active: true }'
echo ""
echo "   Y agregá 'Store' al import de lucide-react en ese mismo archivo si"
echo "   NAV_GROUPS referencia los íconos directamente ahí en vez de por string."
echo ""
echo -e "${YELLOW}⚠️  Confirmá el contrato REST:${NC}"
echo "   features/store/api.ts asume rutas /products, /orders, /inventory."
echo "   Si tus controllers reales en real-ecommerce-back difieren, pegámelos"
echo "   y ajusto ese único archivo."
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "   1. cp .env.local.example .env.local  (si no lo tenías)"
echo "   2. Completar NEXT_PUBLIC_ECOMMERCE_API_URL y NEXT_PUBLIC_STORE_FRONT_URL"
echo "   3. Agregar la entrada de navegación (ver arriba)"
echo "   4. pnpm dev"