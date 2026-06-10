// app/dashboard/layout.tsx
//
// Guard de ruta del dashboard.
//
// REGLA DE REDIRECT:
//   - Si isLoading → mostrar spinner (Firebase todavía restaurando sesión)
//   - Si !isLoading && !firebaseUser → redirigir a /login (no autenticado)
//   - Si !isLoading && firebaseUser → mostrar dashboard (aunque user/orgId sigan cargando)
//
// Por qué usamos firebaseUser y no isAuthenticated:
//   isAuthenticated = !!firebaseUser en el AuthContext actualizado.
//   Pero ser explícito con firebaseUser documenta mejor la intención.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo redirigir cuando Firebase terminó de resolver la sesión
    // y definitivamente no hay usuario
    if (!isLoading && !firebaseUser) {
      router.replace('/login');
    }
  }, [firebaseUser, isLoading, router]);

  // Mientras Firebase restaura la sesión (IndexedDB → auth state)
  // mostramos un spinner en lugar de redirigir
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Firebase terminó de resolver y no hay sesión → redirect (useEffect lo maneja)
  if (!firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
