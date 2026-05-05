'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Loader2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAccesorio, useUpdateAccesorio } from '../hooks';
import type { Accesorio, AccesorioInput } from '../types';
import type { PuntoDeVenta } from '@/features/pdv/types';

// ─── Color tag input ──────────────────────────────────────────────────────────

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

// ─── Accesorio dialog ─────────────────────────────────────────────────────────

const schema = z.object({
  nombre:          z.string().min(1, 'Requerido'),
  modelo:          z.string().min(1, 'Requerido'),
  tipo:            z.string().min(1, 'Requerido'),
  descripcion:     z.string().optional(),
  cantidad:        z.coerce.number().int().min(0),
  puntoDeVentaId:  z.string().min(1, 'Selecciona un PdV'),
  colores:         z.array(z.string()).optional(),
});
type FormValues = z.infer<typeof schema>;

interface AccesorioSheetProps {
  open: boolean;
  onClose: () => void;
  item?: Accesorio;
  pdvs: PuntoDeVenta[];
}

export function AccesorioSheet({ open, onClose, item, pdvs }: AccesorioSheetProps) {
  const create    = useCreateAccesorio();
  const update    = useUpdateAccesorio();
  const isEditing = !!item;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: item
      ? {
          nombre:         item.nombre,
          modelo:         item.modelo,
          tipo:           item.tipo,
          descripcion:    item.descripcion ?? '',
          cantidad:       item.cantidad,
          puntoDeVentaId: item.puntoDeVentaId,
          colores:        item.colores?.map((c) => c.color) ?? [],
        }
      : { nombre: '', modelo: '', tipo: '', descripcion: '', cantidad: 0, puntoDeVentaId: '', colores: [] },
  });

  const pdvValue = watch('puntoDeVentaId');

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: AccesorioInput = {
        ...values,
        colores:  values.colores ?? [],
        imagenes: [],
      };
      if (isEditing) {
        await update.mutateAsync({ id: item!.id, data: payload });
        toast.success('Accesorio actualizado');
      } else {
        await create.mutateAsync(payload);
        toast.success('Accesorio creado');
      }
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Accesorio' : 'Nuevo Accesorio'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del accesorio.'
              : 'Completa los datos para crear un nuevo accesorio de marca.'}
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
              <Input placeholder="Ej: Funda, Cable" className="bg-secondary border-border" {...register('tipo')} />
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
            <Select
              value={pdvValue || 'none'}
              onValueChange={(v) => setValue('puntoDeVentaId', v === 'none' ? '' : v, { shouldValidate: true })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Seleccionar PdV..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar PdV</SelectItem>
                {pdvs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.puntoDeVentaId && (
              <p className="text-xs text-destructive">{errors.puntoDeVentaId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Descripcion</Label>
            <Input placeholder="Descripcion opcional" className="bg-secondary border-border" {...register('descripcion')} />
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
