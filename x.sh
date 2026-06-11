#!/usr/bin/env bash
# =============================================================================
# fix-sso-dashboard-front.sh — v4 (solución definitiva cross-domain)
#
# DIAGNÓSTICO CONFIRMADO CON EVIDENCIA:
#   • IndexedDB firebaseLocalStorage → Total entries: 0
#   • real-front y dashboard-front están en dominios distintos de Railway
#   • Firebase NO comparte sesión entre dominios — el IndexedDB está vacío
#   • onAuthStateChanged dispara con fbUser=null → redirect a /login
#
# SOLUCIÓN: desacoplar el AuthContext del dashboard-front de Firebase.
#   El dashboard-back ya tiene su propio sistema de JWT (firebase-sso → JWT).
#   El dashboard-front usa ese JWT directamente, sin Firebase SDK para auth.
#
# FLUJO NUEVO:
#   real-front → POST /auth/firebase-sso → JWT
#   real-front → redirect → dashboard-front/auth/sso?token=JWT&refresh=REFRESH_JWT
#   dashboard-front /auth/sso → localStorage.setItem(token, refresh) → /dashboard
#   dashboard-front AuthContext → lee JWT del localStorage → GET /auth/me → sesión OK
#
# ARCHIVOS MODIFICADOS:
#   • features/auth/context/auth-context.tsx  (usa JWT, no Firebase)
#   • app/auth/sso/page.tsx                   (guarda tokens, redirige)
#   • app/dashboard/layout.tsx                (guard usa isAuthenticated correcto)
#   • app/login/page.tsx                      (login directo al dashboard-back)
#
# USO: ejecutar en el root de real-dashboard-front
# =============================================================================
set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${YELLOW}▶${NC} $1"; }

[ -f "package.json" ] || fail "Ejecutá desde el root de real-dashboard-front"

# ─────────────────────────────────────────────────────────────────────────────
# 1. features/auth/context/auth-context.tsx
#    Reescrito para usar JWT del dashboard-back (no Firebase client SDK)
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo features/auth/context/auth-context.tsx"
mkdir -p features/auth/context

cat > features/auth/context/auth-context.tsx << 'EOF'
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
EOF
ok "features/auth/context/auth-context.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 2. app/auth/sso/page.tsx — recibe JWT y lo guarda en localStorage
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo app/auth/sso/page.tsx"
mkdir -p app/auth/sso

cat > app/auth/sso/page.tsx << 'EOF'
// app/auth/sso/page.tsx
// Recibe el JWT del dashboard-back via query params desde real-front.
// Lo guarda en localStorage y redirige a /dashboard.
//
// URL de entrada (generada por real-front/hooks/use-dashboard-sso.ts):
//   /auth/sso?token=<JWT_ACCESS>&refresh=<JWT_REFRESH>
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type State = 'processing' | 'success' | 'error';

const ACCESS_KEY  = 'dash_access_token';
const REFRESH_KEY = 'dash_refresh_token';

function SsoHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [state,  setState]  = useState<State>('processing');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const token   = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (!token) {
      setState('error');
      setErrMsg('Token de sesión faltante. Volvé al sistema principal e intentá de nuevo.');
      return;
    }

    try {
      // Guardar con las keys nuevas
      localStorage.setItem(ACCESS_KEY,  token);
      if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
      // También guardar con keys legacy por compatibilidad con código existente
      localStorage.setItem('accessToken',  token);
      if (refresh) localStorage.setItem('refreshToken', refresh);

      setState('success');
      // replace: no dejar /auth/sso en el historial del browser
      setTimeout(() => router.replace('/dashboard'), 400);
    } catch {
      setState('error');
      setErrMsg('Error al guardar la sesión. El browser puede tener localStorage bloqueado.');
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      {state === 'processing' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle className="h-10 w-10 text-emerald-500" />
          <p className="text-sm text-muted-foreground">Sesión iniciada. Redirigiendo...</p>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-foreground">Error de autenticación</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs px-4">{errMsg}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Volver
          </button>
        </>
      )}
    </main>
  );
}

