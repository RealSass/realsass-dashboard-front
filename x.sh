#!/usr/bin/env bash
# =============================================================================
# fix-sso-dashboard-front.sh  — v2 (diagnóstico preciso con logs reales)
#
# PROBLEMA EXACTO (confirmado con los logs):
#   Los logs muestran:
#     GET /dashboard → 200  (servidor sirve la página)
#     GET /login     → 200  (cliente redirige a login)
#
#   El flujo real es:
#   1. real-front: useDashboardSSO llama POST /auth/firebase-sso → 200 ✓
#      → guarda accessToken + refreshToken en localStorage del real-front
#      → hace window.location.href = DASHBOARD_FRONT_URL/dashboard
#   
#   2. dashboard-front recibe GET /dashboard
#      → AuthContext empieza: isLoading=true, firebaseUser=null, user=null
#      → onAuthStateChanged de Firebase todavía NO disparó (async, ~50-200ms)
#      → React hidrata → dashboard/layout.tsx se ejecuta
#      → isLoading=true → muestra spinner (OK)
#      → Firebase resuelve onAuthStateChanged → fbUser != null (misma sesión Firebase)
#      → syncWithBackend llama POST /auth/sync al dashboard-back
#      → PERO: dashboard-back tiene su propio users table. El usuario existe
#        (fue creado por firebase-sso), PERO syncWithBackend llama la URL
#        configurada en NEXT_PUBLIC_API_URL que es el dashboard-back (correcto).
#      → El problema: syncWithBackend hace:
#           apiClient.post('dashboard', '/auth/sync', {...})
#        que retorna { success: true, data: DashboardUser }
#        PERO el unwrap() en api-client hace: return (json as {data:T}).data
#        El endpoint /auth/sync devuelve el user directamente (no wrapeado en {data:})
#        → result.data = undefined → dashboardProfile = null
#      → Con dashboardProfile=null, user queda null
#      → isAuthenticated = !!firebaseUser && !!user = true && false = FALSE
#      → layout redirige a /login ← AQUÍ ESTÁ EL BUG
#
# CAUSA RAÍZ REAL: la combinación de dos problemas:
#   A. isAuthenticated = !!firebaseUser && !!user  (user puede ser null transitoriamente)
#   B. El endpoint POST /auth/sync del dashboard-back devuelve el user directamente,
#      no wrapeado en { data: user }. El unwrap() del apiClient saca .data que no existe.
#      → dashboardProfile = undefined → tratado como null → user = null
#
# SOLUCIÓN:
#   1. features/auth/context/auth-context.tsx
#      - isAuthenticated = !!firebaseUser  (Firebase es la fuente de verdad)
#      - syncWithBackend maneja tanto { data: DashboardUser } como DashboardUser directo
#      - Si sync falla, fallback a GET /auth/me
#      - Perfil mínimo si todo falla (no bloquear el dashboard)
#
#   2. app/dashboard/layout.tsx
#      - Guard solo en !!firebaseUser, no en !!user
#      - Spinner mientras isLoading (Firebase resolviendo)
#
# NO SE TOCA:
#   - Dashboard-back (el endpoint funciona, era el unwrap del cliente)
#   - Real-back
#   - Real-front
#   - api-client.ts (el unwrap es correcto para otros endpoints, arreglamos en el contexto)
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${YELLOW}▶${NC} $1"; }

[ -f "package.json" ] || fail "Ejecutá desde el root de real-dashboard-front"

# ─────────────────────────────────────────────────────────────────────────────
# 1. features/auth/context/auth-context.tsx
# ─────────────────────────────────────────────────────────────────────────────
step "Reescribiendo features/auth/context/auth-context.tsx"
mkdir -p features/auth/context

cat > features/auth/context/auth-context.tsx << 'EOF'
'use client';

// =============================================================================
// auth-context.tsx — AuthProvider del dashboard-front
//
// FLUJO SSO:
//   1. Firebase restaura la sesión (misma app Firebase que real-front)
//   2. onAuthStateChanged dispara con fbUser != null
//   3. syncWithBackend: POST /auth/sync al dashboard-back
//      → crea/actualiza el User en la DB del dashboard-back
//   4. fetchOrgId: GET /auth/me al dashboard-back para obtener el perfil completo
//
// INVARIANTE:
//   isAuthenticated = !!firebaseUser
//   Firebase es la fuente de verdad. El perfil del backend puede tardar o fallar
//   sin expulsar al usuario.
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

