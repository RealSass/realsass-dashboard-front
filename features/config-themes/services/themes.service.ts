import { realBackFetch } from '@/lib/api-client';
import type { ThemeConfig, CreateThemeInput } from '@/features/config/types';

const BASE = '/api/v1/config/themes';

export const getThemes = (orgId: string): Promise<ThemeConfig[]> =>
  realBackFetch.get(BASE, orgId);

export const createTheme = (data: CreateThemeInput, orgId: string): Promise<ThemeConfig> =>
  realBackFetch.post(BASE, data, orgId);

export const activateTheme = (id: string, orgId: string): Promise<{ success: boolean; message: string }> =>
  realBackFetch.patch(`${BASE}/${id}/activate`, {}, orgId);

export const deleteTheme = (id: string, orgId: string): Promise<{ success: boolean; message: string }> =>
  realBackFetch.delete(`${BASE}/${id}`, orgId);
