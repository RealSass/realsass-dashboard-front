'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, TrendingUp, Eye, MousePointer, DollarSign } from 'lucide-react';
import type { Campana } from '../types';

const ESTADO_COLORS: Record<string, string> = {
  activa: 'bg-green-500/10 text-green-600 border-green-500/20',
  pausada: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  finalizada: 'bg-muted text-muted-foreground border-border',
  borrador: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

interface CampanaCardProps {
  campana: Campana;
  metricas?: { impresiones: number; clics: number; ctr: number; cpc: number; roas: number } | null;
  loadingMetricas?: boolean;
  onExpand?: (id: string) => void;
}

export function CampanaCard({ campana, metricas, loadingMetricas, onExpand }: CampanaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const presupuestoUsado = campana.presupuestoGastado ?? 0;
  const pct = campana.presupuesto > 0 ? Math.min((presupuestoUsado / campana.presupuesto) * 100, 100) : 0;

  function toggle() {
    setExpanded((v) => !v);
    if (!expanded) onExpand?.(campana.id);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{campana.nombre}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{campana.plataforma} &middot; {campana.objetivo}</p>
          </div>
          <Badge variant="outline" className={ESTADO_COLORS[campana.estado] ?? ''}>{campana.estado}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Presupuesto gastado</span>
            <span>${presupuestoUsado.toLocaleString('es-MX')} / ${campana.presupuesto.toLocaleString('es-MX')}</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        <Button variant="ghost" size="sm" className="w-full h-8 text-xs gap-1" onClick={toggle}>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Ocultar metricas' : 'Ver metricas'}
        </Button>

        {expanded && (
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
            {loadingMetricas ? (
              <p className="col-span-2 text-center text-xs text-muted-foreground py-2">Cargando...</p>
            ) : metricas ? (
              <>
                <MetricItem icon={Eye} label="Impresiones" value={metricas.impresiones.toLocaleString('es-MX')} />
                <MetricItem icon={MousePointer} label="Clics" value={metricas.clics.toLocaleString('es-MX')} />
                <MetricItem icon={TrendingUp} label="CTR" value={`${metricas.ctr.toFixed(2)}%`} />
                <MetricItem icon={DollarSign} label="ROAS" value={metricas.roas.toFixed(2)} />
              </>
            ) : (
              <p className="col-span-2 text-center text-xs text-muted-foreground py-2">Sin metricas disponibles</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
