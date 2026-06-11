// app/auth/sso/page.tsx
//
// Página intermediaria para SSO cross-domain.
//
// El real-front redirige aquí con el Firebase ID Token como query param:
//   /auth/sso?firebase_token=<FIREBASE_ID_TOKEN>
//
// Esta página NO usa el JWT del dashboard-back directamente.
// Usa el Firebase token para hacer sign in en Firebase client SDK,
// lo que restaura la sesión de Firebase en este dominio.
// Luego redirige a /dashboard donde el AuthContext ya encuentra fbUser != null.
//
// ALTERNATIVA si same-domain: el redirect directo a /dashboard funciona
// porque Firebase comparte IndexedDB. Solo necesitás esta página
// si real-front y dashboard-front están en dominios distintos.
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken, getAuth } from 'firebase/auth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type State = 'processing' | 'success' | 'error';

function SsoHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [state,  setState]  = useState<State>('processing');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const firebaseToken = searchParams.get('firebase_token');
    const fallbackToken = searchParams.get('token'); // compatibilidad hacia atrás

    // Si no hay token Firebase, redirigir directo (mismo dominio / misma sesión)
    if (!firebaseToken && !fallbackToken) {
      // Sin parámetros → asumir que Firebase ya tiene sesión (same-domain SSO)
      setTimeout(() => router.replace('/dashboard'), 100);
      return;
    }

    if (firebaseToken) {
      // Cross-domain: usar el token Firebase para iniciar sesión
      (async () => {
        try {
          const auth = getAuth();
          await signInWithCustomToken(auth, firebaseToken);
          setState('success');
          setTimeout(() => router.replace('/dashboard'), 500);
        } catch (err) {
          console.error('[SSO] signInWithCustomToken falló:', err);
          // Intentar igual ir al dashboard (puede que Firebase ya tenga sesión)
          setState('success');
          setTimeout(() => router.replace('/dashboard'), 500);
        }
      })();
    } else {
      // Solo tiene ?token= (JWT del dashboard-back, no Firebase)
      // Guardarlo por compatibilidad y redirigir — Firebase puede ya tener sesión
      if (fallbackToken) {
        try { localStorage.setItem('accessToken', fallbackToken); } catch { /* ignore */ }
      }
      setState('success');
      setTimeout(() => router.replace('/dashboard'), 300);
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      {state === 'processing' && (
        <><Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Iniciando sesión...</p></>
      )}
      {state === 'success' && (
        <><CheckCircle className="h-10 w-10 text-emerald-500" />
        <p className="text-sm text-muted-foreground">Redirigiendo...</p></>
      )}
      {state === 'error' && (
        <><XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm font-medium">{errMsg}</p>
        <button onClick={() => window.history.back()} className="text-xs text-primary hover:underline">Volver</button></>
      )}
    </main>
  );
}

export default function SsoEntryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </main>
    }>
      <SsoHandler />
    </Suspense>
  );
}
