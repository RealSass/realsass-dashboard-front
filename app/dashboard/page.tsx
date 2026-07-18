'use client';

import { Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useOrders, useProducts } from '@/features/store/hooks';

export default function DashboardPage() {
  const { organizationId } = useAuth();
  const { data: ordersData } = useOrders(organizationId ?? '', {});
  const { data: productsData } = useProducts(organizationId ?? '', {});

  const totalOrders   = (ordersData as any)?.meta?.total   ?? 0;
  const totalProducts = (productsData as any)?.meta?.total ?? 0;

  const cards = [
    { icon: Package,     label: 'Productos',    value: totalProducts, color: '#60a5fa' },
    { icon: ShoppingBag, label: 'Pedidos',       value: totalOrders,   color: '#34d399' },
    { icon: TrendingUp,  label: 'Campañas',      value: '—',           color: '#fbbf24' },
    { icon: Users,       label: 'Clientes',      value: '—',           color: '#a78bfa' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vista general de tu organización
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" style={{ color }} />
              <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
