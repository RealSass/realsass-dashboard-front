'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { useCreatePdv, useUpdatePdv } from '../hooks';
import type { PuntoDeVenta } from '../types';

const schema = z.object({
  nombre:    z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().optional(),
  ciudad:    z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface PdvDialogProps {
  open: boolean;
  onClose: () => void;
  pdv?: PuntoDeVenta;
}

export function PdvDialog({ open, onClose, pdv }: PdvDialogProps) {
  const isEditing = !!pdv;
  const createPdv = useCreatePdv();
  const updatePdv = useUpdatePdv();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
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
            {isEditing
              ? 'Modifica los datos del punto de venta.'
              : 'Completa los datos para crear un nuevo punto de venta.'}
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
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
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
            <Label htmlFor="direccion">Direccion</Label>
            <Input
              id="direccion"
              placeholder="Ej: Av. Corrientes 1234"
              className="bg-secondary border-border"
              {...register('direccion')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onClose(); }}
            >
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
