#!/usr/bin/env bash
# =============================================================================
# fix-cookies-dashboard-front.sh
# Repo: real-dashboard-front (Next.js)
#
# CAMBIO: AuthContext usa cookies HttpOnly en lugar de localStorage.
# El browser envía la cookie access_token automáticamente en cada request
# con credentials: 'include' — no hay que leer/escribir nada manualmente.
#
# ARCHIVOS MODIFICADOS:
#   features/auth/context/auth-context.tsx
#   app/auth/sso/page.tsx
#   app/login/page.tsx
# =============================================================================
set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
step() { echo -e "\n${YELLOW}▶${NC} $1"; }

[ -f "package.json" ] || { echo "Ejecutá desde el root de real-dashboard-front"; exit 1; }

# ─────────────────────────────────────────────────────────────────────────────
# 1. features/auth/context/auth-context.tsx — cookie-based
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo features/auth/context/auth-context.tsx"
mkdir -p features/auth/context

cat > features/auth/context/auth-context.tsx << 'EOF'
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
EOF
ok "features/auth/context/auth-context.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 2. app/auth/sso/page.tsx — ya no necesita guardar tokens, solo redirige
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo app/auth/sso/page.tsx"
mkdir -p app/auth/sso

cat > app/auth/sso/page.tsx << 'EOF'
// app/auth/sso/page.tsx
// El dashboard-back ya escribió la cookie HttpOnly en /auth/firebase-sso.
// Esta página solo necesita redirigir al dashboard.
// La cookie viaja con el browser automáticamente.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 }   from 'lucide-react';

export default function SsoPage() {
  const router = useRouter();

  useEffect(() => {
    // La cookie ya fue seteada por el backend cuando real-front llamó firebase-sso.
    // Redirigir directamente al dashboard.
    router.replace('/dashboard');
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
    </main>
  );
}
EOF
ok "app/auth/sso/page.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 3. app/login/page.tsx — login directo en el dashboard-front
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo app/login/page.tsx"
mkdir -p app/login

cat > app/login/page.tsx << 'EOF'
'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { Loader2, Building2 }  from 'lucide-react';
import { Button }              from '@/components/ui/button';
import { toast }               from 'sonner';
import { useAuth }             from '@/features/auth/hooks/use-auth';

function getBase(): string {
  return (process.env.NEXT_PUBLIC_DASHBOARD_API_URL ?? '').replace(/\/+$/, '');
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, isLoading, router]);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      // Importar Firebase solo cuando el usuario hace click (code split)
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

      const cfg = {
        apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      };

      const fbApp  = getApps().length ? getApp() : initializeApp(cfg);
      const auth   = getAuth(fbApp);
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();

      // Llamar firebase-sso → el backend escribe las cookies HttpOnly
      const res = await fetch(`${getBase()}/auth/firebase-sso`, {
        method:      'POST',
        credentials: 'include', // ← necesario para recibir las cookies
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ firebaseIdToken: idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `Error ${res.status}`);
      }

      // Cookie seteada → redirigir (AuthContext leerá la cookie en /dashboard)
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
        <Button onClick={handleGoogle} disabled={busy} className="w-full h-11 gap-3" variant="outline">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {busy ? 'Iniciando sesión...' : 'Continuar con Google'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Solo para usuarios autorizados.</p>
      </div>
    </main>
  );
}
EOF
ok "app/login/page.tsx"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Script completado — 3 archivos modificados${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
echo "  También ejecutar en real-dashboard-back: fix-cookies-dashboard-back.sh"
echo ""
echo "  Variable requerida en Railway del dashboard-back:"
echo "    ALLOWED_ORIGINS=https://realsass-dashboard-front-production.up.railway.app,https://realsass-sass-front-production.up.railway.app"
echo ""
echo "  Flujo final:"
echo "    real-front → POST /firebase-sso → cookie seteada → redirect /auth/sso"
echo "    /auth/sso  → redirect /dashboard"  
echo "    AuthContext → GET /auth/me (cookie va automática) → 200 → dashboard ✓"
echo ""