/**
 * lib/trpc/client.ts
 *
 * Cliente tRPC para realsass-dashboard-front.
 * Conecta con real-back en /api/v1/trpc.
 *
 * Headers por request:
 *   Authorization: Bearer <token Firebase>
 *   x-organization-id: <organizationId activo>
 */
'use client';

import { createTRPCReact }  from '@trpc/react-query';
import { httpBatchLink }    from '@trpc/client';
import type { AppRouter } from './router-type';

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient(
  getToken:          () => Promise<string | null>,
  getOrganizationId: () => string | null,
) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env['NEXT_PUBLIC_API_URL']}/trpc`,
        async headers() {
          const token = await getToken();
          const orgId = getOrganizationId();
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(orgId  ? { 'x-organization-id': orgId }      : {}),
          };
        },
      }),
    ],
  });
}
