import { API_URLS, type ApiSystem } from '@/config/constants';
import type { ApiError } from '@/types/api';

// ─── Token storage helpers ─────────────────────────────────────────────────────

export const getAccessToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

export const getRefreshToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

export const saveTokens = (tokens: { accessToken: string; refreshToken: string }): void => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// ─── Unwrap { success, data: T } or plain T ────────────────────────────────────

function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

// ─── Build query string ───────────────────────────────────────────────────────

export function buildQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params.toString() ? `?${params.toString()}` : '';
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_URLS.dashboard}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const json = await response.json();
    const tokens = (json as { data?: { accessToken: string; refreshToken: string } })?.data ?? json;
    saveTokens(tokens as { accessToken: string; refreshToken: string });
    return true;
  } catch {
    return false;
  }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function coreFetch<T>(
  system: ApiSystem,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = API_URLS[system];
  const accessToken = getAccessToken();

  const buildHeaders = (token: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  });

  let response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: buildHeaders(accessToken),
  });

  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: buildHeaders(getAccessToken()),
      });
    } else {
      clearTokens();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Sesion expirada') satisfies never;
    }
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) throw new Error(`Error ${response.status}`) satisfies never;
    return undefined as T;
  }

  if (!response.ok) {
    const apiError = json as Partial<ApiError> & { error?: string };
    const msg = apiError.message ?? apiError.error ?? `Error ${response.status}`;
    const err = new Error(msg) as Error & { statusCode?: number };
    err.statusCode = response.status;
    throw err;
  }

  return unwrap<T>(json);
}

// ─── Public API client ────────────────────────────────────────────────────────

export const apiClient = {
  get<T>(system: ApiSystem, endpoint: string): Promise<T> {
    return coreFetch<T>(system, endpoint, { method: 'GET' });
  },

  post<T>(system: ApiSystem, endpoint: string, body?: unknown): Promise<T> {
    return coreFetch<T>(system, endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(system: ApiSystem, endpoint: string, body?: unknown): Promise<T> {
    return coreFetch<T>(system, endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(system: ApiSystem, endpoint: string): Promise<T> {
    return coreFetch<T>(system, endpoint, { method: 'DELETE' });
  },
};
