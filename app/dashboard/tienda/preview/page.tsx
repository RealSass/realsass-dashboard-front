'use client';

import { ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';

export default function PreviewPage() {
  const { activeOrg } = useAuth();
  const storeFrontUrl = process.env.NEXT_PUBLIC_STORE_FRONT_URL;

  if (!storeFrontUrl) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
        <AlertTriangle className="h-4 w-4" />
        NEXT_PUBLIC_STORE_FRONT_URL no está configurado.
      </div>
    );
  }

  const previewUrl = `${storeFrontUrl}${activeOrg?.slug ? `?org=${activeOrg.slug}` : ''}`;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
            Abrir en nueva pestaña
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden bg-background" style={{ height: '75vh' }}>
        <iframe
          src={previewUrl}
          className="w-full h-full"
          title="Vista previa de la tienda"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Si la vista previa no carga (algunos navegadores bloquean iframes cross-origin),
        usá "Abrir en nueva pestaña".
      </p>
    </div>
  );
}
