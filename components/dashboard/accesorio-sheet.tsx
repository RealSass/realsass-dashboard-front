'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useCreateAccesorio, useUpdateAccesorio } from '@/features/stock/hooks';
import type { Accesorio } from '@/features/stock/types';
import type { PuntoDeVenta } from '@/features/pdv/types';

const TIPOS = ['Funda', 'Templado', 'Malla', 'Cargador', 'Cable', 'Auricular', 'Soporte', 'Otro'];

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  modelo: z.string().min(1, 'Requerido'),
  tipo: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  cantidad: z.coerce.number().int().min(0, 'Mínimo 0'),
  puntoDeVentaId: z.string().min(1, 'Requerido'),
  colores: z.array(z.string()).max(10),
  imagenes: z.array(z.string().url('URL inválida')).max(5),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  accesorio?: Accesorio | null;
  pdvList: PuntoDeVenta[];
  defaultPdvId?: string;
}

export function AccesorioSheet({ open, onClose, accesorio, pdvList, defaultPdvId }: Props) {
  const isEditing = !!accesorio;
  const createAccesorio = useCreateAccesorio();
  const updateAccesorio = useUpdateAccesorio();

  const [colores, setColores] = useState<string[]>(['']);
  const [imagenes, setImagenes] = useState<string[]>(['']);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      modelo: '',
      tipo: '',
      descripcion: '',
      cantidad: 0,
      puntoDeVentaId: defaultPdvId || '',
      colores: [],
      imagenes: [],
    },
  });

  const tipo = watch('tipo');
  const puntoDeVentaId = watch('puntoDeVentaId');

  useEffect(() => {
    if (open) {
      if (accesorio) {
        const c = accesorio.colores.map((c) => c.color);
        const i = accesorio.imagenes
          .sort((a, b) => a.orden - b.orden)
          .map((img) => img.url);
        setColores(c.length ? c : ['']);
        setImagenes(i.length ? i : ['']);
        reset({
          nombre: accesorio.nombre,
          modelo: accesorio.modelo,
          tipo: accesorio.tipo,
          descripcion: accesorio.descripcion || '',
          cantidad: accesorio.cantidad,
          puntoDeVentaId: accesorio.puntoDeVentaId,
          colores: c,
          imagenes: i,
        });
      } else {
        setColores(['']);
        setImagenes(['']);
        reset({
          nombre: '',
          modelo: '',
          tipo: '',
          descripcion: '',
          cantidad: 0,
          puntoDeVentaId: defaultPdvId || '',
          colores: [],
          imagenes: [],
        });
      }
    }
  }, [open, accesorio, defaultPdvId, reset]);

  // Sync colores/imagenes state into form
  useEffect(() => {
    setValue('colores', colores.filter(Boolean));
  }, [colores, setValue]);

  useEffect(() => {
    setValue('imagenes', imagenes.filter(Boolean));
  }, [imagenes, setValue]);

  const addColor = () => {
    if (colores.length < 10) setColores([...colores, '']);
  };
  const removeColor = (i: number) => setColores(colores.filter((_, idx) => idx !== i));
  const updateColor = (i: number, val: string) =>
    setColores(colores.map((c, idx) => (idx === i ? val : c)));

  const addImagen = () => {
    if (imagenes.length < 5) setImagenes([...imagenes, '']);
  };
  const removeImagen = (i: number) => setImagenes(imagenes.filter((_, idx) => idx !== i));
  const updateImagen = (i: number, val: string) =>
    setImagenes(imagenes.map((img, idx) => (idx === i ? val : img)));

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && accesorio) {
        await updateAccesorio.mutateAsync({ id: accesorio.id, data: values });
        toast.success('Accesorio actualizado');
      } else {
        await createAccesorio.mutateAsync(values);
        toast.success('Accesorio creado');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col bg-background border-l border-border overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle>{isEditing ? 'Editar Accesorio' : 'Nuevo Accesorio'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Modifica los datos del accesorio.'
              : 'Completa los campos para agregar un nuevo accesorio al inventario.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-5">

          {/* Punto de Venta */}
          <div className="space-y-2">
            <Label>Punto de Venta <span className="text-destructive">*</span></Label>
            <Select
              value={puntoDeVentaId}
              onValueChange={(v) => setValue('puntoDeVentaId', v, { shouldValidate: true })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Seleccionar PdV..." />
              </SelectTrigger>
              <SelectContent>
                {pdvList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.puntoDeVentaId && (
              <p className="text-xs text-destructive">{errors.puntoDeVentaId.message}</p>
            )}
          </div>

          <Separator />

          {/* Nombre + Modelo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input
                {...register('nombre')}
                placeholder="ej. iPhone 15"
                className="bg-secondary border-border"
              />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Modelo <span className="text-destructive">*</span></Label>
              <Input
                {...register('modelo')}
                placeholder="ej. Pro Max"
                className="bg-secondary border-border"
              />
              {errors.modelo && <p className="text-xs text-destructive">{errors.modelo.message}</p>}
            </div>
          </div>

          {/* Tipo + Cantidad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo <span className="text-destructive">*</span></Label>
              <Select
                value={tipo}
                onValueChange={(v) => setValue('tipo', v, { shouldValidate: true })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cantidad <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={0}
                {...register('cantidad')}
                className="bg-secondary border-border"
              />
              {errors.cantidad && (
                <p className="text-xs text-destructive">{errors.cantidad.message}</p>
              )}
            </div>
          </div>

          {/* Descripcion */}
          <div className="space-y-2">
            <Label>Descripcion</Label>
            <Textarea
              {...register('descripcion')}
              placeholder="Descripcion opcional..."
              rows={2}
              className="bg-secondary border-border resize-none"
            />
          </div>

          <Separator />

          {/* Colores */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Colores <span className="text-xs text-muted-foreground">(máx. 10)</span></Label>
              {colores.length < 10 && (
                <Button type="button" variant="ghost" size="sm" onClick={addColor} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Agregar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {colores.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={c}
                    onChange={(e) => updateColor(i, e.target.value)}
                    placeholder={`Color ${i + 1}`}
                    className="bg-secondary border-border"
                  />
                  {colores.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeColor(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Imagenes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Imágenes <span className="text-xs text-muted-foreground">(máx. 5 URLs)</span></Label>
              {imagenes.length < 5 && (
                <Button type="button" variant="ghost" size="sm" onClick={addImagen} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Agregar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {imagenes.map((img, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={img}
                    onChange={(e) => updateImagen(i, e.target.value)}
                    placeholder="https://..."
                    className="bg-secondary border-border font-mono text-xs"
                  />
                  {imagenes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeImagen(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.imagenes && (
              <p className="text-xs text-destructive">
                {errors.imagenes.message || 'Una o más URLs son inválidas'}
              </p>
            )}
          </div>

          <SheetFooter className="mt-auto pt-4 border-t border-border gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear accesorio'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
