import { realBackFetch } from '@/lib/api-client';
import type { WebhookEndpoint, CreateWebhookInput, WebhookDeliveryLog } from '@/features/config/types';

const BASE = '/api/v1/config/webhooks';

export const getWebhooks = (orgId: string): Promise<WebhookEndpoint[]> =>
  realBackFetch.get(BASE, orgId);

export const createWebhook = (
  data: CreateWebhookInput,
  orgId: string,
): Promise<WebhookEndpoint & { secret: string }> =>
  realBackFetch.post(BASE, data, orgId);

export const testWebhook = (
  id: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> =>
  realBackFetch.post(`${BASE}/${id}/test`, {}, orgId);

export const deleteWebhook = (
  id: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> =>
  realBackFetch.delete(`${BASE}/${id}`, orgId);

export const getWebhookLogs = (
  id: string,
  orgId: string,
  take = 50,
): Promise<WebhookDeliveryLog[]> =>
  realBackFetch.get(`${BASE}/${id}/logs?take=${take}`, orgId);
