'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { firebaseUser, isLoading } = useAuth();

  useEffect(() => {
    // Solo redirigir cuando Firebase terminó de resolver Y no hay sesión
    if (!isLoading && !firebaseUser) {
      router.replace('/login');
    }
  }, [firebaseUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <MobileHeader />
      <DashboardSidebar />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 bg-background">
        {children}
      </main>
    </div>
  );
}
