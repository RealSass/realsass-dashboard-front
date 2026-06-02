import { apiClient } from '@/lib/api-client';
import type { QuotaConfig } from '@/features/config/types';

export const getQuotas = (orgId: string): Promise<QuotaConfig[]> =>
  apiClient.get('config', '/config/quotas', orgId);

export const updateQuotaLimit = (
  resource: string,
  limit: number,
  orgId: string,
): Promise<QuotaConfig> =>
  apiClient.patch('config', `/config/quotas/${encodeURIComponent(resource)}`, { limit }, orgId);
