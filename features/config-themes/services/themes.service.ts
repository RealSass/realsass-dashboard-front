import { apiClient } from '@/lib/api-client';
import type { ThemeConfig, CreateThemeInput } from '@/features/config/types';

const BASE = '/config/themes';

export const getThemes = (orgId: string): Promise<ThemeConfig[]> =>
  apiClient.get('config', BASE, orgId);

export const createTheme = (data: CreateThemeInput, orgId: string): Promise<ThemeConfig> =>
  apiClient.post('config', BASE, data, orgId);

export const activateTheme = (id: string, orgId: string): Promise<{ success: boolean; message: string }> =>
  apiClient.patch('config', `${BASE}/${id}/activate`, {}, orgId);

export const deleteTheme = (id: string, orgId: string): Promise<{ success: boolean; message: string }> =>
  apiClient.delete('config', `${BASE}/${id}`, orgId);
