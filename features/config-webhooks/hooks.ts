/**
 * features/config-webhooks/hooks.ts
 *
 * useWebhooks(orgId)      → trpc.configWebhooks.list
 * useWebhookLogs(id)      → trpc.configWebhooks.getLogs
 * useCreateWebhook()      → trpc.configWebhooks.create
 * useTestWebhook()        → trpc.configWebhooks.test
 * useDeleteWebhook()      → trpc.configWebhooks.remove
 */
import { trpc } from '@/lib/trpc/client';

export function useWebhooks(organizationId: string | null | undefined) {
  return trpc.configWebhooks.list.useQuery(
    undefined,
    { enabled: !!organizationId },
  );
}

export function useWebhookLogs(webhookId: string | null | undefined) {
  return trpc.configWebhooks.getLogs.useQuery(
    { webhookId: webhookId!, take: 50 },
    { enabled: !!webhookId },
  );
}

export function useCreateWebhook() {
  const utils = trpc.useUtils();
  return trpc.configWebhooks.create.useMutation({
    onSuccess: () => void utils.configWebhooks.list.invalidate(),
  });
}

export function useTestWebhook() {
  return trpc.configWebhooks.test.useMutation();
}

export function useDeleteWebhook() {
  const utils = trpc.useUtils();
  return trpc.configWebhooks.remove.useMutation({
    onSuccess: () => void utils.configWebhooks.list.invalidate(),
  });
}
