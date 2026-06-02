'use client';

import { AlertCircle, BarChart2, Infinity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useQuotas } from '@/features/config-quotas/hooks';
import { QUOTA_RESOURCE_LABELS } from '@/features/config/types';
import type { QuotaConfig } from '@/features/config/types';
import { cn } from '@/lib/utils';

function QuotaBar({ quota }: { quota: QuotaConfig }) {
  const isUnlimited = quota.limit === -1;
  const pct         = isUnlimited ? 0 : Math.min((quota.currentUsage / quota.limit) * 100, 100);
  const isAlert     = !isUnlimited && pct >= quota.alertAt;
  const isCritical  = !isUnlimited && pct >= 95;
  const label       = QUOTA_RESOURCE_LABELS[quota.resource] ?? quota.resource;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm">{label}</p>
        <p className={cn(
          'text-sm font-mono',
          isCritical ? 'text-destructive' : isAlert ? 'text-amber-500' : 'text-muted-foreground',
        )}>
          {isUnlimited ? (
            <span className="flex items-center gap-1 text-green-500">
              <Infinity className="h-4 w-4" />
              Ilimitado
            </span>
          ) : (
            `${quota.currentUsage} / ${quota.limit}`
          )}
        </p>
      </div>

      {!isUnlimited && (
        <>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isCritical ? 'bg-destructive' : isAlert ? 'bg-amber-500' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{pct.toFixed(0)}% utilizado</span>
            <span>{quota.limit - quota.currentUsage} restante{quota.limit - quota.currentUsage !== 1 ? 's' : ''}</span>
          </div>
          {isAlert && (
            <p className={cn('text-xs flex items-center gap-1', isCritical ? 'text-destructive' : 'text-amber-500')}>
              <AlertCircle className="h-3 w-3" />
              {isCritical ? 'Límite casi alcanzado' : `Alerta al ${quota.alertAt}%`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function QuotasPage() {
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useQuotas(organizationId);
  const quotas = Array.isArray(data) ? data : (data as any)?.data ?? [];

  if (isLoading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      Error al cargar quotas.
    </div>
  );

  if (quotas.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <BarChart2 className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Sin quotas configuradas para esta organización</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Las quotas se crean automáticamente cuando se configura el plan de la org en el config service.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Uso actual de recursos — se actualiza cada 30 segundos.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quotas.map((q: QuotaConfig) => <QuotaBar key={q.id} quota={q} />)}
      </div>
    </div>
  );
}
