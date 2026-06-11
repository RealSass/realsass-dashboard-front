'use client';

// =============================================================================
// auth-context.tsx — Cookie-based auth (sin localStorage, sin Firebase client)
//
// El dashboard-back escribe access_token como cookie HttpOnly en /auth/firebase-sso.
// El browser la envía automáticamente en cada request con credentials:'include'.
// No hay que leer ni escribir tokens manualmente.
//
// GET /auth/me → 200 si la cookie es válida → usuario autenticado
// GET /auth/me → 401 si la cookie expiró → intentar refresh → si falla → /login
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
  firebaseUser:      DashboardUser | null; // alias para compatibilidad
  isLoading:         boolean;
  isAuthenticated:   boolean;
  organizationId:    string | null;
  setOrganizationId: (id: string) => void;
  loginWithGoogle:   () => Promise<void>;
  logout:            () => Promise<void>;
  refreshUser:       () => Promise<void>;
}

const Ctx = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return c;
}

// ─── Constante de URL ─────────────────────────────────────────────────────────

function getBase(): string {
  return (process.env.NEXT_PUBLIC_DASHBOARD_API_URL ?? '')
    .replace(/\/+$/, '');
}

const ORG_KEY = 'dash_org_id';

// ─── Fetch con credentials (envía cookies automáticamente) ───────────────────

async function fetchMe(): Promise<DashboardUser | null> {
  const base = getBase();
  if (!base) { console.error('[Auth] NEXT_PUBLIC_DASHBOARD_API_URL no configurado'); return null; }
  try {
    const r = await fetch(`${base}/auth/me`, {
      credentials: 'include', // ← envía la cookie access_token
    });
    if (!r.ok) return null;
    const j = await r.json() as Record<string, unknown>;
    const d = (j['data'] ?? j) as Record<string, unknown>;
    if (d['id'] && d['email']) return d as unknown as DashboardUser;
    return null;
  } catch (err) {
    console.error('[Auth] fetchMe error:', err);
    return null;
  }
}

async function doRefresh(): Promise<boolean> {
  const base = getBase();
  if (!base) return false;
  try {
    const r = await fetch(`${base}/auth/refresh`, {
      method:      'POST',
      credentials: 'include', // ← envía refresh_token cookie, recibe nueva access_token cookie
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({}), // body vacío — el token viene de la cookie
    });
    return r.ok;
  } catch { return false; }
}

async function doLogout(): Promise<void> {
  const base = getBase();
  if (!base) return;
  try {
    await fetch(`${base}/auth/logout`, {
      method:      'POST',
      credentials: 'include',
    });
  } catch { /* ignorar errores de red en logout */ }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]  = useState<DashboardUser | null>(null);
  const [isLoading, setLoad]  = useState(true);
  const [orgId,     setOrgId] = useState<string | null>(null);
  const router    = useRouter();
  const intervalR = useRef<ReturnType<typeof setInterval> | null>(null);

  const setOrganizationId = useCallback((id: string) => {
    setOrgId(id);
    if (typeof window !== 'undefined') localStorage.setItem(ORG_KEY, id);
  }, []);

  // Carga inicial: probar la cookie actual
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') { setLoad(false); return; }

      // Restaurar orgId guardado
      const storedOrg = localStorage.getItem(ORG_KEY);
      if (storedOrg) setOrgId(storedOrg);

      // Intentar GET /auth/me con la cookie actual
      let dashUser = await fetchMe();

      // Cookie expirada → intentar refresh
      if (!dashUser) {
        const ok = await doRefresh();
        if (ok) dashUser = await fetchMe();
      }

      setUser(dashUser ?? null);
      setLoad(false);
    })();
  }, []); // eslint-disable-line

  // Auto-refresh cada 13 minutos (JWT expira a los 15)
  useEffect(() => {
    if (!user) return;
    intervalR.current = setInterval(async () => {
      const ok = await doRefresh();
      if (!ok) {
        setUser(null);
        router.push('/login');
      }
    }, 13 * 60 * 1000);
    return () => { if (intervalR.current) clearInterval(intervalR.current); };
  }, [user, router]);

  const refreshUser = useCallback(async () => {
    const u = await fetchMe();
    if (u) setUser(u);
  }, []);

  const logout = useCallback(async () => {
    if (intervalR.current) clearInterval(intervalR.current);
    await doLogout(); // limpia cookies en el servidor
    localStorage.removeItem(ORG_KEY);
    setUser(null);
    setOrgId(null);
    router.push('/login');
  }, [router]);

  const loginWithGoogle = useCallback(async () => {
    router.push('/login');
  }, [router]);

  return (
    <Ctx.Provider value={{
      user,
      firebaseUser:    user,
      isLoading,
      isAuthenticated: !!user,
      organizationId:  orgId,
      setOrganizationId,
      loginWithGoogle,
      logout,
      refreshUser,
    }}>
      {children}
    </Ctx.Provider>
  );
}
