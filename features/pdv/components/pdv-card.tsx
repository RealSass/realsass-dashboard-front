'use client';

import { Store, Building2, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PuntoDeVenta } from '../types';

interface PdvCardProps {
  pdv: PuntoDeVenta;
  onEdit: (p: PuntoDeVenta) => void;
  onDelete: (p: PuntoDeVenta) => void;
}

export function PdvCard({ pdv, onEdit, onDelete }: PdvCardProps) {
  return (
    <div className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <span
        className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full"
        style={
          pdv.isActive
            ? { background: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,.2)' }
            : { background: '#a1a1aa', boxShadow: '0 0 0 3px rgba(161,161,170,.2)' }
        }
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
          <p className="text-xs text-muted-foreground/60 italic">Sin direccion cargada</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => onEdit(pdv)}>
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
