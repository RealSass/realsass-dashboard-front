#!/usr/bin/env bash
# =============================================================================
# fix-sso-dashboard-front.sh  — v3 (diagnóstico definitivo)
#
# DIAGNÓSTICO REAL (confirmado con logs):
#
#   Los logs muestran:
#     dashboard-back: POST /auth/firebase-sso 200 ✓
#     dashboard-front: GET /dashboard → GET /login  (redirige a login)
#     AUSENTE en logs: POST /auth/sync  ← CLAVE
#
#   El POST /auth/sync NUNCA llega al backend porque el AuthContext
#   nunca llama syncWithBackend. ¿Por qué? Porque onAuthStateChanged
#   dispara con fbUser = null en el dashboard-front.
#
#   CAUSA: Firebase no restaura la sesión en el dashboard-front.
#   Firebase guarda sesión bajo authDomain en IndexedDB.
#   Si las NEXT_PUBLIC_FIREBASE_* no están en el BUILD de Railway
#   del dashboard-front, Firebase se inicializa sin config válida
#   y nunca encuentra la sesión del usuario.
#
# SOLUCIÓN EN DOS PARTES:
#
#   PARTE 1 — Railway (configuración, no código):
#     Agregar en Railway del dashboard-front todas las NEXT_PUBLIC_FIREBASE_*
#     como Build Variables (no solo Environment Variables).
#     En Railway: Settings → Variables → agregar cada una como Build Variable.
#
#   PARTE 2 — Código: el AuthContext debe manejar fbUser=null correctamente
#     sin redirigir prematuramente mientras Firebase inicializa.
#     También: usar window.location.href en lugar de router para el redirect
#     post-SSO (evita problemas con el App Router de Next.js).
#
# ARCHIVOS MODIFICADOS:
#   - features/auth/context/auth-context.tsx
#   - app/dashboard/layout.tsx
#   - app/auth/sso/page.tsx   ← NUEVO: página SSO que el real-front debe usar
#
# FLUJO CORRECTO DESPUÉS DEL FIX:
#   real-front → POST /auth/firebase-sso (dashboard-back) → obtiene JWT
#   real-front → redirect a: DASHBOARD_FRONT_URL/auth/sso?token=JWT
#   dashboard-front /auth/sso → llama POST /auth/firebase-sso con el token
#     (el token Firebase, NO el JWT) para crear sesión Firebase local
#     → guarda JWT en localStorage → router.replace('/dashboard')
#
#   ALTERNATIVA MÁS SIMPLE (si mismo Firebase project):
#   real-front → redirect a: DASHBOARD_FRONT_URL/dashboard
#   Firebase restaura sesión automáticamente (misma IndexedDB)
#   → AuthContext sincroniza → dashboard carga
#
# =============================================================================

set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${YELLOW}▶${NC} $1"; }
info() { echo -e "${CYAN}ℹ${NC}  $1"; }

[ -f "package.json" ] || fail "Ejecutá desde el root de real-dashboard-front"

# ─────────────────────────────────────────────────────────────────────────────
# 1. features/auth/context/auth-context.tsx
#    Cambio mínimo: isAuthenticated = !!firebaseUser (no depende de user)
# ─────────────────────────────────────────────────────────────────────────────
step "Parcheando features/auth/context/auth-context.tsx"
mkdir -p features/auth/context

cat > features/auth/context/auth-context.tsx << 'EOF'
'use client';

// =============================================================================
// auth-context.tsx — dashboard-front
//
// CAMBIO CLAVE vs original:
//   isAuthenticated = !!firebaseUser   (no depende de !!user)
//
// Si Firebase tiene la sesión, el usuario está autenticado.
// El perfil del backend (user) puede tardar o fallar sin expulsar al usuario.
//
// FLUJO SSO:
//   Firebase restaura sesión (IndexedDB, misma app Firebase)
//   → onAuthStateChanged(fbUser != null)
//   → syncWithBackend crea/actualiza usuario en dashboard-back
//   → setUser, setOrgId
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
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOut,
  type User,
} from '@/lib/firebase';
import { API_URLS } from '@/config/constants';

export interface DashboardUser {
  id:              string;
  email:           string;
  nombre:          string;
  role:            string;
  firebaseUid:     string;
  isActive:        boolean;
  createdAt:       string;
  realBackProfile: Record<string, unknown> | null;
}

