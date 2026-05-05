'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { ProductFilters, ProductCategory } from '@/features/products/types';
import { X, SlidersHorizontal } from 'lucide-react';

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

interface ProductsFiltersProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}

export function ProductsFilters({
  filters,
  onFiltersChange,
}: ProductsFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const updateFilter = <K extends keyof ProductFilters>(
    key: K,
    value: ProductFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value, page: 1 });
  };

  const clearFilters = () => {
    onFiltersChange({ page: 1, limit: filters.limit });
    setMobileOpen(false);
  };

  const hasActiveFilters =
    filters.categoria ||
    filters.memoria ||
    filters.color ||
    filters.usado !== undefined ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.stockDisponible;

  const activeFilterCount = [
    filters.categoria,
    filters.memoria,
    filters.color,
    filters.usado,
    filters.minPrice,
    filters.maxPrice,
    filters.stockDisponible,
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-4">
        <div className="col-span-2 sm:col-span-1 md:w-40">
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Categoría
          </Label>
          <Select
            value={filters.categoria || 'all'}
            onValueChange={(value) =>
              updateFilter('categoria', value === 'all' ? undefined : (value as ProductCategory))
            }
          >
            <SelectTrigger className="h-9 bg-secondary border-border">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:w-32">
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Memoria
          </Label>
          <Select
            value={filters.memoria || 'all'}
            onValueChange={(value) =>
              updateFilter('memoria', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="h-9 bg-secondary border-border">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {memorias.map((mem) => (
                <SelectItem key={mem} value={mem}>
                  {mem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:w-36">
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Color
          </Label>
          <Select
            value={filters.color || 'all'}
            onValueChange={(value) =>
              updateFilter('color', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="h-9 bg-secondary border-border">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {colores.map((color) => (
                <SelectItem key={color} value={color}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:w-28">
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Precio Min
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={filters.minPrice || ''}
            onChange={(e) =>
              updateFilter(
                'minPrice',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-9 bg-secondary border-border"
          />
        </div>

        <div className="md:w-28">
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Precio Max
          </Label>
          <Input
            type="number"
            placeholder="999999"
            value={filters.maxPrice || ''}
            onChange={(e) =>
              updateFilter(
                'maxPrice',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-9 bg-secondary border-border"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="usado-mobile"
            checked={filters.usado === true}
            onCheckedChange={(checked) =>
              updateFilter('usado', checked ? true : undefined)
            }
          />
          <Label htmlFor="usado-mobile" className="text-sm">
            Solo usados
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="stock-mobile"
            checked={filters.stockDisponible === true}
            onCheckedChange={(checked) =>
              updateFilter('stockDisponible', checked ? true : undefined)
            }
          />
          <Label htmlFor="stock-mobile" className="text-sm">
            Con stock
          </Label>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2 relative">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <FilterContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:block">
        <FilterContent />
      </div>
    </>
  );
}
