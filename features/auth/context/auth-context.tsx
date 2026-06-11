'use client';

// =============================================================================
// auth-context.tsx — JWT-based (sin Firebase client SDK)
//
// El dashboard-back emite JWT propio via POST /auth/firebase-sso.
// El dashboard-front lo guarda en localStorage y lo usa en cada request.
// No dependemos de Firebase en el cliente — resuelve el problema cross-domain.
//
// TOKENS EN LOCALSTORAGE:
//   'dash_access_token'   → JWT de acceso (15 min)
//   'dash_refresh_token'  → JWT de refresh (7 días)
//   'accessToken'         → alias legacy (escrito por login/sso pages)
//   'refreshToken'        → alias legacy
//
// FLUJO SSO DESDE real-front:
//   real-front → POST /auth/firebase-sso → JWT
//   real-front → redirect → /auth/sso?token=JWT&refresh=REFRESH
//   /auth/sso  → localStorage.setItem → redirect a /dashboard
//   AuthContext → lee JWT → GET /auth/me → isAuthenticated = true ✓
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

// ─── Keys de localStorage ─────────────────────────────────────────────────────
const A_KEY = 'dash_access_token';
const R_KEY = 'dash_refresh_token';
const O_KEY = 'dash_org_id';

function getBase(): string {
  return (process.env.NEXT_PUBLIC_DASHBOARD_API_URL ?? 'http://localhost:3001/api/v1')
    .replace(/\/+$/, '');
}

// Lee el access token — preferir key nueva, fallback a legacy
function readAccess(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(A_KEY) ?? localStorage.getItem('accessToken') ?? null;
}

function readRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(R_KEY) ?? localStorage.getItem('refreshToken') ?? null;
}

function writeTokens(access: string, refresh: string): void {
  localStorage.setItem(A_KEY, access);
  localStorage.setItem(R_KEY, refresh);
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

function wipeTokens(): void {
  [A_KEY, R_KEY, O_KEY, 'accessToken', 'refreshToken'].forEach(k => localStorage.removeItem(k));
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  // Alias para compatibilidad con código existente que usa firebaseUser
  firebaseUser:      DashboardUser | null;
  user:              DashboardUser | null;
  isLoading:         boolean;
  isAuthenticated:   boolean;
  organizationId:    string | null;
  setOrganizationId: (id: string) => void;
  loginWithGoogle:   () => Promise<void>;
  logout:            () => void;
  refreshUser:       () => Promise<void>;
}

const Ctx = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return c;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function callMe(token: string): Promise<DashboardUser | null> {
  try {
    const r = await fetch(`${getBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const j = await r.json() as Record<string, unknown>;
    const d = (j['data'] ?? j) as Record<string, unknown>;
    if (d['id'] && d['email']) return d as unknown as DashboardUser;
    return null;
  } catch { return null; }
}

async function callRefresh(refresh: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const r = await fetch(`${getBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!r.ok) return null;
    const j = await r.json() as Record<string, unknown>;
    const d = (j['data'] ?? j) as Record<string, unknown>;
    if (d['accessToken'] && d['refreshToken']) {
      return { accessToken: d['accessToken'] as string, refreshToken: d['refreshToken'] as string };
    }
    return null;
  } catch { return null; }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<DashboardUser | null>(null);
  const [isLoading, setLoad]    = useState(true);
  const [orgId,     setOrgId]   = useState<string | null>(null);
  const router   = useRouter();
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const setOrganizationId = useCallback((id: string) => {
    setOrgId(id);
    if (typeof window !== 'undefined') localStorage.setItem(O_KEY, id);
  }, []);

  // ── Carga inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') { setLoad(false); return; }

      // Leer orgId guardado
      const storedOrg = localStorage.getItem(O_KEY);
      if (storedOrg) setOrgId(storedOrg);

      let access = readAccess();
      if (!access) { setLoad(false); return; }

      // Intentar GET /auth/me con el token actual
      let dashUser = await callMe(access);

      // Token expirado → refresh
      if (!dashUser) {
        const refresh = readRefresh();
        if (refresh) {
          const fresh = await callRefresh(refresh);
          if (fresh) {
            writeTokens(fresh.accessToken, fresh.refreshToken);
            access = fresh.accessToken;
            dashUser = await callMe(access);
          }
        }
      }

      if (dashUser) {
        setUser(dashUser);
      } else {
        wipeTokens();
      }
      setLoad(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh cada 13 min (JWT expira a los 15) ─────────────────────────
  useEffect(() => {
    if (!user) return;
    interval.current = setInterval(async () => {
      const refresh = readRefresh();
      if (!refresh) { logout(); return; }
      const fresh = await callRefresh(refresh);
      if (fresh) {
        writeTokens(fresh.accessToken, fresh.refreshToken);
      } else {
        logout();
      }
    }, 13 * 60 * 1000);
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshUser = useCallback(async () => {
    const access = readAccess();
    if (!access) return;
    const u = await callMe(access);
    if (u) setUser(u);
  }, []);

  const logout = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    wipeTokens();
    setUser(null);
    setOrgId(null);
    router.push('/login');
  }, [router]);

  // loginWithGoogle: redirige al /login del dashboard donde el usuario
  // puede hacer Google login directamente (el login/page.tsx lo maneja)
  const loginWithGoogle = useCallback(async () => {
    router.push('/login');
  }, [router]);

  const val: AuthContextType = {
    firebaseUser:      user,   // alias — mismo objeto para compatibilidad
    user,
    isLoading,
    isAuthenticated:   !!user, // JWT-based: si tenemos user, estamos autenticados
    organizationId:    orgId,
    setOrganizationId,
    loginWithGoogle,
    logout,
    refreshUser,
  };

  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}
