'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateProduct, useUpdateProduct } from '@/features/products/hooks';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Producto } from '@/types/api';

type ProductCategory = 'iPhone' | 'iPad' | 'Mac' | 'Watch' | 'AirPods' | 'Accesorios';

const categories: ProductCategory[] = [
  'iPhone',
  'iPad',
  'Mac',
  'Watch',
  'AirPods',
  'Accesorios',
];

const memorias = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const colores = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Dorado', 'Plata', 'Gris Espacial'];

const productSchema = z.object({
  modelo: z.string().min(1, 'El modelo es requerido'),
  categoria: z.enum(['iPhone', 'iPad', 'Mac', 'Watch', 'AirPods', 'Accesorios']),
  memoria: z.string().min(1, 'La memoria es requerida'),
  color: z.string().min(1, 'El color es requerido'),
  precio: z.coerce.number().positive('El precio debe ser mayor a 0'),
  bateria: z.coerce.number().min(0).max(100).nullable().optional(),
  usado: z.boolean(),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo'),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Producto | null;
}

export function ProductModal({ open, onClose, product }: ProductModalProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      modelo: '',
      categoria: 'iPhone',
      memoria: '128GB',
      color: 'Negro',
      precio: 0,
      bateria: null,
      usado: false,
      stock: 0,
    },
  });

  const usado = watch('usado');
  const categoria = watch('categoria');
  const memoria = watch('memoria');
  const color = watch('color');

  useEffect(() => {
    if (product) {
      reset({
        modelo: product.modelo,
        categoria: product.categoria,
        memoria: product.memoria,
        color: product.color,
        precio: parseFloat(product.precio),
        bateria: product.bateria,
        usado: product.usado,
        stock: product.stock,
      });
    } else {
      reset({
        modelo: '',
        categoria: 'iPhone',
        memoria: '128GB',
        color: 'Negro',
        precio: 0,
        bateria: null,
        usado: false,
        stock: 0,
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEditing) {
        await updateProduct.mutateAsync({
          id: product.id,
          data,
        });
        toast.success('Producto actualizado correctamente');
      } else {
        await createProduct.mutateAsync(data);
        toast.success('Producto creado correctamente');
      }
      onClose();
    } catch {
      toast.error(
        isEditing ? 'Error al actualizar el producto' : 'Error al crear el producto'
      );
    }
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                placeholder="iPhone 15 Pro Max"
                {...register('modelo')}
                className="bg-secondary border-border"
              />
              {errors.modelo && (
                <p className="text-xs text-destructive">{errors.modelo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={categoria}
                onValueChange={(value) => setValue('categoria', value as ProductCategory)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria && (
                <p className="text-xs text-destructive">{errors.categoria.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Memoria</Label>
              <Select
                value={memoria}
                onValueChange={(value) => setValue('memoria', value)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {memorias.map((mem) => (
                    <SelectItem key={mem} value={mem}>
                      {mem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.memoria && (
                <p className="text-xs text-destructive">{errors.memoria.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={color}
                onValueChange={(value) => setValue('color', value)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colores.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.color && (
                <p className="text-xs text-destructive">{errors.color.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio">Precio (MXN)</Label>
              <Input
                id="precio"
                type="number"
                step="0.01"
                placeholder="29999.00"
                {...register('precio')}
                className="bg-secondary border-border"
              />
              {errors.precio && (
                <p className="text-xs text-destructive">{errors.precio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                placeholder="10"
                {...register('stock')}
                className="bg-secondary border-border"
              />
              {errors.stock && (
                <p className="text-xs text-destructive">{errors.stock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bateria">Batería (%)</Label>
              <Input
                id="bateria"
                type="number"
                min="0"
                max="100"
                placeholder="100"
                {...register('bateria')}
                className="bg-secondary border-border"
              />
              {errors.bateria && (
                <p className="text-xs text-destructive">{errors.bateria.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="usado"
                checked={usado}
                onCheckedChange={(checked) => setValue('usado', checked)}
              />
              <Label htmlFor="usado">Producto usado</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Producto'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
