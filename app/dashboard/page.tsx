'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2, Plus, Search, Filter, X,
  Loader2, AlertCircle, MapPin, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { usePropiedades } from '@/features/propiedades/hooks';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  TIPO_LABELS, OPERACION_LABELS, ESTADO_LABELS, ESTADO_COLORS,
  type TipoPropiedad, type TipoOperacion, type EstadoPropiedad, type PropiedadFilters,
} from '@/features/propiedades/types';

const TIPOS: TipoPropiedad[]   = ['CASA','DEPARTAMENTO','TERRENO','LOCAL','OFICINA','GALPON','CAMPO'];
const OPERACIONES: TipoOperacion[] = ['VENTA','ALQUILER','ALQUILER_TEMP'];
const ESTADOS: EstadoPropiedad[] = ['DISPONIBLE','RESERVADA','VENDIDA','ALQUILADA','PAUSADA'];

function EstadoBadge({ estado }: { estado: EstadoPropiedad }) {
  const cfg = ESTADO_COLORS[estado];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}

function formatPrecio(precio: string, moneda: string) {
  const num = parseFloat(precio);
  if (isNaN(num)) return `${moneda} ${precio}`;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: moneda, maximumFractionDigits: 0,
  }).format(num);
}

export default function DashboardPage() {
  const { organizationId } = useAuth();
  const [filters, setFilters] = useState<PropiedadFilters>({ page: 1, limit: 20 });
  const [buscar, setBuscar]   = useState('');

  const { data, isLoading, error } = usePropiedades(filters, organizationId);

  const items    = data?.data ?? [];
  const meta     = data?.meta;
  const hasFilters = !!(filters.tipo || filters.operacion || filters.estado || filters.buscar);

  const applySearch = () => {
    setFilters((p) => ({ ...p, page: 1, buscar: buscar || undefined }));
  };

  const clearFilters = () => {
    setBuscar('');
    setFilters({ page: 1, limit: 20 });
  };

  if (!organizationId) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium">Sin organización activa</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tu cuenta no tiene una organización asociada en el Sistema 1.
              Completá el onboarding en la landing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Propiedades
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} propiedad${meta.total !== 1 ? 'es' : ''}` : '—'}
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link href="/dashboard/propiedades/nueva">
            <Plus className="h-4 w-4" />
            Nueva propiedad
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, dirección..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={filters.tipo ?? ''}
            onValueChange={(v) => setFilters((p) => ({ ...p, page: 1, tipo: v ? v as TipoPropiedad : undefined }))}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los tipos</SelectItem>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select
            value={filters.operacion ?? ''}
            onValueChange={(v) => setFilters((p) => ({ ...p, page: 1, operacion: v ? v as TipoOperacion : undefined }))}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder="Operación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {OPERACIONES.map((o) => <SelectItem key={o} value={o}>{OPERACION_LABELS[o]}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select
            value={filters.estado ?? ''}
            onValueChange={(v) => setFilters((p) => ({ ...p, page: 1, estado: v ? v as EstadoPropiedad : undefined }))}
          >
            <SelectTrigger className="w-36 bg-secondary border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {ESTADOS.map((e) => <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="rounded-xl border border-border overflow-hidden">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Error al cargar propiedades. Verificá la conexión con el dashboard backend.
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="font-medium">{hasFilters ? 'Sin resultados' : 'Sin propiedades'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters ? 'Ajustá los filtros' : 'Creá la primera propiedad'}
            </p>
          </div>
          {!hasFilters && (
            <Button asChild size="sm">
              <Link href="/dashboard/propiedades/nueva">
                <Plus className="h-4 w-4 mr-2" />
                Nueva propiedad
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Título</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Zona</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="hidden lg:table-cell">Operación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((prop) => (
                <TableRow key={prop.id} className="border-border">
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-[200px]">
                        {prop.destacada && <span className="text-yellow-500 mr-1">★</span>}
                        {prop.titulo}
                      </p>
                      {prop.direccion && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {prop.direccion}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs bg-secondary border border-border rounded-md px-2 py-0.5">
                      {TIPO_LABELS[prop.tipo]}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {prop.zona?.nombre ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {formatPrecio(prop.precio, prop.moneda)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {OPERACION_LABELS[prop.operacion]}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={prop.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/propiedades/${prop.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Paginación */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages} — {meta.total} propiedades
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              disabled={!meta.hasPrevPage}
              onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}>
              Anterior
            </Button>
            <Button variant="outline" size="sm"
              disabled={!meta.hasNextPage}
              onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
