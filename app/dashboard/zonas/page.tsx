'use client';

import { useState } from 'react';
import {
  MapPin, Plus, Pencil, Trash2, Loader2,
  AlertCircle, X, Check, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useZonas, useCreateZona, useUpdateZona, useDeleteZona } from '@/features/zonas/hooks';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { Zona, CreateZonaInput } from '@/features/zonas/types';

export default function ZonasPage() {
  const { organizationId } = useAuth();

  const { data, isLoading, error } = useZonas(organizationId);
  const zonas   = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const createMutation = useCreateZona();
  const updateMutation = useUpdateZona();
  const deleteMutation = useDeleteZona();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<Zona | null>(null);
  const [deleting,  setDeleting]  = useState<Zona | null>(null);

  const [form, setForm] = useState<CreateZonaInput>({
    nombre: '', ciudad: '', provincia: '', descripcion: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', ciudad: '', provincia: '', descripcion: '' });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (zona: Zona) => {
    setEditing(zona);
    setForm({
      nombre:      zona.nombre,
      ciudad:      zona.ciudad ?? '',
      provincia:   zona.provincia ?? '',
      descripcion: zona.descripcion ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido'); return; }
    if (!organizationId) return;
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form, orgId: organizationId });
        toast.success('Zona actualizada');
      } else {
        await createMutation.mutateAsync({ data: form, orgId: organizationId });
        toast.success('Zona creada');
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deleting || !organizationId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleting.id, orgId: organizationId });
      toast.success('Zona eliminada');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Zonas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Agrupaciones geográficas de propiedades
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva zona
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Error al cargar zonas
        </div>
      ) : zonas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium">Sin zonas</p>
          <p className="text-sm text-muted-foreground">Creá la primera zona para organizar tus propiedades</p>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nueva zona</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zonas.map((zona: Zona) => (
            <div key={zona.id} className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-border/80 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{zona.nombre}</p>
                  {(zona.ciudad || zona.provincia) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[zona.ciudad, zona.provincia].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(zona)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleting(zona)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {zona._count !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {zona._count.propiedades} propiedad{zona._count.propiedades !== 1 ? 'es' : ''}
                </div>
              )}
              {zona.descripcion && (
                <p className="text-xs text-muted-foreground line-clamp-2">{zona.descripcion}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar zona' : 'Nueva zona'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modificá los datos de la zona.' : 'Completá los datos para crear una nueva zona.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="ej: Centro" className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" value={form.ciudad ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, ciudad: e.target.value }))}
                  placeholder="ej: San Fernando..." className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="provincia">Provincia</Label>
                <Input id="provincia" value={form.provincia ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, provincia: e.target.value }))}
                  placeholder="ej: Catamarca" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <Input id="desc" value={form.descripcion ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción opcional" className="bg-secondary border-border" />
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />{formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isBusy}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isBusy} className="gap-2">
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      {deleting && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar zona</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminás la zona <strong>{deleting.nombre}</strong>? Esta acción no puede deshacerse.
                No podrás eliminarla si tiene propiedades activas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
