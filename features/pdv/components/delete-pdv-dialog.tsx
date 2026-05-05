'use client';

import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { useDeletePdv } from '../hooks';
import type { PuntoDeVenta } from '../types';

interface DeletePdvDialogProps {
  pdv: PuntoDeVenta | null;
  onClose: () => void;
}

export function DeletePdvDialog({ pdv, onClose }: DeletePdvDialogProps) {
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
            Esta accion no se puede deshacer. Se eliminara permanentemente{' '}
            <strong>{pdv?.nombre}</strong>.
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
