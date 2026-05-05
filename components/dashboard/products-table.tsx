'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { Producto } from '@/features/products/types';

interface ProductsTableProps {
  products: Producto[];
  isLoading: boolean;
  onEdit: (product: Producto) => void;
  onDelete: (product: Producto) => void;
}

export function ProductsTable({
  products,
  isLoading,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontraron productos</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {products.map((product) => (
          <Card key={product.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{product.modelo}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Badge variant="secondary" className="font-normal text-xs">
                      {product.categoria}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {product.memoria}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {product.color}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(product)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={product.usado ? 'outline' : 'default'}
                    className={
                      product.usado
                        ? 'bg-transparent border-muted-foreground/30 text-muted-foreground text-xs'
                        : 'bg-success/10 text-success border-success/20 text-xs'
                    }
                  >
                    {product.usado ? 'Usado' : 'Nuevo'}
                  </Badge>
                  <span
                    className={`text-xs ${
                      product.stock < 5
                        ? 'text-amber-500 font-medium'
                        : product.stock === 0
                        ? 'text-destructive font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Stock: {product.stock}
                  </span>
                </div>
                <span className="font-semibold">
                  ${parseFloat(product.precio).toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="font-semibold">Modelo</TableHead>
                <TableHead className="font-semibold">Categoría</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Memoria</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Color</TableHead>
                <TableHead className="font-semibold text-right">Precio</TableHead>
                <TableHead className="font-semibold text-center">Stock</TableHead>
                <TableHead className="font-semibold text-center hidden sm:table-cell">Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-secondary/30">
                  <TableCell className="font-medium">{product.modelo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {product.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {product.memoria}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {product.color}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${parseFloat(product.precio).toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        product.stock < 5
                          ? 'text-amber-500 font-medium'
                          : product.stock === 0
                          ? 'text-destructive font-medium'
                          : ''
                      }
                    >
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge
                      variant={product.usado ? 'outline' : 'default'}
                      className={
                        product.usado
                          ? 'bg-transparent border-muted-foreground/30 text-muted-foreground'
                          : 'bg-success/10 text-success border-success/20'
                      }
                    >
                      {product.usado ? 'Usado' : 'Nuevo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(product)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
