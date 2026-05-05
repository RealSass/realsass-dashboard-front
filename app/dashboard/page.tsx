'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  useAccesorios,
  useCreateAccesorio,
  useUpdateAccesorio,
  useDeleteAccesorio,
  useSubAccesorios,
  useCreateSubAccesorio,
  useUpdateSubAccesorio,
  useDeleteSubAccesorio,
} from '@/features/stock/hooks';
import { usePuntosDeVenta } from '@/features/pdv/hooks';
import type {
  Accesorio,
  AccesorioInput,
  SubAccesorio,
  SubAccesorioInput,
} from '@/features/stock/types';
import type { PuntoDeVenta } from '@/features/pdv/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Package,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockStyle(cantidad: number): React.CSSProperties {
  if (cantidad === 0) return { background: 'rgba(239,68,68,0.12)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' };
  if (cantidad <= 3) return { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.3)' };
  return { background: 'rgba(34,197,94,0.12)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' };
}

function StockBadge({ cantidad }: { cantidad: number }) {
  return (
    <span
      className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border min-w-[3rem]"
      style={stockStyle(cantidad)}
    >
      {cantidad} uds
    </span>
  );
}

// ─── StockControl ─────────────────────────────────────────────────────────────

function StockControl({
  item,
  onUpdate,
  isPending,
}: {
  item: { id: string; cantidad: number };
  onUpdate: (id: string, cantidad: number) => Promise<void>;
  isPending: boolean;
}) {
  const [loading, setLoading] = useState<'inc' | 'dec' | null>(null);

  const handleChange = async (delta: number) => {
    const nueva = Math.max(0, item.cantidad + delta);
    if (nueva === item.cantidad) return;
    setLoading(delta > 0 ? 'inc' : 'dec');
    try {
      await onUpdate(item.id, nueva);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Button
        size="icon"
        variant="outline"
        className="h-6 w-6 rounded-full border-border"
        onClick={() => handleChange(-1)}
        disabled={item.cantidad === 0 || !!loading || isPending}
      >
        {loading === 'dec' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="text-sm leading-none">−</span>
        )}
      </Button>

      <StockBadge cantidad={item.cantidad} />

      <Button
        size="icon"
        variant="outline"
        className="h-6 w-6 rounded-full border-border"
        onClick={() => handleChange(1)}
        disabled={!!loading || isPending}
      >
        {loading === 'inc' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="text-sm leading-none">+</span>
        )}
      </Button>
    </div>
  );
}

// ─── ColorTagInput ────────────────────────────────────────────────────────────

function ColorTagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (colors: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput('');
  };

  const remove = (color: string) => onChange(value.filter((c) => c !== color));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Ej: Negro, Blanco..."
          className="bg-secondary border-border"
        />
        <Button type="button" variant="outline" onClick={add} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((color) => (
            <span
              key={color}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary border border-border"
            >
              {color}
              <button type="button" onClick={() => remove(color)}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const accesorioSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  modelo: z.string().min(1, 'Requerido'),
  tipo: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  cantidad: z.coerce.number().int().min(0),
  puntoDeVentaId: z.string().min(1, 'Seleccioná un PdV'),
  colores: z.array(z.string()).optional(),  // ← agregar
});
type AccesorioForm = z.infer<typeof accesorioSchema>;

const subAccesorioSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  tipo: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  cantidad: z.coerce.number().int().min(0),
  puntoDeVentaId: z.string().min(1, 'Seleccioná un PdV'),
  colores: z.array(z.string()).optional(),
});
type SubAccesorioForm = z.infer<typeof subAccesorioSchema>;

// ─── Accesorio Dialog ─────────────────────────────────────────────────────────

