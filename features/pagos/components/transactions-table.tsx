'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  CreditCard, AlertCircle, ChevronLeft, ChevronRight, SlidersHorizontal, X,
} from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/helpers';
import { useTransacciones } from '../hooks';
import { TransactionStatusBadge } from './transaction-status-badge';
import type { EstadoTransaccion, TransaccionFilters } from '../types';

const ESTADOS: EstadoTransaccion[] = ['completado', 'pendiente', 'fallido', 'reembolsado'];
const ESTADO_LABELS: Record<EstadoTransaccion, string> = {
  completado: 'Completado', pendiente: 'Pendiente', fallido: 'Fallido', reembolsado: 'Reembolsado',
};

export function TransactionsTable() {
  const [filters,     setFilters]     = useState<TransaccionFilters>({ page: 1, limit: 20 });
  const [showFilters, setShowFilters] = useState(false);
  const [fechaDesde,  setFechaDesde]  = useState('');
  const [fechaHasta,  setFechaHasta]  = useState('');

  const { data: txData, isLoading, error } = useTransacciones(filters);

  const transacciones  = txData?.items ?? [];
  const meta           = txData?.meta;
  const hasActiveFilters = !!(filters.estado || filters.fechaDesde || filters.fechaHasta);

  const applyDateFilter = () => {
    setFilters((prev) => ({
      ...prev, page: 1,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
    }));
  };

  const clearFilters = () => {
    setFechaDesde(''); setFechaHasta('');
    setFilters({ page: 1, limit: 20 });
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex flex-col gap-3 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Transacciones recientes</h2>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground">
                <X className="h-3 w-3" />Limpiar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className="h-8 gap-2 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" />Filtros
              {hasActiveFilters && (
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold" style={{ background: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}>!</span>
              )}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Estado</label>
              <select
                value={filters.estado ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, estado: e.target.value ? (e.target.value as EstadoTransaccion) : undefined }))}
                className="h-8 text-xs rounded-md bg-secondary border border-border text-foreground px-2 min-w-36"
              >
                <option value="">Todos</option>
                {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Desde</label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-8 text-xs bg-secondary border-border w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Hasta</label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-8 text-xs bg-secondary border-border w-36" />
            </div>
            <Button size="sm" onClick={applyDateFilter} className="h-8 text-xs">Aplicar</Button>
          </div>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">Error al cargar transacciones</p>
        </div>
      ) : isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : transacciones.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sin transacciones</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">ID</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Descripcion</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Proveedor</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">Monto</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transacciones.map((tx) => (
              <TableRow key={tx.id} className="border-border hover:bg-secondary/50">
                <TableCell className="text-xs text-muted-foreground font-mono">{tx.id.slice(0, 8)}...</TableCell>
                <TableCell className="text-sm max-w-48 truncate">{tx.descripcion || tx.referencia || '—'}</TableCell>
                <TableCell className="text-sm capitalize">{tx.proveedor}</TableCell>
                <TableCell><TransactionStatusBadge estado={tx.estado} /></TableCell>
                <TableCell className="text-right font-semibold text-sm">{formatMoney(tx.monto, tx.moneda)}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(tx.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">{meta.total} transacciones — Pagina {meta.page} de {meta.totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={!meta.hasPrevPage} onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={!meta.hasNextPage} onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
