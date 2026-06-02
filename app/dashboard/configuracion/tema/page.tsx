'use client';

import { useState } from 'react';
import { Check, Plus, Trash2, Loader2, AlertCircle, Star, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useThemes, useCreateTheme, useActivateTheme, useDeleteTheme } from '@/features/config-themes/hooks';
import type { ThemeConfig, CreateThemeInput } from '@/features/config/types';
import { cn } from '@/lib/utils';

const FONT_OPTIONS = ['DM Sans', 'Inter', 'Poppins', 'Geist', 'Roboto', 'Open Sans'];
const RADIUS_OPTIONS = [
  { label: 'Ninguno',  value: '0rem'    },
  { label: 'Pequeño',  value: '0.25rem' },
  { label: 'Mediano',  value: '0.5rem'  },
  { label: 'Grande',   value: '0.75rem' },
  { label: 'Extra',    value: '1rem'    },
  { label: 'Completo', value: '1.5rem'  },
];

function ThemePreview({ theme }: { theme: ThemeConfig }) {
  return (
    <div
      className="rounded-lg border p-3 space-y-2 text-xs"
      style={{
        background:   theme.secondaryColor,
        borderColor:  theme.primaryColor + '40',
        fontFamily:   theme.fontFamily + ', sans-serif',
        borderRadius: theme.borderRadius,
      }}
    >
      <div
        className="h-5 rounded-sm flex items-center px-2 text-white text-[10px] font-medium"
        style={{ background: theme.primaryColor, borderRadius: theme.borderRadius }}
      >
        {theme.name}
      </div>
      <div className="flex gap-1.5">
        {[theme.primaryColor, theme.secondaryColor, theme.accentColor ?? theme.primaryColor].map((c, i) => (
          <div
            key={i}
            className="size-4 rounded border border-black/10"
            style={{ background: c }}
            title={c}
          />
        ))}
        <span className="text-[10px] text-gray-500 ml-1">{theme.fontFamily}</span>
      </div>
    </div>
  );
}

const EMPTY_FORM: CreateThemeInput = {
  name: '', primaryColor: '#000000', secondaryColor: '#ffffff',
  accentColor: '', fontFamily: 'DM Sans', borderRadius: '0.75rem',
  logoUrl: '', darkMode: false,
};

export default function TemaPage() {
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useThemes(organizationId);
  const themes  = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const createMutation   = useCreateTheme();
  const activateMutation = useActivateTheme();
  const deleteMutation   = useDeleteTheme();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting]   = useState<ThemeConfig | null>(null);
  const [form, setForm]           = useState<CreateThemeInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('El nombre es requerido'); return; }
    if (!organizationId) return;
    setFormError(null);
    try {
      await createMutation.mutateAsync({ data: form, orgId: organizationId });
      toast.success('Tema creado');
      setModalOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear tema');
    }
  };

  const handleActivate = async (id: string) => {
    if (!organizationId) return;
    try {
      await activateMutation.mutateAsync({ id, orgId: organizationId });
      toast.success('Tema activado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleting || !organizationId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleting.id, orgId: organizationId });
      toast.success('Tema eliminado');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  if (isLoading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      Error al cargar temas. Verificá que el config service esté disponible.
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{themes.length} tema{themes.length !== 1 ? 's' : ''}</p>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo tema
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme: ThemeConfig) => (
          <div
            key={theme.id}
            className={cn(
              'rounded-xl border p-4 space-y-3 transition-colors',
              theme.isActive
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-border/60',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm flex items-center gap-1.5">
                  {theme.name}
                  {theme.isActive && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                </p>
                {theme.isSystemDefault && (
                  <span className="text-[10px] text-muted-foreground">Sistema</span>
                )}
              </div>
              {!theme.isSystemDefault && !theme.isActive && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => setDeleting(theme)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <ThemePreview theme={theme} />

            {!theme.isActive && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleActivate(theme.id)}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Check className="h-3.5 w-3.5" />
                }
                Activar
              </Button>
            )}
            {theme.isActive && (
              <p className="text-center text-xs text-primary font-medium">✓ Activo</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal crear tema */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo tema</DialogTitle>
            <DialogDescription>Personalizá los colores y la tipografía de tu organización.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="ej: Mi marca" className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Color primario</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primaryColor ?? '#000000'}
                    onChange={(e) => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                    className="h-9 w-12 rounded border border-input cursor-pointer" />
                  <Input value={form.primaryColor ?? ''} onChange={(e) => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                    className="bg-secondary border-border font-mono text-xs" placeholder="#000000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color secundario</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.secondaryColor ?? '#ffffff'}
                    onChange={(e) => setForm(p => ({ ...p, secondaryColor: e.target.value }))}
                    className="h-9 w-12 rounded border border-input cursor-pointer" />
                  <Input value={form.secondaryColor ?? ''} onChange={(e) => setForm(p => ({ ...p, secondaryColor: e.target.value }))}
                    className="bg-secondary border-border font-mono text-xs" placeholder="#ffffff" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color de acento</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.accentColor ?? '#666666'}
                  onChange={(e) => setForm(p => ({ ...p, accentColor: e.target.value }))}
                  className="h-9 w-12 rounded border border-input cursor-pointer" />
                <Input value={form.accentColor ?? ''} onChange={(e) => setForm(p => ({ ...p, accentColor: e.target.value }))}
                  className="bg-secondary border-border font-mono text-xs" placeholder="#666666" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipografía</Label>
              <select value={form.fontFamily ?? 'DM Sans'}
                onChange={(e) => setForm(p => ({ ...p, fontFamily: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-secondary px-3 text-sm">
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Radio de bordes</Label>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map(({ label, value }) => (
                  <button key={value}
                    onClick={() => setForm(p => ({ ...p, borderRadius: value }))}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-md border transition-colors',
                      form.borderRadius === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary border-border hover:border-primary/40',
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL del logo (opcional)</Label>
              <Input value={form.logoUrl ?? ''}
                onChange={(e) => setForm(p => ({ ...p, logoUrl: e.target.value }))}
                placeholder="https://..." className="bg-secondary border-border" />
            </div>

            {/* Preview en tiempo real */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Preview</Label>
              <ThemePreview theme={{
                id: 'preview', name: form.name || 'Preview',
                organizationId: null, isActive: false, isSystemDefault: false,
                primaryColor: form.primaryColor ?? '#000000',
                secondaryColor: form.secondaryColor ?? '#ffffff',
                accentColor: form.accentColor ?? null,
                fontFamily: form.fontFamily ?? 'DM Sans',
                borderRadius: form.borderRadius ?? '0.75rem',
                logoUrl: null, faviconUrl: null, darkMode: false, customCSS: null,
                createdAt: '', updatedAt: '',
              }} />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />{formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear tema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleting && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar tema</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminás el tema <strong>{deleting.name}</strong>? Esta acción no puede deshacerse.
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
