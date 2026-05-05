import type { EtapaCliente } from '../types';

export const ETAPA_CONFIG: Record<EtapaCliente, { label: string; bg: string; color: string; border: string }> = {
  prospecto:   { label: 'Prospecto',   bg: 'rgba(120,120,120,0.15)', color: '#a1a1aa', border: 'rgba(120,120,120,0.3)' },
  oportunidad: { label: 'Oportunidad', bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
  post_venta:  { label: 'Post-Venta',  bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  recompra:    { label: 'Recompra',    bg: 'rgba(34,197,94,0.15)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
  inactivo:    { label: 'Inactivo',    bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.3)'   },
};

export function EtapaBadge({ etapa }: { etapa: EtapaCliente }) {
  const cfg = ETAPA_CONFIG[etapa];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}
