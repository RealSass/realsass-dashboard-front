'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  MousePointerClick,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useCampanas, useMetricasCampana } from '@/features/campanas/hooks';
import type { PlataformaCampana, EstadoCampana, CampanaFilters } from '@/features/campanas/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const PLATAFORMA_CONFIG: Record<PlataformaCampana, { label: string; color: string }> = {
  meta:    { label: 'Meta',    color: '#1877f2' },
  tiktok:  { label: 'TikTok', color: '#ff0050' },
  google:  { label: 'Google', color: '#4285f4' },
  youtube: { label: 'YouTube',color: '#ff0000' },
};

const ESTADO_CONFIG: Record<EstadoCampana, { label: string; bg: string; color: string; border: string }> = {
  activa:     { label: 'Activa',     bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  pausada:    { label: 'Pausada',    bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  finalizada: { label: 'Finalizada', bg: 'rgba(120,120,120,0.12)',  color: '#a1a1aa', border: 'rgba(120,120,120,0.3)' },
  borrador:   { label: 'Borrador',   bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
};

const PLATAFORMAS: PlataformaCampana[] = ['meta', 'tiktok', 'google', 'youtube'];
const ESTADOS: EstadoCampana[]         = ['activa', 'pausada', 'finalizada', 'borrador'];

function EstadoBadge({ estado }: { estado: EstadoCampana }) {
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

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) {
  return `${n.toFixed(2)}%`;
}

// ─── Metrics panel (expandable per campaign) ──────────────────────────────────

function MetricasPanel({ campanaId }: { campanaId: string }) {
  const { data, isLoading, error } = useMetricasCampana(campanaId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 border-t border-border">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 p-4 border-t border-border text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-destructive" />
        No se pudieron cargar las metricas
      </div>
    );
  }

  const statCards = [
    { icon: Eye,               label: 'Impresiones', value: data.impresiones.toLocaleString('es-AR'), color: '#60a5fa' },
    { icon: MousePointerClick, label: 'CTR',         value: pct(data.ctr),                             color: '#4ade80' },
    { icon: DollarSign,        label: 'CPC',         value: formatMoney(data.cpc),                     color: '#fbbf24' },
    { icon: TrendingUp,        label: 'ROAS',        value: `x${data.roas.toFixed(2)}`,                color: '#a78bfa' },
  ];

  return (
    <div className="p-4 border-t border-border space-y-4 bg-background/50">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" style={{ color }} />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recharts area chart */}
      {data.serie && data.serie.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Evolucion</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.serie} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradClics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: 12,
                  color: 'var(--foreground)',
                }}
                labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 4 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }}
              />
              <Area
                type="monotone"
                dataKey="impresiones"
                stroke="#60a5fa"
                strokeWidth={2}
                fill="url(#gradImp)"
                name="Impresiones"
              />
              <Area
                type="monotone"
                dataKey="clics"
                stroke="#4ade80"
                strokeWidth={2}
                fill="url(#gradClics)"
                name="Clics"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Campaign card ────────────────────────────────────────────────────────────

function CampanaCard({ campana }: { campana: import('@/lib/types').Campana }) {
  const [expanded, setExpanded] = useState(false);
  const plat = PLATAFORMA_CONFIG[campana.plataforma];
  const gastoPct = campana.presupuesto > 0
    ? Math.min(100, (campana.presupuestoGastado / campana.presupuesto) * 100)
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Platform dot */}
            <div
              className="h-9 w-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: plat.color + '22', border: `1px solid ${plat.color}44`, color: plat.color }}
            >
              {plat.label.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{campana.nombre}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium" style={{ color: plat.color }}>{plat.label}</span>
                <EstadoBadge estado={campana.estado} />
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Budget progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Presupuesto</span>
            <span className="font-medium">
              {formatMoney(campana.presupuestoGastado)} / {formatMoney(campana.presupuesto)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${gastoPct}%`,
                background: gastoPct >= 90 ? '#f87171' : gastoPct >= 70 ? '#fbbf24' : '#4ade80',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{pct(gastoPct)} gastado</span>
            <span>
              {campana.fechaInicio.slice(0, 10)}
              {campana.fechaFin ? ` → ${campana.fechaFin.slice(0, 10)}` : ''}
            </span>
          </div>
        </div>
      </div>

      {expanded && <MetricasPanel campanaId={campana.id} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampanasPage() {
  const [filters, setFilters] = useState<CampanaFilters>({ page: 1, limit: 20 });

  const { data, isLoading, error } = useCampanas(filters);

  const campanas = data?.items ?? [];
  const meta     = data?.meta;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ad Optimizer — metricas y rendimiento</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.plataforma ?? ''}
            onChange={e => setFilters(prev => ({
              ...prev, page: 1,
              plataforma: e.target.value ? e.target.value as PlataformaCampana : undefined,
            }))}
            className="h-8 text-xs rounded-md bg-card border border-border text-foreground px-2"
          >
            <option value="">Todas las plataformas</option>
            {PLATAFORMAS.map(p => <option key={p} value={p}>{PLATAFORMA_CONFIG[p].label}</option>)}
          </select>

          <select
            value={filters.estado ?? ''}
            onChange={e => setFilters(prev => ({
              ...prev, page: 1,
              estado: e.target.value ? e.target.value as EstadoCampana : undefined,
            }))}
            className="h-8 text-xs rounded-md bg-card border border-border text-foreground px-2"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>)}
          </select>

          {(filters.plataforma || filters.estado) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => setFilters({ page: 1, limit: 20 })}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Campaign grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">Error al cargar campanas</p>
        </div>
      ) : campanas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sin campanas para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campanas.map(campana => (
            <CampanaCard key={campana.id} campana={campana} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {meta.total} campanas — Pagina {meta.page} de {meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPrevPage}
              onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage}
              onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
