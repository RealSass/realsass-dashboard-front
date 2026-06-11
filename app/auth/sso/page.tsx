// app/auth/sso/page.tsx
// Recibe el JWT del dashboard-back via query params desde real-front.
// Lo guarda en localStorage y redirige a /dashboard.
//
// URL de entrada (generada por real-front/hooks/use-dashboard-sso.ts):
//   /auth/sso?token=<JWT_ACCESS>&refresh=<JWT_REFRESH>
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type State = 'processing' | 'success' | 'error';

const ACCESS_KEY  = 'dash_access_token';
const REFRESH_KEY = 'dash_refresh_token';

function SsoHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [state,  setState]  = useState<State>('processing');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const token   = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (!token) {
      setState('error');
      setErrMsg('Token de sesión faltante. Volvé al sistema principal e intentá de nuevo.');
      return;
    }

    try {
      // Guardar con las keys nuevas
      localStorage.setItem(ACCESS_KEY,  token);
      if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
      // También guardar con keys legacy por compatibilidad con código existente
      localStorage.setItem('accessToken',  token);
      if (refresh) localStorage.setItem('refreshToken', refresh);

      setState('success');
      // replace: no dejar /auth/sso en el historial del browser
      setTimeout(() => router.replace('/dashboard'), 400);
    } catch {
      setState('error');
      setErrMsg('Error al guardar la sesión. El browser puede tener localStorage bloqueado.');
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      {state === 'processing' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle className="h-10 w-10 text-emerald-500" />
          <p className="text-sm text-muted-foreground">Sesión iniciada. Redirigiendo...</p>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-foreground">Error de autenticación</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs px-4">{errMsg}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Volver
          </button>
        </>
      )}
    </main>
  );
}

export default function SsoEntryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </main>
    }>
      <SsoHandler />
    </Suspense>
  );
}