function AccesorioDialog({
  open, onClose, item, pdvs,
}: { open: boolean; onClose: () => void; item?: Accesorio; pdvs: PuntoDeVenta[] }) {
  const create = useCreateAccesorio();
  const update = useUpdateAccesorio();
  const isEditing = !!item;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<AccesorioForm>({
      resolver: zodResolver(accesorioSchema),
      values: item ? {
        nombre: item.nombre,
        modelo: item.modelo,
        tipo: item.tipo,
        descripcion: item.descripcion ?? '',
        cantidad: item.cantidad,
        puntoDeVentaId: item.puntoDeVentaId,
        colores: item.colores?.map((c) => c.color) ?? [],
      } : { nombre: '', modelo: '', tipo: '', descripcion: '', cantidad: 0, puntoDeVentaId: '', colores: [] },
    });

  const pdvValue = watch('puntoDeVentaId');

  const onSubmit = async (values: AccesorioForm) => {
    try {
      const payload: AccesorioInput = {
        ...values,
        colores: values.colores ?? [],  // ← en vez de []
        // imagenes: [],
      };
      if (isEditing) {
        await update.mutateAsync({ id: item!.id, data: payload });
        toast.success('Accesorio actualizado');
      } else {
        await create.mutateAsync(payload);
        toast.success('Accesorio creado');
      }
      reset(); onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Accesorio' : 'Nuevo Accesorio'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modificá los datos del accesorio.' : 'Completá los datos para crear un nuevo accesorio de marca.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input placeholder="Ej: Funda iPhone 15" className="bg-secondary border-border" {...register('nombre')} />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Modelo <span className="text-destructive">*</span></Label>
              <Input placeholder="Ej: MK123" className="bg-secondary border-border" {...register('modelo')} />
              {errors.modelo && <p className="text-xs text-destructive">{errors.modelo.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo <span className="text-destructive">*</span></Label>
              <Input placeholder="Ej: Funda, Cable, Cargador" className="bg-secondary border-border" {...register('tipo')} />
              {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Cantidad <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} className="bg-secondary border-border" {...register('cantidad')} />
              {errors.cantidad && <p className="text-xs text-destructive">{errors.cantidad.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Punto de Venta <span className="text-destructive">*</span></Label>
            <Select value={pdvValue || 'none'} onValueChange={(v) => setValue('puntoDeVentaId', v === 'none' ? '' : v, { shouldValidate: true })}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar PdV..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar PdV</SelectItem>
                {pdvs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.puntoDeVentaId && <p className="text-xs text-destructive">{errors.puntoDeVentaId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input placeholder="Descripción opcional" className="bg-secondary border-border" {...register('descripcion')} />
          </div>
          <div className="space-y-1.5">
            <Label>Colores</Label>
            <ColorTagInput
              value={watch('colores') ?? []}
              onChange={(colors) => setValue('colores', colors)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-Accesorio Dialog ─────────────────────────────────────────────────────

function SubAccesorioDialog({
  open, onClose, item, pdvs,
}: { open: boolean; onClose: () => void; item?: SubAccesorio; pdvs: PuntoDeVenta[] }) {
  const create = useCreateSubAccesorio();
  const update = useUpdateSubAccesorio();
  const isEditing = !!item;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<SubAccesorioForm>({
      resolver: zodResolver(subAccesorioSchema),
      values: item ? {
        nombre: item.nombre,
        tipo: item.tipo,
        descripcion: item.descripcion ?? '',
        cantidad: item.cantidad,
        puntoDeVentaId: item.puntoDeVentaId,
        colores: item.colores?.map((c) => c.color) ?? [],
      } : { nombre: '', tipo: '', descripcion: '', cantidad: 0, puntoDeVentaId: '', colores: [] },
    });

  const pdvValue = watch('puntoDeVentaId');

  const onSubmit = async (values: SubAccesorioForm) => {
    try {
      const payload: SubAccesorioInput = {
        ...values,
        colores: values.colores ?? [],
        // imagenes: [],
      }
      if (isEditing) {
        await update.mutateAsync({ id: item!.id, data: payload });
        toast.success('Sub-accesorio actualizado');
      } else {
        await create.mutateAsync(payload);
        toast.success('Sub-accesorio creado');
      }
      reset(); onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Sub-Accesorio' : 'Nuevo Sub-Accesorio'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modificá los datos del sub-accesorio.' : 'Completá los datos para crear un nuevo sub-accesorio genérico.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input placeholder="Ej: Templado iPhone 15" className="bg-secondary border-border" {...register('nombre')} />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo <span className="text-destructive">*</span></Label>
              <Input placeholder="Ej: Protector, Cable" className="bg-secondary border-border" {...register('tipo')} />
              {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cantidad <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} className="bg-secondary border-border" {...register('cantidad')} />
              {errors.cantidad && <p className="text-xs text-destructive">{errors.cantidad.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Punto de Venta <span className="text-destructive">*</span></Label>
              <Select value={pdvValue || 'none'} onValueChange={(v) => setValue('puntoDeVentaId', v === 'none' ? '' : v, { shouldValidate: true })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar PdV..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar PdV</SelectItem>
                  {pdvs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.puntoDeVentaId && <p className="text-xs text-destructive">{errors.puntoDeVentaId.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input placeholder="Descripción opcional" className="bg-secondary border-border" {...register('descripcion')} />
          </div>
          <div className="space-y-1.5">
            <Label>Colores</Label>
            <ColorTagInput
              value={watch('colores') ?? []}
              onChange={(colors) => setValue('colores', colors)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onClose, isPending }: {
  name: string; onConfirm: () => void; onClose: () => void; isPending: boolean;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar elemento</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente <strong>{name}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Accesorios Tab ───────────────────────────────────────────────────────────

function AccesoriosTab({ pdvs }: { pdvs: PuntoDeVenta[] }) {
  const [search, setSearch] = useState('');
  const [filterPdv, setFilterPdv] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Accesorio | undefined>();
  const [deleting, setDeleting] = useState<Accesorio | null>(null);

  // ✅ Fetch todo de una vez — sin filtros en el query key = mismo caché siempre
  const { data, isLoading, error } = useAccesorios({});
  const items: Accesorio[] = Array.isArray(data) ? data : (data?.items ?? []);

  const update = useUpdateAccesorio();
  const deleteAcc = useDeleteAccesorio();

  const handleStockChange = async (id: string, cantidad: number) => {
    await update.mutateAsync({ id, data: { cantidad } });
  };

  // Tipos únicos para el dropdown (del caché completo)
  const tiposDisponibles = useMemo(() => {
    const set = new Set(items.map((i) => i.tipo).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  // ✅ Todo el filtrado en el front — instantáneo
  const filtered = useMemo(() => {
    let list = items;
    if (search)
      list = list.filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()));
    if (filterPdv !== 'all')
      list = list.filter((i) => i.puntoDeVentaId === filterPdv);
    if (filterTipo !== 'all')
      list = list.filter((i) => i.tipo === filterTipo);
    if (filterStock === 'sin_stock') list = list.filter((i) => i.cantidad === 0);
    if (filterStock === 'bajo') list = list.filter((i) => i.cantidad > 0 && i.cantidad <= 3);
    if (filterStock === 'ok') list = list.filter((i) => i.cantidad > 3);
    return list;
  }, [items, search, filterPdv, filterTipo, filterStock]);

  // ✅ Paginación en el front
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const clearFilters = () => {
    setSearch(''); setFilterPdv('all'); setFilterTipo('all'); setFilterStock('all'); setPage(1);
  };
  const hasFilters = search || filterPdv !== 'all' || filterTipo !== 'all' || filterStock !== 'all';

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteAcc.mutateAsync(deleting.id);
      toast.success('Accesorio eliminado');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setDeleting(null); }
  };

  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (a: Accesorio) => { setEditing(a); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterPdv} onValueChange={(v) => { setFilterPdv(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-secondary border-border">
              <SelectValue placeholder="PdV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los PdV</SelectItem>
              {pdvs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v); setPage(1); }}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {tiposDisponibles.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStock} onValueChange={(v) => { setFilterStock(v); setPage(1); }}>
            <SelectTrigger className="w-36 bg-secondary border-border">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el stock</SelectItem>
              <SelectItem value="ok">Stock OK (+3)</SelectItem>
              <SelectItem value="bajo">Stock bajo (1-3)</SelectItem>
              <SelectItem value="sin_stock">Sin stock</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap text-sm">
        <span className="text-muted-foreground">{filtered.length} resultados</span>
        {filterPdv !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs">
            PdV: {pdvs.find((p) => p.id === filterPdv)?.nombre}
            <button onClick={() => setFilterPdv('all')}><X className="h-3 w-3" /></button>
          </span>
        )}
        {filterTipo !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs">
            Tipo: {filterTipo}
            <button onClick={() => setFilterTipo('all')}><X className="h-3 w-3" /></button>
          </span>
        )}
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Error al cargar'}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground">Probá ajustando los filtros</p>
              {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Limpiar filtros</Button>}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Modelo</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">PdV</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Colores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((item) => {
                    const pdv = pdvs.find((p) => p.id === item.puntoDeVentaId);
                    return (
                      <TableRow key={item.id} className="border-border">
                        <TableCell className="font-medium">
                          <div>
                            <p className="truncate max-w-[180px]">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{item.modelo} · {item.tipo}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{item.modelo}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-secondary text-secondary-foreground border border-border">
                            {item.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{pdv?.nombre ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          <StockControl
                            item={item}
                            onUpdate={handleStockChange}
                            isPending={update.isPending}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p className="text-xs text-muted-foreground sm:hidden">{item.modelo} · {item.tipo}</p>
                            {item.colores && item.colores.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.colores.map((c) => (
                                  <span key={c.id} className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-1.5 py-0">
                                    {c.color}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleting(item)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación en el front */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <AccesorioDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(undefined); }} item={editing} pdvs={pdvs} />
      {deleting && (
        <DeleteConfirm
          name={deleting.nombre}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
          isPending={deleteAcc.isPending}
        />
      )}
    </div>
  );
}

// ─── Sub-Accesorios Tab ───────────────────────────────────────────────────────

function SubAccesoriosTab({ pdvs }: { pdvs: PuntoDeVenta[] }) {
  const [search, setSearch] = useState('');
  const [filterPdv, setFilterPdv] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubAccesorio | undefined>();
  const [deleting, setDeleting] = useState<SubAccesorio | null>(null);

  // ✅ Fetch todo de una vez — sin filtros en el query key = mismo caché siempre
  const { data, isLoading, error } = useSubAccesorios({});
  const items: SubAccesorio[] = Array.isArray(data) ? data : (data?.items ?? []);

  const updateSub = useUpdateSubAccesorio();
  const deleteSub = useDeleteSubAccesorio();

  const handleStockChange = async (id: string, cantidad: number) => {
    await updateSub.mutateAsync({ id, data: { cantidad } });
  };

  // Tipos únicos para el dropdown (del caché completo)
  const tiposDisponibles = useMemo(() => {
    const set = new Set(items.map((i) => i.tipo).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  // ✅ Todo el filtrado en el front — instantáneo
  const filtered = useMemo(() => {
    let list = items;
    if (search)
      list = list.filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()));
    if (filterPdv !== 'all')
      list = list.filter((i) => i.puntoDeVentaId === filterPdv);
    if (filterTipo !== 'all')
      list = list.filter((i) => i.tipo === filterTipo);
    if (filterStock === 'sin_stock') list = list.filter((i) => i.cantidad === 0);
    if (filterStock === 'bajo') list = list.filter((i) => i.cantidad > 0 && i.cantidad <= 3);
    if (filterStock === 'ok') list = list.filter((i) => i.cantidad > 3);
    return list;
  }, [items, search, filterPdv, filterTipo, filterStock]);

  // ✅ Paginación en el front
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const clearFilters = () => {
    setSearch(''); setFilterPdv('all'); setFilterTipo('all'); setFilterStock('all'); setPage(1);
  };
  const hasFilters = search || filterPdv !== 'all' || filterTipo !== 'all' || filterStock !== 'all';

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteSub.mutateAsync(deleting.id);
      toast.success('Sub-accesorio eliminado');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setDeleting(null); }
  };

  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (a: SubAccesorio) => { setEditing(a); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterPdv} onValueChange={(v) => { setFilterPdv(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-secondary border-border">
              <SelectValue placeholder="PdV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los PdV</SelectItem>
              {pdvs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v); setPage(1); }}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {tiposDisponibles.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStock} onValueChange={(v) => { setFilterStock(v); setPage(1); }}>
            <SelectTrigger className="w-36 bg-secondary border-border">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el stock</SelectItem>
              <SelectItem value="ok">Stock OK (+3)</SelectItem>
              <SelectItem value="bajo">Stock bajo (1-3)</SelectItem>
              <SelectItem value="sin_stock">Sin stock</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap text-sm">
        <span className="text-muted-foreground">{filtered.length} resultados</span>
        {filterPdv !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs">
            PdV: {pdvs.find((p) => p.id === filterPdv)?.nombre}
            <button onClick={() => setFilterPdv('all')}><X className="h-3 w-3" /></button>
          </span>
        )}
        {filterTipo !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs">
            Tipo: {filterTipo}
            <button onClick={() => setFilterTipo('all')}><X className="h-3 w-3" /></button>
          </span>
        )}
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Error al cargar'}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground">Probá ajustando los filtros</p>
              {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Limpiar filtros</Button>}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">PdV</TableHead>
                    <TableHead className="hidden lg:table-cell">Descripción</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Colores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((item) => {
                    const pdv = pdvs.find((p) => p.id === item.puntoDeVentaId);
                    return (
                      <TableRow key={item.id} className="border-border">
                        <TableCell className="font-medium">
                          <div>
                            <p className="truncate max-w-[200px]">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{item.tipo}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-secondary text-secondary-foreground border border-border">
                            {item.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{pdv?.nombre ?? '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                          {item.descripcion ?? '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <StockControl
                            item={item}
                            onUpdate={handleStockChange}
                            isPending={updateSub.isPending}
                          />
                        </TableCell>

                        <TableCell className="font-medium">
                          <div>
                            <p className="text-xs text-muted-foreground sm:hidden">{item.modelo} · {item.tipo}</p>
                            {item.colores && item.colores.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.colores.map((c) => (
                                  <span key={c.id} className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-1.5 py-0">
                                    {c.color}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleting(item)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación en el front */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <SubAccesorioDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(undefined); }} item={editing} pdvs={pdvs} />
      {deleting && (
        <DeleteConfirm
          name={deleting.nombre}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
          isPending={deleteSub.isPending}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'accesorios' | 'sub-accesorios';

export default function StockPage() {
  const [tab, setTab] = useState<Tab>('accesorios');
  const { data: pdvRaw } = usePuntosDeVenta();
  const pdvs: PuntoDeVenta[] = Array.isArray(pdvRaw) ? pdvRaw : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'accesorios', label: 'Accesorios de Marca' },
    { id: 'sub-accesorios', label: 'Sub-Accesorios' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
            <Layers className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Stock</h1>
            <p className="text-sm text-muted-foreground">Gestión de accesorios y sub-accesorios</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'accesorios' && <AccesoriosTab pdvs={pdvs} />}
      {tab === 'sub-accesorios' && <SubAccesoriosTab pdvs={pdvs} />}
    </div>
  );
}