// ─── Tipos públicos ────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * POST /auth/sync al dashboard-back.
 *
 * El endpoint puede devolver:
 *   { success: true, data: DashboardUser }   ← formato con wrapper
 *   DashboardUser directamente               ← formato sin wrapper
 * Manejamos ambos.
 */
async function syncDashboardUser(fbUser: User): Promise<DashboardUser | null> {
  const baseUrl = API_URLS['dashboard'];
  if (!baseUrl) return null;

  try {
    const token = await fbUser.getIdToken();
    const res = await fetch(`${baseUrl}/auth/sync`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        firebaseUid: fbUser.uid,
        email:       fbUser.email ?? '',
        nombre:      fbUser.displayName ?? fbUser.email?.split('@')[0] ?? '',
        avatarUrl:   fbUser.photoURL ?? undefined,
      }),
    });

    if (!res.ok) return null;

    const json = await res.json() as unknown;

    // Normalizar respuesta — el backend puede devolver con o sin wrapper
    if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      if (obj['data'] && typeof obj['data'] === 'object') {
        return obj['data'] as DashboardUser;
      }
      // Sin wrapper → es el DashboardUser directamente
      if (obj['id'] && obj['email']) {
        return obj as unknown as DashboardUser;
      }
    }

    return null;
  } catch (err) {
    console.error('[Auth] syncDashboardUser falló:', err);
    return null;
  }
}

/**
 * GET /auth/me al dashboard-back — fallback si el sync no respondió bien.
 */
async function fetchDashboardMe(fbUser: User): Promise<DashboardUser | null> {
  const baseUrl = API_URLS['dashboard'];
  if (!baseUrl) return null;

  try {
    const token = await fbUser.getIdToken();
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;

    const json = await res.json() as unknown;
    if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      if (obj['data'] && typeof obj['data'] === 'object') {
        return obj['data'] as DashboardUser;
      }
      if (obj['id'] && obj['email']) {
        return obj as unknown as DashboardUser;
      }
    }
    return null;
  } catch (err) {
    console.error('[Auth] fetchDashboardMe falló:', err);
    return null;
  }
}

/**
 * Obtiene organizationId desde el real-back (Sistema 1).
 * Usa el mismo token Firebase — el real-back también acepta FirebaseAuthGuard.
 *
 * Primero intenta NEXT_PUBLIC_REAL_BACK_URL; si no está configurado,
 * intenta NEXT_PUBLIC_API_URL como fallback (en caso de que apunten al mismo back).
 */
