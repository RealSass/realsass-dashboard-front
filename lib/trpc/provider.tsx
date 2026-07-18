/**
 * lib/trpc/provider.tsx
 *
 * TrpcProvider — envuelve la app con QueryClientProvider + trpc.Provider.
 * Reutiliza el QueryClient existente si ya hay uno en el árbol.
 * getIdToken y activeOrganizationId vienen del useAuth hook existente.
 */
'use client';

import { useState }                          from 'react';
import { QueryClient, QueryClientProvider }  from '@tanstack/react-query';
import { trpc, createTrpcClient }            from './client';
import { useAuth }                           from '@/features/auth/hooks/use-auth';

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const { getIdToken, organizationId } = useAuth();

  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime:            30_000,
          retry:                1,
          refetchOnWindowFocus: false,
        },
      },
    }),
  );

  const [trpcClient] = useState(() =>
    createTrpcClient(
      () => getIdToken(),
      () => organizationId ?? null,
    ),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
