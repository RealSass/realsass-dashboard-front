'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search, Plus, Pencil, Trash2, X, Loader2, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSubAccesorios, useUpdateSubAccesorio, useDeleteSubAccesorio, useCreateSubAccesorio } from '../hooks';
import { StockControl } from './stock-control';
import type { SubAccesorio, SubAccesorioInput } from '../types';
import type { PuntoDeVenta } from '@/features/pdv/types';

const PAGE_SIZE = 20;

// ─── Color tag input (local) ──────────────────────────────────────────────────

function ColorTagInput({ value, onChange }: { value: string[]; onChange: (c: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]); setInput('');
  };
  const remove = (c: string) => onChange(value.filter((x) => x !== c));
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Ej: Negro, Blanco..." className="bg-secondary border-border" />
        <Button type="button" variant="outline" onClick={add} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((color) => (
            <span key={color} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary border border-border">
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

// ─── Sub-accesorio dialog ─────────────────────────────────────────────────────

const schema = z.object({
  nombre:         z.string().min(1, 'Requerido'),
  tipo:           z.string().min(1, 'Requerido'),
  descripcion:    z.string().optional(),
  cantidad:       z.coerce.number().int().min(0),
  puntoDeVentaId: z.string().min(1, 'Selecciona un PdV'),
  colores:        z.array(z.string()).optional(),
});
type FormValues = z.infer<typeof schema>;

function SubAccesorioDialog({
  open, onClose, item, pdvs,
}: { open: boolean; onClose: () => void; item?: SubAccesorio; pdvs: PuntoDeVenta[] }) {
  const create    = useCreateSubAccesorio();
  const update    = useUpdateSubAccesorio();
  const isEditing = !!item;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      values: item
        ? { nombre: item.nombre, tipo: item.tipo, descripcion: item.descripcion ?? '', cantidad: item.cantidad, puntoDeVentaId: item.puntoDeVentaId, colores: item.colores?.map((c) => c.color) ?? [] }
        : { nombre: '', tipo: '', descripcion: '', cantidad: 0, puntoDeVentaId: '', colores: [] },
    });

  const pdvValue = watch('puntoDeVentaId');

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: SubAccesorioInput = { ...values, colores: values.colores ?? [], imagenes: [] };
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
            {isEditing ? 'Modifica los datos del sub-accesorio.' : 'Completa los datos para crear un nuevo sub-accesorio generico.'}
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
            <Label>Descripcion</Label>
            <Input placeholder="Descripcion opcional" className="bg-secondary border-border" {...register('descripcion')} />
          </div>
          <div className="space-y-1.5">
            <Label>Colores</Label>
            <ColorTagInput value={watch('colores') ?? []} onChange={(c) => setValue('colores', c)} />
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

// ─── Main table ───────────────────────────────────────────────────────────────

interface SubAccesoriosTableProps {
  pdvs: PuntoDeVenta[];
}

export function SubAccesoriosTable({ pdvs }: SubAccesoriosTableProps) {
  const [search,      setSearch]      = useState('');
  const [filterPdv,   setFilterPdv]   = useState('all');
  const [filterTipo,  setFilterTipo]  = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [page,        setPage]        = useState(1);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editing,     setEditing]     = useState<SubAccesorio | undefined>();
  const [deleting,    setDeleting]    = useState<SubAccesorio | null>(null);

  const { data, isLoading, error } = useSubAccesorios({});
  const items: SubAccesorio[] = Array.isArray(data) ? data : (data?.items ?? []);

  const updateSub = useUpdateSubAccesorio();
  const deleteSub = useDeleteSubAccesorio();

  const handleStockChange = async (id: string, cantidad: number) => {
    await updateSub.mutateAsync({ id, data: { cantidad } });
  };

  const tiposDisponibles = useMemo(() => {
    const set = new Set(items.map((i) => i.tipo).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (search)            list = list.filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()));
    if (filterPdv  !== 'all') list = list.filter((i) => i.puntoDeVentaId === filterPdv);
    if (filterTipo !== 'all') list = list.filter((i) => i.tipo === filterTipo);
    if (filterStock === 'sin_stock') list = list.filter((i) => i.cantidad === 0);
    if (filterStock === 'bajo')      list = list.filter((i) => i.cantidad > 0 && i.cantidad <= 3);
    if (filterStock === 'ok')        list = list.filter((i) => i.cantidad > 3);
    return list;
  }, [items, search, filterPdv, filterTipo, filterStock]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = useMemo(() => { const s = (page - 1) * PAGE_SIZE; return filtered.slice(s, s + PAGE_SIZE); }, [filtered, page]);

  const clearFilters = () => { setSearch(''); setFilterPdv('all'); setFilterTipo('all'); setFilterStock('all'); setPage(1); };
  const hasFilters   = search || filterPdv !== 'all' || filterTipo !== 'all' || filterStock !== 'all';

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteSub.mutateAsync(deleting.id);
      toast.success('Sub-accesorio eliminado');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 bg-secondary border-border" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterPdv} onValueChange={(v) => { setFilterPdv(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue placeholder="PdV" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los PdV</SelectItem>
              {pdvs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v); setPage(1); }}>
            <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {tiposDisponibles.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStock} onValueChange={(v) => { setFilterStock(v); setPage(1); }}>
            <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue placeholder="Stock" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el stock</SelectItem>
              <SelectItem value="ok">Stock OK (+3)</SelectItem>
              <SelectItem value="bajo">Stock bajo (1-3)</SelectItem>
              <SelectItem value="sin_stock">Sin stock</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && <Button variant="ghost" size="icon" onClick={clearFilters}><X className="h-4 w-4" /></Button>}
          <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />Nuevo
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap text-sm">
        <span className="text-muted-foreground">{filtered.length} resultados</span>
        {filterPdv !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs">
            PdV: {pdvs.find((p) => p.id === filterPdv)?.nombre}
            <button onClick={() => setFilterPdv('all')}><X className="h-3 w-3" /></button>
          </span>
        )}
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error instanceof Error ? error.message : 'Error al cargar'}</div>}

      {!isLoading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground">Proba ajustando los filtros</p>
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
                    <TableHead className="hidden lg:table-cell">Descripcion</TableHead>
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-secondary text-secondary-foreground border border-border">{item.tipo}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{pdv?.nombre ?? '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{item.descripcion ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          <StockControl item={item} onUpdate={handleStockChange} isPending={updateSub.isPending} />
                        </TableCell>
                        <TableCell>
                          {item.colores && item.colores.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.colores.map((c) => (
                                <span key={c.id} className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-1.5 py-0">{c.color}</span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(item); setDialogOpen(true); }}>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">Pagina {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <SubAccesorioDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(undefined); }} item={editing} pdvs={pdvs} />

      {deleting && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar elemento</AlertDialogTitle>
              <AlertDialogDescription>Esta accion no se puede deshacer. Se eliminara permanentemente <strong>{deleting.nombre}</strong>.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteSub.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
