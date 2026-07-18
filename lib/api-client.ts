// lib/api-client.ts
// Dos helpers HTTP — uno por backend.
// Ambos obtienen el token Firebase fresco en cada llamada.

import { getCurrentUserToken } from './firebase';

// ─── Helpers internos ─────────────────────────────────────────────────────────

function getRealBackBase(): string {
  const url = process.env.NEXT_PUBLIC_REAL_BACK_URL ?? '';
  if (!url) throw new Error('NEXT_PUBLIC_REAL_BACK_URL no configurado');
  return url.replace(/\/+$/, '');
}

function getEcommerceBase(): string {
  const url = process.env.NEXT_PUBLIC_ECOMMERCE_API_URL ?? '';
  if (!url) throw new Error('NEXT_PUBLIC_ECOMMERCE_API_URL no configurado');
  return url.replace(/\/+$/, '');
}

export function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function getToken(): Promise<string | undefined> {
  if (typeof window === 'undefined') return undefined;
  try {
    return await getCurrentUserToken();
  } catch {
    return undefined;
  }
}

interface FetchOptions {
  method?:  string;
  body?:    unknown;
  orgId?:   string;
  signal?:  AbortSignal;
}

async function coreFetch<T>(
  baseUrl: string,
  path: string,
  { method = 'GET', body, orgId, signal }: FetchOptions = {},
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token  ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId  ? { 'x-organization-id': orgId }      : {}),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const json = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      (json['message'] as string | undefined) ??
      (json['error']   as string | undefined) ??
      `Error ${res.status}`;
    throw new Error(msg);
  }

  // real-back y ecommerce-back envuelven en { success, data }
  return ((json['data'] as T | undefined) ?? json as unknown as T);
}

// ─── real-back (auth + config) ────────────────────────────────────────────────

export const realBackFetch = {
  get: <T>(path: string, orgId?: string) =>
    coreFetch<T>(getRealBackBase(), path, { orgId }),

  post: <T>(path: string, body: unknown, orgId?: string) =>
    coreFetch<T>(getRealBackBase(), path, { method: 'POST', body, orgId }),

  patch: <T>(path: string, body: unknown, orgId?: string) =>
    coreFetch<T>(getRealBackBase(), path, { method: 'PATCH', body, orgId }),

  delete: <T>(path: string, orgId?: string) =>
    coreFetch<T>(getRealBackBase(), path, { method: 'DELETE', orgId }),
};

// ─── real-ecommerce-back (catálogo + pedidos) ─────────────────────────────────

export const ecommerceFetch = {
  get: <T>(path: string, orgId: string) =>
    coreFetch<T>(getEcommerceBase(), path, { orgId }),

  post: <T>(path: string, body: unknown, orgId: string) =>
    coreFetch<T>(getEcommerceBase(), path, { method: 'POST', body, orgId }),

  patch: <T>(path: string, body: unknown, orgId: string) =>
    coreFetch<T>(getEcommerceBase(), path, { method: 'PATCH', body, orgId }),

  delete: <T>(path: string, orgId: string) =>
    coreFetch<T>(getEcommerceBase(), path, { method: 'DELETE', orgId }),
};
