// app/auth/sso/page.tsx
// El dashboard-back ya escribió la cookie HttpOnly en /auth/firebase-sso.
// Esta página solo necesita redirigir al dashboard.
// La cookie viaja con el browser automáticamente.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 }   from 'lucide-react';

export default function SsoPage() {
  const router = useRouter();

  useEffect(() => {
    // La cookie ya fue seteada por el backend cuando real-front llamó firebase-sso.
    // Redirigir directamente al dashboard.
    router.replace('/dashboard');
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
    </main>
  );
}
