// lib/api-client.ts
// ─── Cliente HTTP multi-sistema — Firebase Auth + x-api-key para config ───────
import { getIdToken } from '@/lib/firebase';
import { API_URLS, type ApiSystem } from '@/config/constants';
import type { ApiError } from '@/types/api';

export type { ApiSystem };

export function buildQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params.toString() ? `?${params.toString()}` : '';
}

function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/**
 * Fetch principal. El sistema 'config' usa x-api-key en lugar de Bearer.
 * Todos los demás sistemas usan Authorization: Bearer <firebase-token>.
 */
async function coreFetch<T>(
  system: ApiSystem,
  endpoint: string,
  options: RequestInit & { organizationId?: string } = {},
  _retry = true,
): Promise<T> {
  const baseUrl = API_URLS[system];
  if (!baseUrl) throw new Error(`Sistema "${system}" no configurado en variables de entorno`);

  const { organizationId, ...fetchOptions } = options;

  // ── Construir headers según sistema ──────────────────────────────────────────
  let authHeaders: Record<string, string> = {};

  if (system === 'config') {
    // Config service usa x-api-key (ApiKeyGuard)
    const apiKey = process.env.NEXT_PUBLIC_CONFIG_API_KEY;
    if (!apiKey) throw new Error('NEXT_PUBLIC_CONFIG_API_KEY no configurado');
    authHeaders = { 'x-api-key': apiKey };
  } else {
    // Resto de sistemas usan Firebase Bearer token
    try {
      const token = await getIdToken();
      authHeaders = { Authorization: `Bearer ${token}` };
    } catch {
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('No autenticado');
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(organizationId ? { 'x-organization-id': organizationId } : {}),
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  let response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // ── Retry en 401 solo para sistemas con Firebase ──────────────────────────
  if (response.status === 401 && _retry && system !== 'config') {
    try {
      const freshToken = await getIdToken(true);
      headers.Authorization = `Bearer ${freshToken}`;
      response = await fetch(`${baseUrl}${endpoint}`, { ...fetchOptions, headers });
    } catch {
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return undefined as T;
  }

  if (!response.ok) {
    const apiError = json as Partial<ApiError> & { error?: string; message?: string | string[] };
    const rawMsg   = apiError.message ?? apiError.error ?? `Error ${response.status}`;
    const msg      = Array.isArray(rawMsg) ? rawMsg[0] : rawMsg;
    const err      = new Error(msg) as Error & { statusCode?: number };
    err.statusCode = response.status;
    throw err;
  }

  return unwrap<T>(json);
}

export const apiClient = {
  get<T>(system: ApiSystem, endpoint: string, organizationId?: string): Promise<T> {
    return coreFetch<T>(system, endpoint, { method: 'GET', organizationId });
  },
  post<T>(system: ApiSystem, endpoint: string, body?: unknown, organizationId?: string): Promise<T> {
    return coreFetch<T>(system, endpoint, {
      method: 'POST',
      body:   body !== undefined ? JSON.stringify(body) : undefined,
      organizationId,
    });
  },
  patch<T>(system: ApiSystem, endpoint: string, body?: unknown, organizationId?: string): Promise<T> {
    return coreFetch<T>(system, endpoint, {
      method: 'PATCH',
      body:   body !== undefined ? JSON.stringify(body) : undefined,
      organizationId,
    });
  },
  delete<T>(system: ApiSystem, endpoint: string, organizationId?: string): Promise<T> {
    return coreFetch<T>(system, endpoint, { method: 'DELETE', organizationId });
  },
};
