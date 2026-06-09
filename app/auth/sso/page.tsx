// app/auth/sso/page.tsx
// Recibe accessToken + refreshToken por query params desde real-front,
// los guarda en localStorage y redirige a /dashboard.
//
// Necesario cuando real-front y dashboard-front corren en dominios distintos
// (localStorage no se comparte entre dominios).
//
// URL de entrada:
//   /auth/sso?token=<accessToken>&refresh=<refreshToken>
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type State = 'processing' | 'success' | 'error';

// Componente interno que usa useSearchParams (debe estar dentro de Suspense)
function SsoHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [state,  setState]  = useState<State>('processing');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const token   = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (!token || !refresh) {
      setState('error');
      setErrMsg('Parámetros de autenticación faltantes. Volvé al sistema principal.');
      return;
    }

    try {
      localStorage.setItem('accessToken',  token);
      localStorage.setItem('refreshToken', refresh);
      setState('success');
      // replace para no dejar /auth/sso en el historial
      setTimeout(() => router.replace('/dashboard'), 600);
    } catch {
      setState('error');
      setErrMsg('Error al guardar la sesión. Intentá nuevamente.');
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
          <p className="text-xs text-muted-foreground text-center max-w-xs">{errMsg}</p>
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

// Default export envuelto en Suspense — requerido por Next.js para useSearchParams
export default function SsoEntryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </main>
      }
    >
      <SsoHandler />
    </Suspense>
  );
}
