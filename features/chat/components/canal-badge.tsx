import { Phone, Instagram, Globe, MessageSquare } from 'lucide-react';
import type { Canal } from '../types';

const CANAL_CONFIG: Record<Canal, { label: string; color: string; Icon: React.ElementType }> = {
  whatsapp:  { label: 'WhatsApp',  color: 'rgba(37,211,102,0.15)',  Icon: Phone },
  instagram: { label: 'Instagram', color: 'rgba(225,48,108,0.15)',  Icon: Instagram },
  telegram:  { label: 'Telegram',  color: 'rgba(36,161,222,0.15)',  Icon: MessageSquare },
  web:       { label: 'Web',       color: 'rgba(120,120,120,0.15)', Icon: Globe },
};

export function CanalBadge({ canal }: { canal: Canal }) {
  const cfg  = CANAL_CONFIG[canal];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
      style={{ background: cfg.color, color: 'var(--foreground)', borderColor: cfg.color }}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}
