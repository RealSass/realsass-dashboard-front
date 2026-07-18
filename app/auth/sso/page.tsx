'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// SSO entry point — Firebase ya completó el login antes de llegar acá.
// Solo redirigir al dashboard.
export default function SsoPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
    </main>
  );
}
