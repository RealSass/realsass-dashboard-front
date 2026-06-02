import { apiClient } from '@/lib/api-client';
import type { FeatureFlag, UpdateFlagInput } from '@/features/config/types';

export const getFlags = (orgId: string): Promise<FeatureFlag[]> =>
  apiClient.get('config', '/config/flags', orgId);

export const updateFlag = (key: string, data: UpdateFlagInput, orgId: string): Promise<FeatureFlag> =>
  apiClient.patch('config', `/config/flags/${encodeURIComponent(key)}`, data, orgId);
