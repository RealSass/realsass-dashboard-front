import { apiClient } from '@/lib/api-client';
import type { WebhookEndpoint, CreateWebhookInput, WebhookDeliveryLog } from '@/features/config/types';

const BASE = '/config/webhooks';

export const getWebhooks = (orgId: string): Promise<WebhookEndpoint[]> =>
  apiClient.get('config', BASE, orgId);

export const createWebhook = (
  data: CreateWebhookInput,
  orgId: string,
): Promise<WebhookEndpoint & { secret: string }> =>
  apiClient.post('config', BASE, data, orgId);

export const testWebhook = (
  id: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> =>
  apiClient.post('config', `${BASE}/${id}/test`, {}, orgId);

export const deleteWebhook = (
  id: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> =>
  apiClient.delete('config', `${BASE}/${id}`, orgId);

export const getWebhookLogs = (
  id: string,
  orgId: string,
  take = 50,
): Promise<WebhookDeliveryLog[]> =>
  apiClient.get('config', `${BASE}/${id}/logs?take=${take}`, orgId);
