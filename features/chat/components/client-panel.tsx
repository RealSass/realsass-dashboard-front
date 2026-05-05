'use client';

import { X, TrendingUp, ShoppingCart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CanalBadge } from './canal-badge';
import { EtapaBadge, ETAPA_CONFIG } from './etapa-badge';
import type { Conversacion } from '../types';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function Avatar({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <div className={cn('rounded-full bg-accent flex items-center justify-center flex-shrink-0 font-medium text-foreground', className)}>
      {getInitials(nombre)}
    </div>
  );
}

interface ClientePanelProps {
  conversacion: Conversacion;
  onClose: () => void;
  onTomarOportunidad: () => void;
}

export function ClientePanel({ conversacion, onClose, onTomarOportunidad }: ClientePanelProps) {
  const { cliente } = conversacion;
  const etapaCfg = ETAPA_CONFIG[cliente.etapa];

  return (
    <div className="w-72 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Detalle del cliente</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar nombre={cliente.nombre} className="h-16 w-16 text-xl" />
            <div>
              <p className="font-semibold">{cliente.nombre}</p>
              {cliente.telefono && <p className="text-xs text-muted-foreground">{cliente.telefono}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <CanalBadge canal={cliente.canal} />
              <EtapaBadge etapa={cliente.etapa} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapa actual</p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
              <TrendingUp className="h-4 w-4" style={{ color: etapaCfg.color }} />
              <span className="text-sm font-medium" style={{ color: etapaCfg.color }}>{etapaCfg.label}</span>
            </div>
          </div>

          {cliente.preferencias && cliente.preferencias.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferencias detectadas</p>
              <div className="flex flex-wrap gap-1.5">
                {cliente.preferencias.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded-md text-xs bg-secondary text-muted-foreground border border-border">{p}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Historial ({(cliente.historialCompras || []).length})
            </p>
            {(cliente.historialCompras || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin compras registradas</p>
            ) : (
              <div className="space-y-2">
                {cliente.historialCompras.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-secondary space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-tight">{c.producto}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{c.fecha}</span>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>${c.monto.toLocaleString('es-AR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ultima interaccion</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(cliente.ultimaInteraccion).toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {(cliente.etapa === 'prospecto' || cliente.etapa === 'oportunidad') && (
        <div className="p-4 border-t border-border">
          <Button className="w-full gap-2 text-sm" onClick={onTomarOportunidad}>
            <ShoppingCart className="h-4 w-4" />
            Tomar como oportunidad
          </Button>
        </div>
      )}
    </div>
  );
}
