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
