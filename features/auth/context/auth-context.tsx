'use client';

// =============================================================================
// auth-context.tsx — dashboard-front (JWT-based, sin Firebase client SDK)
//
// ARQUITECTURA:
//   El dashboard-back emite JWT propio (via /auth/firebase-sso).
//   El dashboard-front guarda ese JWT en localStorage y lo usa en cada request.
//   No depende de Firebase en el cliente — Firebase solo vive en el backend.
//
// TOKENS:
//   localStorage['dash_access_token']  → JWT de acceso (15 min)
//   localStorage['dash_refresh_token'] → JWT de refresh (7 días)
//
// FLUJO SSO DESDE real-front:
//   1. real-front llama POST /auth/firebase-sso al dashboard-back
//   2. real-front redirige a dashboard-front/auth/sso?token=JWT&refresh=REFRESH
//   3. /auth/sso guarda los tokens en localStorage y redirige a /dashboard
//   4. AuthContext lee los tokens, llama GET /auth/me, hidrata el estado
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

// ─── Constantes de storage ────────────────────────────────────────────────────

const ACCESS_KEY  = 'dash_access_token';
const REFRESH_KEY = 'dash_refresh_token';
const ORG_KEY     = 'dash_org_id';

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_DASHBOARD_API_URL ?? 'http://localhost:3001/api/v1')
    .replace(/\/+$/, '');
}

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface DashboardUser {
  id:          string;
  email:       string;
  nombre:      string;
  role:        string;
  firebaseUid: string | null;
  isActive:    boolean;
  createdAt:   string;
  realBackProfile: Record<string, unknown> | null;
}

interface AuthContextType {
  user:              DashboardUser | null;
  isLoading:         boolean;
  isAuthenticated:   boolean;
  organizationId:    string | null;
  setOrganizationId: (id: string) => void;
  logout:            () => void;
  refreshUser:       () => Promise<void>;
  // Expuesto para compatibilidad con código que usa firebaseUser
  firebaseUser:      null;
  loginWithGoogle:   () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

// ─── Helpers de token ─────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

function saveTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ORG_KEY);
  // También limpiar keys legacy
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * Si localStorage tiene los tokens legacy (accessToken, refreshToken),
 * migrarlos a las keys nuevas.
 */
function migrateLegacyTokens(): void {
  const legacy = localStorage.getItem('accessToken');
  const legacyR = localStorage.getItem('refreshToken');
  if (legacy && !getAccessToken()) {
    localStorage.setItem(ACCESS_KEY, legacy);
    localStorage.removeItem('accessToken');
  }
  if (legacyR && !getRefreshToken()) {
    localStorage.setItem(REFRESH_KEY, legacyR);
    localStorage.removeItem('refreshToken');
  }
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchMe(token: string): Promise<DashboardUser | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, unknown>;
    const data = (json['data'] ?? json) as Record<string, unknown>;
    if (data['id'] && data['email']) return data as unknown as DashboardUser;
    return null;
  } catch { return null; }
}

async function doRefresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, unknown>;
    const data = (json['data'] ?? json) as Record<string, unknown>;
    if (data['accessToken'] && data['refreshToken']) {
      return { accessToken: data['accessToken'] as string, refreshToken: data['refreshToken'] as string };
    }
    return null;
  } catch { return null; }
}

async function fetchOrgId(token: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_REAL_BACK_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    // Nota: el real-back acepta Firebase tokens, no el JWT del dashboard-back.
    // Si los tokens son distintos, esto puede fallar — en ese caso orgId
    // quedará null y el dashboard mostrará datos sin filtro de org.
    const json = await res.json() as Record<string, unknown>;
    const data = (json['data'] ?? json) as Record<string, unknown>;
    const org = data['organization'] as Record<string, unknown> | null | undefined;
    if (org?.['id']) return org['id'] as string;
    const tenants = data['tenants'] as Array<Record<string, unknown>> | null | undefined;
    if (Array.isArray(tenants) && tenants.length > 0) {
      const owner = tenants.find((t) => t['role'] === 'OWNER') ?? tenants[0];
      if (owner?.['organizationId']) return owner['organizationId'] as string;
    }
    return null;
  } catch { return null; }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,       setUser]    = useState<DashboardUser | null>(null);
  const [isLoading,  setLoading] = useState(true);
  const [organizationId, setOrgId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(ORG_KEY);
    return null;
  });
  const router     = useRouter();
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setOrganizationId = useCallback((id: string) => {
    setOrgId(id);
    if (typeof window !== 'undefined') localStorage.setItem(ORG_KEY, id);
  }, []);

  /**
   * Intenta cargar el usuario con el access token actual.
   * Si falla con 401, intenta refresh. Si eso también falla, limpia.
   */
  const loadUser = useCallback(async () => {
    if (typeof window === 'undefined') { setLoading(false); return; }

    // Migrar tokens legacy si existen
    migrateLegacyTokens();

    let access = getAccessToken();
    if (!access) { setLoading(false); return; }

    let dashUser = await fetchMe(access);

    // Token expirado → intentar refresh
    if (!dashUser) {
      const refresh = getRefreshToken();
      if (refresh) {
        const newTokens = await doRefresh(refresh);
        if (newTokens) {
          saveTokens(newTokens.accessToken, newTokens.refreshToken);
          access = newTokens.accessToken;
          dashUser = await fetchMe(access);
        }
      }
    }

    if (dashUser) {
      setUser(dashUser);
      // OrgId del dashboard-back no viene en /auth/me
      // Intentar desde el real-back (puede fallar si tokens son distintos)
      const storedOrg = localStorage.getItem(ORG_KEY);
      if (!storedOrg) {
        fetchOrgId(access).then((orgId) => {
          if (orgId) setOrganizationId(orgId);
        });
      }
    } else {
      clearTokens();
      setUser(null);
    }

    setLoading(false);
  }, [setOrganizationId]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    clearTokens();
    setUser(null);
    setOrgId(null);
    router.push('/login');
  }, [router]);

  // loginWithGoogle redirige al usuario al login page del dashboard
  // donde puede hacer login con Google directamente (si el dashboard-back lo soporta)
  // Por ahora redirige a /login
  const loginWithGoogle = useCallback(async () => {
    router.push('/login');
  }, [router]);

  // Cargar usuario al montar
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Refresh automático del JWT cada 13 minutos (JWT expira a los 15)
  useEffect(() => {
    if (!user) return;
    timerRef.current = setInterval(async () => {
      const refresh = getRefreshToken();
      if (!refresh) return;
      const newTokens = await doRefresh(refresh);
      if (newTokens) {
        saveTokens(newTokens.accessToken, newTokens.refreshToken);
      } else {
        // Refresh falló → logout
        logout();
      }
    }, 13 * 60 * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      organizationId,
      setOrganizationId,
      logout,
      refreshUser,
      // Compatibilidad
      firebaseUser: null,
      loginWithGoogle,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
