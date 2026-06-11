'use client';

// Login del dashboard-front
// Usa Google (Firebase) en el CLIENTE para obtener el Firebase ID Token,
// luego lo intercambia por JWT del dashboard-back via /auth/firebase-sso.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';

const ACCESS_KEY  = 'dash_access_token';
const REFRESH_KEY = 'dash_refresh_token';

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_DASHBOARD_API_URL ?? 'http://localhost:3001/api/v1')
    .replace(/\/+$/, '');
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGoogleLogin = async () => {
    setBusy(true);
    try {
      // Importar Firebase dinámicamente (solo si la app lo necesita para login local)
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

      const firebaseConfig = {
        apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      };

      const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const firebaseToken = await result.user.getIdToken();

      // Intercambiar Firebase token por JWT del dashboard-back
      const res = await fetch(`${getBaseUrl()}/auth/firebase-sso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseIdToken: firebaseToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `Error ${res.status}`);
      }

      const json = await res.json() as Record<string, unknown>;
      const data = (json['data'] ?? json) as Record<string, unknown>;
      const access  = data['accessToken']  as string | undefined;
      const refresh = data['refreshToken'] as string | undefined;

      if (!access || !refresh) throw new Error('Respuesta inválida del servidor');

      localStorage.setItem(ACCESS_KEY,  access);
      localStorage.setItem(REFRESH_KEY, refresh);
      localStorage.setItem('accessToken',  access);   // legacy compat
      localStorage.setItem('refreshToken', refresh);  // legacy compat

      // Reload para que AuthProvider lea los nuevos tokens
      window.location.href = '/dashboard';

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión');
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Building2 className="h-7 w-7" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Propiedad Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Plataforma de gestión inmobiliaria</p>
          </div>
        </div>

        <Button
          onClick={handleGoogleLogin}
          disabled={busy}
          className="w-full h-11 gap-3 text-sm font-medium"
          variant="outline"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {busy ? 'Iniciando sesión...' : 'Continuar con Google'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Solo para usuarios autorizados de la plataforma.
        </p>
      </div>
    </main>
  );
}
