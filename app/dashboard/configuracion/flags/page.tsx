'use client';

import { AlertCircle, ToggleLeft, Globe, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useFlags, useUpdateFlag } from '@/features/config-flags/hooks';
import type { FeatureFlag } from '@/features/config/types';
import { cn } from '@/lib/utils';

const SYSTEM_TARGET_LABELS: Record<string, string> = {
  all:      'Todos',
  chat:     'Chat IA',
  payments: 'Pagos',
  ads:      'Campañas',
};

export default function FlagsPage() {
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useFlags(organizationId);
  const flags = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const updateMutation = useUpdateFlag();

  const handleToggle = async (flag: FeatureFlag) => {
    if (!organizationId || !flag.organizationId) return; // flags globales son readonly
    try {
      await updateMutation.mutateAsync({
        key:    flag.key,
        data:   { enabled: !flag.enabled },
        orgId:  organizationId,
      });
      toast.success(`Flag "${flag.key}" ${!flag.enabled ? 'activado' : 'desactivado'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      Error al cargar feature flags.
    </div>
  );

  const orgFlags    = flags.filter((f: FeatureFlag) => f.organizationId);
  const globalFlags = flags.filter((f: FeatureFlag) => !f.organizationId);

  const FlagRow = ({ flag }: { flag: FeatureFlag }) => {
    const isGlobal   = !flag.organizationId;
    const isPending  = updateMutation.isPending && updateMutation.variables?.key === flag.key;

    return (
      <div className={cn(
        'flex items-center justify-between gap-4 rounded-xl border px-4 py-3',
        flag.enabled ? 'border-border bg-card' : 'border-border bg-card opacity-70',
      )}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-sm font-medium text-foreground">{flag.key}</p>
            {isGlobal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border">
                <Globe className="h-2.5 w-2.5" />
                Sistema
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
              {SYSTEM_TARGET_LABELS[flag.systemTarget] ?? flag.systemTarget}
            </span>
            {flag.rolloutPercentage < 100 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600">
                {flag.rolloutPercentage}% rollout
              </span>
            )}
          </div>
          {flag.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{flag.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Switch
            checked={flag.enabled}
            onCheckedChange={() => handleToggle(flag)}
            disabled={isGlobal || isPending}
            title={isGlobal ? 'Los flags globales no son editables desde aquí' : undefined}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {orgFlags.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Flags de tu organización</h2>
          {orgFlags.map((flag: FeatureFlag) => <FlagRow key={flag.id} flag={flag} />)}
        </section>
      )}

      {globalFlags.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Flags globales del sistema (solo lectura)
          </h2>
          {globalFlags.map((flag: FeatureFlag) => <FlagRow key={flag.id} flag={flag} />)}
        </section>
      )}

      {flags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <ToggleLeft className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin feature flags configurados</p>
        </div>
      )}
    </div>
  );
}
