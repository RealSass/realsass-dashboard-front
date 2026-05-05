import type { EstadoTransaccion } from '../types';

const ESTADO_CONFIG: Record<EstadoTransaccion, { label: string; bg: string; color: string; border: string }> = {
  completado:  { label: 'Completado',  bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
  pendiente:   { label: 'Pendiente',   bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
  fallido:     { label: 'Fallido',     bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  reembolsado: { label: 'Reembolsado', bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: 'rgba(99,102,241,0.3)'  },
};

export function TransactionStatusBadge({ estado }: { estado: EstadoTransaccion }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}