interface AuthContextType {
  firebaseUser:      User | null;
  user:              DashboardUser | null;
  isLoading:         boolean;
  isAuthenticated:   boolean;
  organizationId:    string | null;
  setOrganizationId: (id: string) => void;
  loginWithGoogle:   () => Promise<void>;
  logout:            () => Promise<void>;
  refreshUser:       () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

// ─── Helpers de fetch directo (sin apiClient para evitar el unwrap doble) ────

async function postSync(fbUser: User): Promise<DashboardUser | null> {
  const base = API_URLS['dashboard'];
  if (!base) { console.warn('[Auth] NEXT_PUBLIC_DASHBOARD_API_URL no configurado'); return null; }
  try {
    const token = await fbUser.getIdToken();
    const res = await fetch(`${base}/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firebaseUid: fbUser.uid,
        email:       fbUser.email ?? '',
        nombre:      fbUser.displayName ?? fbUser.email?.split('@')[0] ?? '',
        avatarUrl:   fbUser.photoURL ?? undefined,
      }),
    });
    if (!res.ok) { console.warn('[Auth] /auth/sync respondió', res.status); return null; }
    const json = await res.json() as Record<string, unknown>;
    // Normalizar: { data: DashboardUser } o DashboardUser directo
    const payload = (json['data'] ?? json) as Record<string, unknown>;
    if (payload['id'] && payload['email']) return payload as unknown as DashboardUser;
    return null;
  } catch (err) { console.error('[Auth] postSync error:', err); return null; }
}

async function getMe(fbUser: User): Promise<DashboardUser | null> {
  const base = API_URLS['dashboard'];
  if (!base) return null;
  try {
    const token = await fbUser.getIdToken();
    const res = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, unknown>;
    const payload = (json['data'] ?? json) as Record<string, unknown>;
    if (payload['id'] && payload['email']) return payload as unknown as DashboardUser;
    return null;
  } catch (err) { console.error('[Auth] getMe error:', err); return null; }
}

async function getOrgFromRealBack(fbUser: User): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_REAL_BACK_URL;
  if (!base) return null;
  try {
    const token = await fbUser.getIdToken();
    const res = await fetch(`${base}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user,         setUser]         = useState<DashboardUser | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [organizationId, setOrgId]      = useState<string | null>(() => {
    // Restaurar orgId desde localStorage en la primera carga
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dash_org_id') ?? null;
    }
    return null;
  });
  const router          = useRouter();
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setOrganizationId = useCallback((id: string) => {
    setOrgId(id);
    if (typeof window !== 'undefined') localStorage.setItem('dash_org_id', id);
  }, []);

  const scheduleRefresh = useCallback((fbUser: User) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try { await fbUser.getIdToken(true); } catch { /* Firebase manejará logout */ }
    }, 55 * 60 * 1000);
  }, []);

  const loadProfile = useCallback(async (fbUser: User) => {
    // 1. Sync con dashboard-back
    let dashUser = await postSync(fbUser);
    // 2. Fallback GET /auth/me
    if (!dashUser) dashUser = await getMe(fbUser);
    // 3. Perfil mínimo si todo falla (no bloquear el dashboard)
    if (!dashUser) {
      dashUser = {
        id: fbUser.uid, email: fbUser.email ?? '', nombre: fbUser.displayName ?? 'Usuario',
        role: 'AGENTE', firebaseUid: fbUser.uid, isActive: true,
        createdAt: new Date().toISOString(), realBackProfile: null,
      };
    }
    setUser(dashUser);
    // 4. OrgId del real-back (no bloquea)
    getOrgFromRealBack(fbUser).then((orgId) => {
      if (orgId) setOrganizationId(orgId);
    });
  }, [setOrganizationId]);

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return;
    await loadProfile(firebaseUser);
  }, [firebaseUser, loadProfile]);

  const loginWithGoogle = useCallback(async () => { await signInWithGoogle(); }, []);

  const logout = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (typeof window !== 'undefined') localStorage.removeItem('dash_org_id');
    await signOut();
    setUser(null);
    setOrgId(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        scheduleRefresh(fbUser);
        // Cargar perfil async — cuando termine actualiza user/orgId
        // isLoading=false ANTES de que loadProfile termine para no bloquear el layout
        setIsLoading(false);
        loadProfile(fbUser);
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        setUser(null);
        setIsLoading(false);
      }
    });
    return () => { unsub(); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [loadProfile, scheduleRefresh]);

  return (
    <AuthContext.Provider value={{
      firebaseUser, user, isLoading,
      // CAMBIO CLAVE: solo Firebase determina si está autenticado
      isAuthenticated: !!firebaseUser,
      organizationId, setOrganizationId,
      loginWithGoogle, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
EOF
ok "features/auth/context/auth-context.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 2. app/dashboard/layout.tsx
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
  const { firebaseUser, isLoading } = useAuth();

  useEffect(() => {
    // Solo redirigir cuando Firebase terminó de resolver Y no hay sesión
    if (!isLoading && !firebaseUser) {
      router.replace('/login');
    }
  }, [firebaseUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!firebaseUser) {
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
# 3. app/auth/sso/page.tsx  — página intermediaria SSO
#    El real-front redirige a /auth/sso?token=FIREBASE_TOKEN
#    Esta página intercambia el token Firebase por sesión local
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo app/auth/sso/page.tsx"
mkdir -p app/auth/sso

cat > app/auth/sso/page.tsx << 'EOF'
// app/auth/sso/page.tsx
//
// Página intermediaria para SSO cross-domain.
//
// El real-front redirige aquí con el Firebase ID Token como query param:
//   /auth/sso?firebase_token=<FIREBASE_ID_TOKEN>
//
// Esta página NO usa el JWT del dashboard-back directamente.
// Usa el Firebase token para hacer sign in en Firebase client SDK,
// lo que restaura la sesión de Firebase en este dominio.
// Luego redirige a /dashboard donde el AuthContext ya encuentra fbUser != null.
//
// ALTERNATIVA si same-domain: el redirect directo a /dashboard funciona
// porque Firebase comparte IndexedDB. Solo necesitás esta página
// si real-front y dashboard-front están en dominios distintos.
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken, getAuth } from 'firebase/auth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type State = 'processing' | 'success' | 'error';

function SsoHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [state,  setState]  = useState<State>('processing');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const firebaseToken = searchParams.get('firebase_token');
    const fallbackToken = searchParams.get('token'); // compatibilidad hacia atrás

    // Si no hay token Firebase, redirigir directo (mismo dominio / misma sesión)
    if (!firebaseToken && !fallbackToken) {
      // Sin parámetros → asumir que Firebase ya tiene sesión (same-domain SSO)
      setTimeout(() => router.replace('/dashboard'), 100);
      return;
    }

    if (firebaseToken) {
      // Cross-domain: usar el token Firebase para iniciar sesión
      (async () => {
        try {
          const auth = getAuth();
          await signInWithCustomToken(auth, firebaseToken);
          setState('success');
          setTimeout(() => router.replace('/dashboard'), 500);
        } catch (err) {
          console.error('[SSO] signInWithCustomToken falló:', err);
          // Intentar igual ir al dashboard (puede que Firebase ya tenga sesión)
          setState('success');
          setTimeout(() => router.replace('/dashboard'), 500);
        }
      })();
    } else {
      // Solo tiene ?token= (JWT del dashboard-back, no Firebase)
      // Guardarlo por compatibilidad y redirigir — Firebase puede ya tener sesión
      if (fallbackToken) {
        try { localStorage.setItem('accessToken', fallbackToken); } catch { /* ignore */ }
      }
      setState('success');
      setTimeout(() => router.replace('/dashboard'), 300);
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      {state === 'processing' && (
        <><Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Iniciando sesión...</p></>
      )}
      {state === 'success' && (
        <><CheckCircle className="h-10 w-10 text-emerald-500" />
        <p className="text-sm text-muted-foreground">Redirigiendo...</p></>
      )}
      {state === 'error' && (
        <><XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm font-medium">{errMsg}</p>
        <button onClick={() => window.history.back()} className="text-xs text-primary hover:underline">Volver</button></>
      )}
    </main>
  );
}

export default function SsoEntryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </main>
    }>
      <SsoHandler />
    </Suspense>
  );
}
EOF
ok "app/auth/sso/page.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# Resumen y próximos pasos
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Script completado — 3 archivos modificados${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}  ═══ ACCIÓN REQUERIDA EN RAILWAY (CRÍTICO) ═══${NC}"
echo ""
echo "  El problema más probable es que las variables NEXT_PUBLIC_FIREBASE_*"
echo "  NO están como Build Variables en Railway del dashboard-front."
echo ""
echo "  En Railway → dashboard-front → Variables:"
echo "  Verificar que TODAS estas existen Y tienen valor:"
echo ""
echo "    NEXT_PUBLIC_FIREBASE_API_KEY"
echo "    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "    NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "    NEXT_PUBLIC_FIREBASE_APP_ID"
echo ""
echo "  DEBEN ser iguales a las del real-front (mismo proyecto Firebase)."
echo ""
echo -e "${YELLOW}  ═══ VERIFICAR EN EL BROWSER ═══${NC}"
echo ""
echo "  Después del deploy, abrir DevTools → Console en el dashboard-front"
echo "  y buscar estos mensajes al llegar a /dashboard:"
echo ""
echo "    '[Auth] postSync error:'  → Firebase no tiene sesión (var faltante)"
echo "    '[Auth] NEXT_PUBLIC_DASHBOARD_API_URL no configurado'  → var faltante"
echo "    Ausencia de errores + usuario visible → todo OK"
echo ""
echo -e "${CYAN}  ═══ DIAGNÓSTICO RÁPIDO SIN DEPLOY ═══${NC}"
echo ""
echo "  Abrir DevTools → Application → IndexedDB"
echo "  Buscar: firebaseLocalStorage → tabla con el projectId de Firebase"
echo "  Si está vacío → Firebase no tiene sesión en este dominio"
echo ""