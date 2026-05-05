import { API_URLS } from '@/config/constants';
import { saveTokens, clearTokens } from '@/lib/api-client';
import type { AuthResponse } from '../types';

function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

async function authFetch(endpoint: string, body: object): Promise<AuthResponse> {
  const response = await fetch(`${API_URLS.dashboard}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Error ${response.status}`);
  }

  if (!response.ok) {
    const msg =
      (json as { message?: string })?.message ??
      (json as { error?: string })?.error ??
      `Error ${response.status}`;
    throw new Error(msg);
  }

  return unwrap<AuthResponse>(json);
}

export async function loginService(email: string, password: string): Promise<AuthResponse> {
  const data = await authFetch('/auth/login', { email, password });
  saveTokens(data);
  return data;
}

export async function registerService(
  email: string,
  nombre: string,
  password: string,
): Promise<AuthResponse> {
  const data = await authFetch('/auth/register', { email, nombre, password });
  saveTokens(data);
  return data;
}

export async function logoutService(): Promise<void> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    await fetch(`${API_URLS.dashboard}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } finally {
    clearTokens();
  }
}
