import { realBackFetch } from '@/lib/api-client';
import type { FeatureFlag } from '@/features/config/types';

const BASE = '/api/v1/config/flags';

export const getFlags = (orgId: string): Promise<FeatureFlag[]> =>
  realBackFetch.get(BASE, orgId);

export const updateFlag = (
  id: string,
  data: { enabled?: boolean; rolloutPercentage?: number; conditions?: Record<string, unknown> },
  orgId: string,
): Promise<FeatureFlag> =>
  realBackFetch.patch(`${BASE}/${id}`, data, orgId);
