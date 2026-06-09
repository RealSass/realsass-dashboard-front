// app/auth/sso/page.tsx
// Página de entrada SSO — recibe tokens por query params desde real-front,
// los guarda en localStorage y redirige al dashboard.
//
// URL de entrada:
//   https://dashboard-front.dominio.com/auth/sso
//     ?token=<accessToken>
//     &refresh=<refreshToken>
//
// Esta página es necesaria cuando real-front y dashboard-front
// corren en dominios distintos (localStorage no es compartido).
//
// Seguridad:
//   - Los tokens son de corta vida (15 min) — sin valor si se interceptan tarde
//   - Siempre usar HTTPS en producción (la URL queda cifrada en tránsito)
//   - La página no muestra los tokens en pantalla
//   - Redirige a /dashboard inmediatamente después de guardar

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type PageState = 'processing' | 'success' | 'error';

export default function SsoEntryPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token   = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (!token || !refresh) {
      setState('error');
      setErrorMsg('Parámetros de autenticación faltantes. Volvé al sistema principal.');
      return;
    }

    try {
      // Guardar en localStorage del dominio del dashboard-front
      localStorage.setItem('accessToken',  token);
      localStorage.setItem('refreshToken', refresh);

      setState('success');

      // Limpiar params de la URL y redirigir al dashboard
      // Usamos replace para que /auth/sso no quede en el historial
      setTimeout(() => {
        router.replace('/dashboard');
      }, 600);

    } catch (err) {
      setState('error');
      setErrorMsg('Error al guardar la sesión. Intentá nuevamente.');
      console.error('SSO error:', err);
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
          <p className="text-xs text-muted-foreground text-center max-w-xs">{errorMsg}</p>
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