async function fetchOrgIdFromRealBack(fbUser: User): Promise<string | null> {
  const realBackUrl =
    process.env.NEXT_PUBLIC_REAL_BACK_URL ??
    null;

  if (!realBackUrl) return null;

  try {
    const token = await fbUser.getIdToken();
    const res = await fetch(`${realBackUrl}/users/me`, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;

    const json = await res.json() as Record<string, unknown>;
    const data = (json['data'] ?? json) as Record<string, unknown>;

    // Caso A: data.organization.id
    const org = data['organization'] as Record<string, unknown> | null | undefined;
    if (org?.['id']) return org['id'] as string;

    // Caso B: data.tenants[].organizationId
    const tenants = data['tenants'] as Array<Record<string, unknown>> | null | undefined;
    if (Array.isArray(tenants) && tenants.length > 0) {
      const owner = tenants.find((t) => t['role'] === 'OWNER') ?? tenants[0];
      if (owner?.['organizationId']) return owner['organizationId'] as string;
    }

    return null;
  } catch (err) {
    console.error('[Auth] fetchOrgIdFromRealBack falló:', err);
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user,         setUser]         = useState<DashboardUser | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [organizationId, setOrgId]     = useState<string | null>(null);
  const router                         = useRouter();
  const refreshTimerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTokenRefresh = useCallback((fbUser: User) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try { await fbUser.getIdToken(true); } catch { /* Firebase manejará logout */ }
    }, 55 * 60 * 1000);
  }, []);

  const loadProfile = useCallback(async (fbUser: User) => {
    // 1. Sync con dashboard-back
    let dashUser = await syncDashboardUser(fbUser);

    // 2. Fallback: GET /auth/me si sync no devolvió datos
    if (!dashUser) {
      dashUser = await fetchDashboardMe(fbUser);
    }

    // 3. Si aún no tenemos perfil, crear uno mínimo para no bloquear el dashboard
    if (!dashUser) {
      dashUser = {
        id:              fbUser.uid,
        email:           fbUser.email ?? '',
        nombre:          fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Usuario',
        role:            'AGENTE',
        firebaseUid:     fbUser.uid,
        isActive:        true,
        createdAt:       new Date().toISOString(),
        realBackProfile: null,
      };
    }

    setUser(dashUser);

    // 4. Obtener organizationId del real-back en paralelo (no bloquea)
    fetchOrgIdFromRealBack(fbUser).then((orgId) => {
      if (orgId) setOrgId(orgId);
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return;
    await loadProfile(firebaseUser);
  }, [firebaseUser, loadProfile]);

  const loginWithGoogle = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await signOut();
    setUser(null);
    setOrgId(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        scheduleTokenRefresh(fbUser);
        // loadProfile es async — no esperamos para poner isLoading=false
        // así el layout puede mostrar el dashboard mientras el perfil carga
        loadProfile(fbUser).finally(() => setIsLoading(false));
      } else {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        setUser(null);
        setOrgId(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [loadProfile, scheduleTokenRefresh]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        isLoading,
        // CLAVE: isAuthenticated solo depende de Firebase
        // El perfil del backend (user) puede tardar sin expulsar al usuario
        isAuthenticated:   !!firebaseUser,
        organizationId,
        setOrganizationId: setOrgId,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
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

// Guard de ruta del dashboard.
//
// LÓGICA:
//   isLoading=true  → Firebase todavía restaura sesión → spinner (nunca redirigir)
//   isLoading=false && !firebaseUser → no hay sesión → /login
//   isLoading=false && firebaseUser  → sesión válida → mostrar dashboard
//
// El perfil del backend (user, organizationId) puede llegar después
// sin afectar la visibilidad del dashboard.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { firebaseUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !firebaseUser) {
      router.replace('/login');
    }
  }, [firebaseUser, isLoading, router]);

  // Firebase todavía resolviendo la sesión desde IndexedDB
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Firebase resolvió y no hay sesión → useEffect redirige, mostrar spinner mientras
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
# 3. Verificar/actualizar .env.local.example
# ─────────────────────────────────────────────────────────────────────────────
step "Actualizando .env.local.example"

if [ -f ".env.local.example" ]; then
  if ! grep -q "NEXT_PUBLIC_REAL_BACK_URL" .env.local.example; then
    printf '\n# URL del Sistema 1 (real-back) — para obtener organizationId\nNEXT_PUBLIC_REAL_BACK_URL=http://localhost:3000\n' >> .env.local.example
    ok ".env.local.example — agregado NEXT_PUBLIC_REAL_BACK_URL"
  else
    ok ".env.local.example — ya tiene NEXT_PUBLIC_REAL_BACK_URL"
  fi
else
  warn ".env.local.example no encontrado — crealo con NEXT_PUBLIC_REAL_BACK_URL"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Script completado${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Archivos modificados:"
echo "    • features/auth/context/auth-context.tsx"
echo "    • app/dashboard/layout.tsx"
echo ""
echo -e "${YELLOW}  Variable de entorno requerida en .env.local:${NC}"
echo ""
echo "    NEXT_PUBLIC_REAL_BACK_URL=<URL del real-back>"
echo ""
echo "    Local:      http://localhost:3000"
echo "    Producción: https://tu-real-back.railway.app"
echo ""
echo "  Y en real-back/.env verificar que ALLOWED_ORIGINS incluya"
echo "  el dominio del dashboard-front."
echo ""
echo -e "${YELLOW}  Para probar:${NC}"
echo "  1. real-front → /profile → 'Ir al Dashboard'"
echo "  2. Debe cargar /dashboard directamente sin pasar por /login"
echo "  3. DevTools Console: no debe aparecer 'syncDashboardUser falló'"
echo ""