'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  TrendingUp,
  Clock,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useBalanceSummary, useTransacciones } from '@/features/pagos/hooks';
import type { EstadoTransaccion, TransaccionFilters } from '@/features/pagos/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<EstadoTransaccion, { label: string; bg: string; color: string; border: string }> = {
  completado:  { label: 'Completado',  bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  pendiente:   { label: 'Pendiente',   bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  fallido:     { label: 'Fallido',     bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
  reembolsado: { label: 'Reembolsado', bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
};

const ESTADOS: EstadoTransaccion[] = ['completado', 'pendiente', 'fallido', 'reembolsado'];

function EstadoBadge({ estado }: { estado: EstadoTransaccion }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

function formatMonto(monto: number, moneda = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: moneda, maximumFractionDigits: 0,
  }).format(monto);
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Balance skeleton ─────────────────────────────────────────────────────────

function BalanceSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PagosPage() {
  const [filters, setFilters] = useState<TransaccionFilters>({ page: 1, limit: 20 });
  const [showFilters, setShowFilters] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const { data: balance, isLoading: balanceLoading, error: balanceError } = useBalanceSummary();
  const { data: txData, isLoading: txLoading, error: txError } = useTransacciones(filters);

  const transacciones = txData?.items ?? [];
  const meta = txData?.meta;

  const applyDateFilter = () => {
    setFilters(prev => ({
      ...prev,
      page: 1,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
    }));
  };

  const clearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFilters({ page: 1, limit: 20 });
  };

  const hasActiveFilters = !!(filters.estado || filters.fechaDesde || filters.fechaHasta);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pasarela de pagos y transacciones</p>
        </div>
      </div>

      {/* Balance summary cards */}
      {balanceLoading ? (
        <BalanceSkeleton />
      ) : balanceError ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-card border border-border text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          No se pudo cargar el resumen de balance
        </div>
      ) : balance ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" style={{ color: '#4ade80' }} />
              <span className="text-xs font-medium uppercase tracking-wider">Total ingresos</span>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: '#4ade80' }}>
              {formatMonto(balance.totalIngresos, balance.moneda)}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" style={{ color: '#fbbf24' }} />
              <span className="text-xs font-medium uppercase tracking-wider">Pendiente</span>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: '#fbbf24' }}>
              {formatMonto(balance.totalPendiente, balance.moneda)}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" style={{ color: '#f87171' }} />
              <span className="text-xs font-medium uppercase tracking-wider">Fallido</span>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: '#f87171' }}>
              {formatMonto(balance.totalFallido, balance.moneda)}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider">Tx hoy</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {balance.transaccionesHoy}
            </p>
          </div>
        </div>
      ) : null}

      {/* Transactions table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table header / filters */}
        <div className="flex flex-col gap-3 p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Transacciones recientes</h2>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground">
                  <X className="h-3 w-3" />
                  Limpiar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(v => !v)}
                className="h-8 gap-2 text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {hasActiveFilters && (
                  <span
                    className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold"
                    style={{ background: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}
                  >
                    !
                  </span>
                )}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 pt-1">
              {/* Estado filter */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Estado</label>
                <select
                  value={filters.estado ?? ''}
                  onChange={e => setFilters(prev => ({
                    ...prev, page: 1,
                    estado: e.target.value ? e.target.value as EstadoTransaccion : undefined,
                  }))}
                  className="h-8 text-xs rounded-md bg-secondary border border-border text-foreground px-2 min-w-36"
                >
                  <option value="">Todos</option>
                  {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>)}
                </select>
              </div>

              {/* Fecha desde */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Desde</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className="h-8 text-xs bg-secondary border-border w-36"
                />
              </div>

              {/* Fecha hasta */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Hasta</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className="h-8 text-xs bg-secondary border-border w-36"
                />
              </div>

              <Button size="sm" onClick={applyDateFilter} className="h-8 text-xs">
                Aplicar
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        {txError ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Error al cargar transacciones</p>
          </div>
        ) : txLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
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
              {transacciones.map(tx => (
                <TableRow key={tx.id} className="border-border hover:bg-secondary/50">
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {tx.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm max-w-48 truncate">
                    {tx.descripcion || tx.referencia || '—'}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{tx.proveedor}</TableCell>
                  <TableCell><EstadoBadge estado={tx.estado} /></TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    {formatMonto(tx.monto, tx.moneda)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatFecha(tx.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {meta.total} transacciones — Pagina {meta.page} de {meta.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!meta.hasPrevPage}
                onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!meta.hasNextPage}
                onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
