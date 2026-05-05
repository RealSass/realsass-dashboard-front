import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, Clock, XCircle, CreditCard } from 'lucide-react';
import { formatMoney } from '@/lib/helpers';
import { useBalanceSummary } from '../hooks';

export function BalanceCards() {
  const { data: balance, isLoading, error } = useBalanceSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-card border border-border text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        No se pudo cargar el resumen de balance
      </div>
    );
  }

  const cards = [
    { icon: TrendingUp, label: 'Total ingresos', value: formatMoney(balance.totalIngresos, balance.moneda), color: '#4ade80' },
    { icon: Clock,      label: 'Pendiente',      value: formatMoney(balance.totalPendiente, balance.moneda), color: '#fbbf24' },
    { icon: XCircle,    label: 'Fallido',         value: formatMoney(balance.totalFallido, balance.moneda),  color: '#f87171' },
    { icon: CreditCard, label: 'Tx hoy',          value: String(balance.transaccionesHoy),                   color: undefined  },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" style={color ? { color } : undefined} />
            <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
          </div>
          <p className="text-2xl font-bold tracking-tight" style={color ? { color } : undefined}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
