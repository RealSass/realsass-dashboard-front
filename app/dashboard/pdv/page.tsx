'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  usePuntosDeVenta,
  useCreatePdv,
  useUpdatePdv,
  useDeletePdv,
} from '@/features/pdv/hooks';
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
  Store,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Building2,
  Loader2,
} from 'lucide-react';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── PdV Form Dialog ──────────────────────────────────────────────────────────

function PdvDialog({
  open,
  onClose,
  pdv,
}: {
  open: boolean;
  onClose: () => void;
  pdv?: PuntoDeVenta;
}) {
  const isEditing = !!pdv;
  const createPdv = useCreatePdv();
  const updatePdv = useUpdatePdv();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      values: pdv
        ? { nombre: pdv.nombre, direccion: pdv.direccion ?? '', ciudad: pdv.ciudad ?? '' }
        : { nombre: '', direccion: '', ciudad: '' },
    });

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing) {
        await updatePdv.mutateAsync({ id: pdv!.id, data: values });
        toast.success('Punto de venta actualizado');
      } else {
        await createPdv.mutateAsync(values);
        toast.success('Punto de venta creado');
      }
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Punto de Venta' : 'Nuevo Punto de Venta'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modificá los datos del punto de venta.' : 'Completá los datos para crear un nuevo punto de venta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre <span className="text-destructive">*</span></Label>
            <Input
              id="nombre"
              placeholder="Ej: Sucursal Centro"
              className="bg-secondary border-border"
              {...register('nombre')}
            />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input
              id="ciudad"
              placeholder="Ej: Buenos Aires"
              className="bg-secondary border-border"
              {...register('ciudad')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              placeholder="Ej: Av. Corrientes 1234"
              className="bg-secondary border-border"
              {...register('direccion')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancelar
            </Button>
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

function DeletePdvDialog({
  pdv,
  onClose,
}: {
  pdv: PuntoDeVenta | null;
  onClose: () => void;
}) {
  const deletePdv = useDeletePdv();

  const handleDelete = async () => {
    if (!pdv) return;
    try {
      await deletePdv.mutateAsync(pdv.id);
      toast.success('Punto de venta eliminado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      onClose();
    }
  };

  return (
    <AlertDialog open={!!pdv} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar punto de venta</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente <strong>{pdv?.nombre}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deletePdv.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── PdV Card ─────────────────────────────────────────────────────────────────

function PdvCard({
  pdv,
  onEdit,
  onDelete,
}: {
  pdv: PuntoDeVenta;
  onEdit: (p: PuntoDeVenta) => void;
  onDelete: (p: PuntoDeVenta) => void;
}) {
  return (
    <div className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Status dot */}
      <span
        className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full"
        style={pdv.isActive
          ? { background: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,.2)' }
          : { background: '#a1a1aa', boxShadow: '0 0 0 3px rgba(161,161,170,.2)' }}
        title={pdv.isActive ? 'Activo' : 'Inactivo'}
      />

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Store className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h3 className="font-semibold text-foreground leading-tight truncate">{pdv.nombre}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">ID: {pdv.id.slice(0, 8)}…</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {pdv.ciudad && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{pdv.ciudad}</span>
          </div>
        )}
        {pdv.direccion && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{pdv.direccion}</span>
          </div>
        )}
        {!pdv.ciudad && !pdv.direccion && (
          <p className="text-xs text-muted-foreground/60 italic">Sin dirección cargada</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => onEdit(pdv)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          onClick={() => onDelete(pdv)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PdvPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPdv, setEditingPdv] = useState<PuntoDeVenta | undefined>(undefined);
  const [deletingPdv, setDeletingPdv] = useState<PuntoDeVenta | null>(null);

  const { data: pdvList, isLoading, error } = usePuntosDeVenta();

  const pdvs: PuntoDeVenta[] = Array.isArray(pdvList) ? pdvList : [];

  const openCreate = () => { setEditingPdv(undefined); setDialogOpen(true); };
  const openEdit = (p: PuntoDeVenta) => { setEditingPdv(p); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingPdv(undefined); };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Puntos de Venta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pdvs.length} {pdvs.length === 1 ? 'sucursal registrada' : 'sucursales registradas'}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nuevo PdV
        </Button>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Error al cargar los puntos de venta: {error instanceof Error ? error.message : 'Error desconocido'}
        </div>
      )}

      {!isLoading && !error && pdvs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">No hay puntos de venta</p>
          <p className="text-sm text-muted-foreground">Crea el primero para empezar a gestionar tu stock.</p>
          <Button onClick={openCreate} className="mt-2 gap-2">
            <Plus className="h-4 w-4" />
            Crear Punto de Venta
          </Button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && pdvs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pdvs.map((pdv) => (
            <PdvCard
              key={pdv.id}
              pdv={pdv}
              onEdit={openEdit}
              onDelete={setDeletingPdv}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <PdvDialog
        open={dialogOpen}
        onClose={closeDialog}
        pdv={editingPdv}
      />
      <DeletePdvDialog
        pdv={deletingPdv}
        onClose={() => setDeletingPdv(null)}
      />
    </div>
  );
}
