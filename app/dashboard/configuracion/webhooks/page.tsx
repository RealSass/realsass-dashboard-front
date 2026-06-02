'use client';

import { useState } from 'react';
import {
  Plus, Trash2, Play, ChevronRight, AlertCircle,
  Check, X, Loader2, Clock, Webhook as WebhookIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useWebhooks, useWebhookLogs, useCreateWebhook, useTestWebhook, useDeleteWebhook,
} from '@/features/config-webhooks/hooks';
import { WEBHOOK_EVENTS } from '@/features/config/types';
import type { WebhookEndpoint, CreateWebhookInput } from '@/features/config/types';
import { cn } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function WebhooksPage() {
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useWebhooks(organizationId);
  const webhooks = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const createMutation = useCreateWebhook();
  const testMutation   = useTestWebhook();
  const deleteMutation = useDeleteWebhook();

  const [createOpen, setCreateOpen]  = useState(false);
  const [logsWh, setLogsWh]          = useState<WebhookEndpoint | null>(null);
  const [deleting, setDeleting]      = useState<WebhookEndpoint | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // Form
  const [form, setForm]       = useState<CreateWebhookInput>({ url: '', events: [] });
  const [formError, setFormError] = useState<string | null>(null);

  const toggleEvent = (key: string) => {
    setForm(p => ({
      ...p,
      events: p.events.includes(key)
        ? p.events.filter(e => e !== key)
        : [...p.events, key],
    }));
  };

  const handleCreate = async () => {
    if (!form.url.trim()) { setFormError('La URL es requerida'); return; }
    if (form.events.length === 0) { setFormError('Seleccioná al menos un evento'); return; }
    if (!organizationId) return;
    setFormError(null);
    try {
      const result = await createMutation.mutateAsync({ data: form, orgId: organizationId });
      const secret = (result as any).secret as string | undefined;
      setCreateOpen(false);
      setForm({ url: '', events: [] });
      if (secret) setCreatedSecret(secret);
      toast.success('Webhook creado');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear');
    }
  };

  const handleTest = async (id: string) => {
    if (!organizationId) return;
    try {
      await testMutation.mutateAsync({ id, orgId: organizationId });
      toast.success('Webhook de prueba enviado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleting || !organizationId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleting.id, orgId: organizationId });
      toast.success('Webhook eliminado');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      Error al cargar webhooks.
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <WebhookIcon className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin webhooks configurados</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Crear primero
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: WebhookEndpoint) => (
            <div key={wh.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm truncate text-foreground">{wh.url}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(wh.events as string[]).map(e => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                        {e}
                      </span>
                    ))}
                  </div>
                  {wh.failureCount > 0 && (
                    <p className="text-xs text-destructive mt-1">{wh.failureCount} fallo{wh.failureCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => setLogsWh(wh)} title="Ver logs">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => handleTest(wh.id)}
                    disabled={testMutation.isPending}
                    title="Probar webhook">
                    {testMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleting(wh)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo webhook</DialogTitle>
            <DialogDescription>El secreto se muestra solo una vez al crear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>URL destino *</Label>
              <Input value={form.url}
                onChange={(e) => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://mi-servidor.com/webhook"
                className="bg-secondary border-border font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Eventos *</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={form.events.includes(key)}
                      onChange={() => toggleEvent(key)}
                      className="size-4 rounded accent-primary" />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />{formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal secreto — mostrar una sola vez */}
      <Dialog open={!!createdSecret} onOpenChange={(o) => { if (!o) setCreatedSecret(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secreto del webhook</DialogTitle>
            <DialogDescription className="text-amber-600 font-medium">
              ⚠ Copiá este secreto ahora. No se va a volver a mostrar.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-3 font-mono text-sm break-all select-all">
            {createdSecret}
          </div>
          <p className="text-xs text-muted-foreground">
            Usalo para verificar la firma <code>X-Webhook-Signature</code> en tus endpoints.
          </p>
          <DialogFooter>
            <Button onClick={() => {
              if (createdSecret) navigator.clipboard.writeText(createdSecret);
              toast.success('Secreto copiado');
            }} variant="outline" className="gap-2">
              <Check className="h-4 w-4" />
              Copiar secreto
            </Button>
            <Button onClick={() => setCreatedSecret(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de logs */}
      {logsWh && (
        <DeliveryLogsSheet wh={logsWh} orgId={organizationId} onClose={() => setLogsWh(null)} />
      )}

      {/* Confirm delete */}
      {deleting && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar webhook</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminás el webhook <strong className="font-mono text-sm">{deleting.url}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ── Sheet de delivery logs ─────────────────────────────────────────────────────
function DeliveryLogsSheet({
  wh, orgId, onClose,
}: {
  wh: WebhookEndpoint;
  orgId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useWebhookLogs(wh.id, orgId);
  const logs = Array.isArray(data) ? data : (data as any)?.data ?? [];

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Delivery logs</SheetTitle>
          <SheetDescription className="font-mono text-xs truncate">{wh.url}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin entregas registradas</p>
            </div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className={cn(
                'rounded-lg border px-3 py-2.5 space-y-1',
                log.success ? 'border-green-500/20 bg-green-50/5' : 'border-destructive/20 bg-destructive/5',
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {log.success
                      ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    }
                    <span className="font-mono text-xs text-muted-foreground">{log.event}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    {log.statusCode && <span className={cn('font-mono', log.success ? 'text-green-600' : 'text-destructive')}>{log.statusCode}</span>}
                    {log.duration && <span>{log.duration}ms</span>}
                    {log.attempt > 1 && <span className="text-amber-500">intento {log.attempt}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{formatDate(log.createdAt)}</span>
                  {log.error && (
                    <span className="text-[10px] text-destructive truncate max-w-[200px]">{log.error}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
