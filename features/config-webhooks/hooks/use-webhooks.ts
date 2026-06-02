import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import {
  getWebhooks, createWebhook, testWebhook, deleteWebhook, getWebhookLogs,
} from '../services/webhooks.service';
import type { CreateWebhookInput } from '@/features/config/types';

export function useWebhooks(orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configWebhooks, orgId],
    queryFn:  () => getWebhooks(orgId!),
    enabled:  !!orgId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWebhookLogs(id: string | null, orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configWebhookLogs, id, orgId],
    queryFn:  () => getWebhookLogs(id!, orgId!),
    enabled:  !!id && !!orgId,
    staleTime: 1000 * 30,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, orgId }: { data: CreateWebhookInput; orgId: string }) =>
      createWebhook(data, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configWebhooks }),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      testWebhook(id, orgId),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      deleteWebhook(id, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configWebhooks }),
  });
}