export default function SsoEntryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </main>
    }>
      <SsoHandler />
    </Suspense>
  );
}
EOF
ok "app/auth/sso/page.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 3. app/dashboard/layout.tsx — guard basado en !!user (JWT-based)
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo app/dashboard/layout.tsx"
mkdir -p app/dashboard

cat > app/dashboard/layout.tsx << 'EOF'
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <MobileHeader />
      <DashboardSidebar />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 bg-background">
        {children}
      </main>
    </div>
  );
}
EOF
ok "app/dashboard/layout.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 4. app/login/page.tsx — login con Google via firebase-sso
#    El login local del dashboard-front también necesita funcionar
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo app/login/page.tsx"
mkdir -p app/login

cat > app/login/page.tsx << 'EOF'
'use client';

// Login del dashboard-front
// Usa Google (Firebase) en el CLIENTE para obtener el Firebase ID Token,
// luego lo intercambia por JWT del dashboard-back via /auth/firebase-sso.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';

const ACCESS_KEY  = 'dash_access_token';
const REFRESH_KEY = 'dash_refresh_token';

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_DASHBOARD_API_URL ?? 'http://localhost:3001/api/v1')
    .replace(/\/+$/, '');
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGoogleLogin = async () => {
    setBusy(true);
    try {
      // Importar Firebase dinámicamente (solo si la app lo necesita para login local)
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

      const firebaseConfig = {
        apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      };

      const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const firebaseToken = await result.user.getIdToken();

      // Intercambiar Firebase token por JWT del dashboard-back
      const res = await fetch(`${getBaseUrl()}/auth/firebase-sso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseIdToken: firebaseToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `Error ${res.status}`);
      }

      const json = await res.json() as Record<string, unknown>;
      const data = (json['data'] ?? json) as Record<string, unknown>;
      const access  = data['accessToken']  as string | undefined;
      const refresh = data['refreshToken'] as string | undefined;

      if (!access || !refresh) throw new Error('Respuesta inválida del servidor');

      localStorage.setItem(ACCESS_KEY,  access);
      localStorage.setItem(REFRESH_KEY, refresh);
      localStorage.setItem('accessToken',  access);   // legacy compat
      localStorage.setItem('refreshToken', refresh);  // legacy compat

      // Reload para que AuthProvider lea los nuevos tokens
      window.location.href = '/dashboard';

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión');
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Building2 className="h-7 w-7" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Propiedad Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Plataforma de gestión inmobiliaria</p>
          </div>
        </div>

        <Button
          onClick={handleGoogleLogin}
          disabled={busy}
          className="w-full h-11 gap-3 text-sm font-medium"
          variant="outline"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {busy ? 'Iniciando sesión...' : 'Continuar con Google'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Solo para usuarios autorizados de la plataforma.
        </p>
      </div>
    </main>
  );
}
EOF
ok "app/login/page.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Script completado — 4 archivos modificados${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Archivos:"
echo "    • features/auth/context/auth-context.tsx  (JWT-based, sin Firebase)"
echo "    • app/auth/sso/page.tsx                   (recibe JWT, guarda, redirige)"
echo "    • app/dashboard/layout.tsx                (guard basado en !!user)"
echo "    • app/login/page.tsx                      (login con Google directo)"
echo ""
echo -e "${YELLOW}  También correr en real-front: fix-sso-real-front.sh${NC}"
echo ""
echo -e "${CYAN}  Variables de entorno en Railway del dashboard-front:${NC}"
echo ""
echo "    NEXT_PUBLIC_DASHBOARD_API_URL  (ya la tenés)"
echo "    NEXT_PUBLIC_FIREBASE_API_KEY   (para el login directo desde /login)"
echo "    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "    NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "    NEXT_PUBLIC_FIREBASE_APP_ID"
echo ""
echo -e "${CYAN}  Flujo completo después del fix:${NC}"
echo "    1. real-front /profile → 'Ir al Dashboard'"
echo "    2. POST /auth/firebase-sso al dashboard-back → JWT"
echo "    3. Redirect a dashboard-front/auth/sso?token=JWT&refresh=REFRESH"
echo "    4. /auth/sso guarda tokens → redirect a /dashboard"
echo "    5. AuthContext lee JWT → GET /auth/me → usuario autenticado"
echo "    6. Dashboard carga ✓"
echo ""