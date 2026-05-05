'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function stockStyle(cantidad: number): React.CSSProperties {
  if (cantidad === 0)
    return { background: 'rgba(239,68,68,0.12)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' };
  if (cantidad <= 3)
    return { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.3)' };
  return { background: 'rgba(34,197,94,0.12)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' };
}

export function StockBadge({ cantidad }: { cantidad: number }) {
  return (
    <span
      className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border min-w-[3rem]"
      style={stockStyle(cantidad)}
    >
      {cantidad} uds
    </span>
  );
}

interface StockControlProps {
  item: { id: string; cantidad: number };
  onUpdate: (id: string, cantidad: number) => Promise<void>;
  isPending: boolean;
}

export function StockControl({ item, onUpdate, isPending }: StockControlProps) {
  const [loading, setLoading] = useState<'inc' | 'dec' | null>(null);

  const handleChange = async (delta: number) => {
    const nueva = Math.max(0, item.cantidad + delta);
    if (nueva === item.cantidad) return;
    setLoading(delta > 0 ? 'inc' : 'dec');
    try {
      await onUpdate(item.id, nueva);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Button
        size="icon"
        variant="outline"
        className="h-6 w-6 rounded-full border-border"
        onClick={() => handleChange(-1)}
        disabled={item.cantidad === 0 || !!loading || isPending}
      >
        {loading === 'dec' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="text-sm leading-none">−</span>
        )}
      </Button>

      <StockBadge cantidad={item.cantidad} />

      <Button
        size="icon"
        variant="outline"
        className="h-6 w-6 rounded-full border-border"
        onClick={() => handleChange(1)}
        disabled={!!loading || isPending}
      >
        {loading === 'inc' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="text-sm leading-none">+</span>
        )}
      </Button>
    </div>
  );
}
