import { realBackFetch } from '@/lib/api-client';
import type { QuotaConfig } from '@/features/config/types';

const BASE = '/api/v1/config/quotas';

export const getQuotas = (orgId: string): Promise<QuotaConfig[]> =>
  realBackFetch.get(BASE, orgId);

export const updateQuotaLimit = (
  resource: string,
  limit: number,
  orgId: string,
): Promise<QuotaConfig> =>
  realBackFetch.patch(`${BASE}/${encodeURIComponent(resource)}`, { limit }, orgId);
