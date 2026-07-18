#!/usr/bin/env bash
# =============================================================================
# S2 — real-dashboard-front
# Adapta el dashboard de "real-estate + cookie auth" a CMS genérico con:
#   Auth:   Firebase SDK directo → real-back (GET /api/v1/users/me)
#   Config: real-back (flags, themes, quotas, webhooks)
#   Tienda: real-ecommerce-back (productos, categorías, pedidos, inventario)
#
# Lo que se elimina:
#   features/propiedades/ features/zonas/ — dominio real-estate
#   auth basado en cookies contra dashboard-back
#   referencias a NEXT_PUBLIC_DASHBOARD_API_URL y NEXT_PUBLIC_CONFIG_URL
#
# Variables de entorno necesarias (.env.local):
#   NEXT_PUBLIC_FIREBASE_API_KEY
#   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
#   NEXT_PUBLIC_FIREBASE_PROJECT_ID
#   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
#   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
#   NEXT_PUBLIC_FIREBASE_APP_ID
#   NEXT_PUBLIC_REAL_BACK_URL=http://localhost:3000
#   NEXT_PUBLIC_ECOMMERCE_API_URL=http://localhost:3005/api/v1
#
# Uso: ejecutar desde la raíz del repo real-dashboard-front
# =============================================================================
set -euo pipefail

echo "▶ [real-dashboard-front] S2 — adaptación a CMS genérico..."

# ─────────────────────────────────────────────────────────────────────────────
# 1. Eliminar dominios de real-estate
# ─────────────────────────────────────────────────────────────────────────────
rm -rf features/propiedades features/zonas
echo "  ✔ features/propiedades/ y features/zonas/ eliminados"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Instalar firebase si no está
# ─────────────────────────────────────────────────────────────────────────────
if ! grep -q '"firebase"' package.json; then
  echo "  ⚙  Instalando firebase..."
  pnpm add firebase
fi
echo "  ✔ firebase OK"

# ─────────────────────────────────────────────────────────────────────────────
# 3. lib/firebase.ts — inicialización Firebase + helper de token
# ─────────────────────────────────────────────────────────────────────────────
cat > lib/firebase.ts << 'EOF'
// lib/firebase.ts — inicialización Firebase client SDK
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Retorna el token JWT del usuario actual, refrescándolo si está por expirar.
 * Lanza si no hay usuario autenticado.
 */
export async function getCurrentUserToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay usuario autenticado');
  return user.getIdToken();
}

export { signInWithPopup, signOut, onAuthStateChanged, type User };
EOF
echo "  ✔ lib/firebase.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 4. lib/api-client.ts — dos helpers: realBackFetch + ecommerceFetch
#    Reemplaza el apiClient multi-sistema basado en ApiSystem
# ─────────────────────────────────────────────────────────────────────────────
cat > lib/api-client.ts << 'EOF'
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
EOF
echo "  ✔ lib/api-client.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 5. features/auth/context/auth-context.tsx — Firebase SDK + real-back /users/me
# ─────────────────────────────────────────────────────────────────────────────
cat > features/auth/context/auth-context.tsx << 'EOF'
'use client';

// =============================================================================
// auth-context.tsx — Firebase SDK directo + real-back /api/v1/users/me
//
// Flujo:
//   1. Firebase SDK autentica al usuario (Google popup o email/password)
//   2. onAuthStateChanged dispara fetchProfile → GET /api/v1/users/me
//      con el Bearer token → real-back devuelve { user, organizationId }
//   3. Si el usuario existe en real-back → seteamos user + organizationId
//   4. Si no existe (primer login) → real-back hace upsert en /auth/sync
//
// Sin cookies propias, sin dashboard-back, sin refresh manual:
//   Firebase SDK maneja el refresco del JWT automáticamente.
// =============================================================================

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  auth, googleProvider, signInWithPopup, signOut,
  onAuthStateChanged, type User as FirebaseUser,
} from '@/lib/firebase';
import { realBackFetch } from '@/lib/api-client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DashboardUser {
  id:          string;
  firebaseUid: string;
  email:       string;
  displayName: string | null;
  avatarUrl:   string | null;
  isOwner:     boolean;
  isAffiliate: boolean;
  createdAt:   string;
}

interface AuthContextType {
  user:              DashboardUser | null;
  firebaseUser:      DashboardUser | null; // alias — compatibilidad con código existente
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORG_KEY = 'dash_org_id';

async function syncWithRealBack(firebaseUser: FirebaseUser): Promise<DashboardUser | null> {
  try {
    // Primero sincronizamos el usuario en real-back (upsert idempotente)
    await realBackFetch.post('/api/v1/auth/sync', {
      firebaseUid: firebaseUser.uid,
      email:       firebaseUser.email,
      displayName: firebaseUser.displayName,
      avatarUrl:   firebaseUser.photoURL,
    });

    // Luego traemos el perfil completo con organizationId
    const data = await realBackFetch.get<{
      user:           DashboardUser;
      organizationId: string | null;
    }>('/api/v1/users/me');

    return data.user;
  } catch (err) {
    console.error('[Auth] Error sincronizando con real-back:', err);
    return null;
  }
}

async function fetchOrganizationId(user: DashboardUser): Promise<string | null> {
  try {
    const data = await realBackFetch.get<{
      user:           DashboardUser;
      organizationId: string | null;
    }>('/api/v1/users/me');
    return data.organizationId ?? null;
  } catch {
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<DashboardUser | null>(null);
  const [orgId,     setOrgId]   = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();
  const initialized = useRef(false);

  const setOrganizationId = useCallback((id: string) => {
    setOrgId(id);
    if (typeof window !== 'undefined') localStorage.setItem(ORG_KEY, id);
  }, []);

  // Sincroniza Firebase user → real-back → dashboard state
  const handleFirebaseUser = useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setOrgId(null);
      setLoading(false);
      return;
    }

    const profile = await syncWithRealBack(fbUser);
    if (!profile) {
      setUser(null);
      setOrgId(null);
      setLoading(false);
      return;
    }

    setUser(profile);

    // Recuperar orgId: primero localStorage, luego real-back
    const stored = typeof window !== 'undefined' ? localStorage.getItem(ORG_KEY) : null;
    if (stored) {
      setOrgId(stored);
    } else {
      const remoteOrgId = await fetchOrganizationId(profile);
      if (remoteOrgId) {
        setOrgId(remoteOrgId);
        localStorage.setItem(ORG_KEY, remoteOrgId);
      }
    }

    setLoading(false);
  }, []);

  // Escuchar cambios de auth de Firebase (incluye refresh automático de token)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!initialized.current) {
        initialized.current = true;
      }
      await handleFirebaseUser(fbUser);
    });
    return () => unsub();
  }, [handleFirebaseUser]);

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged se dispara automáticamente
    } catch (err) {
      setLoading(false);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    if (typeof window !== 'undefined') localStorage.removeItem(ORG_KEY);
    setUser(null);
    setOrgId(null);
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const profile = await syncWithRealBack(fbUser);
    if (profile) setUser(profile);
  }, []);

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
echo "  ✔ features/auth/context/auth-context.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 6. features/auth/types.ts — tipos actualizados
# ─────────────────────────────────────────────────────────────────────────────
cat > features/auth/types.ts << 'EOF'
export type { DashboardUser } from './context/auth-context';
EOF
echo "  ✔ features/auth/types.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 7. app/login/page.tsx — login con Google (reemplaza cookie-based)
# ─────────────────────────────────────────────────────────────────────────────
cat > app/login/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    router.replace('/dashboard');
    return null;
  }

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Logo className="h-12 w-12 text-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Iniciá sesión para acceder al panel de gestión
          </p>
        </div>

        <Button
          className="w-full h-11 text-base font-medium gap-3"
          onClick={handleGoogle}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Iniciando sesión...' : 'Continuar con Google'}
        </Button>
      </div>
    </main>
  );
}
EOF
echo "  ✔ app/login/page.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 8. app/auth/sso/page.tsx — simplificado (redirige, ya no necesita lógica)
# ─────────────────────────────────────────────────────────────────────────────
cat > app/auth/sso/page.tsx << 'EOF'
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// SSO entry point — Firebase ya completó el login antes de llegar acá.
// Solo redirigir al dashboard.
export default function SsoPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
    </main>
  );
}
EOF
echo "  ✔ app/auth/sso/page.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 9. config/constants.ts — 2 URLs, query keys genéricos
# ─────────────────────────────────────────────────────────────────────────────
cat > config/constants.ts << 'EOF'
// config/constants.ts

export const REAL_BACK_URL     = process.env.NEXT_PUBLIC_REAL_BACK_URL     ?? '';
export const ECOMMERCE_API_URL = process.env.NEXT_PUBLIC_ECOMMERCE_API_URL ?? '';

// ─── TanStack Query keys ──────────────────────────────────────────────────────

export const QUERY_KEYS = {
  // Auth / perfil
  me:              ['me']               as const,
  // Config — real-back
  configThemes:    ['config-themes']    as const,
  configFlags:     ['config-flags']     as const,
  configWebhooks:  ['config-webhooks']  as const,
  configWebhookLogs: ['config-wh-logs'] as const,
  configQuotas:    ['config-quotas']    as const,
  // Ecommerce — real-ecommerce-back
  products:        ['products']         as const,
  product:         ['product']          as const,
  categories:      ['categories']       as const,
  orders:          ['orders']           as const,
  order:           ['order']            as const,
  inventory:       ['inventory']        as const,
  // Módulos futuros
  conversaciones:  ['conversaciones']   as const,
  mensajes:        ['mensajes']         as const,
  balance:         ['balance']          as const,
  transacciones:   ['transacciones']    as const,
  campanas:        ['campanas']         as const,
  metricasCampana: ['metricas-campana'] as const,
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE     = 100;
EOF
echo "  ✔ config/constants.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 10. config/navigation.ts — Tienda genérica (reemplaza Inmobiliaria)
# ─────────────────────────────────────────────────────────────────────────────
cat > config/navigation.ts << 'EOF'
export const NAV_GROUPS = [
  {
    label: 'Tienda',
    items: [
      { name: 'Productos',   href: '/dashboard/tienda/productos', icon: 'Package',    active: true  },
      { name: 'Pedidos',     href: '/dashboard/tienda/pedidos',   icon: 'ShoppingBag', active: true  },
      { name: 'Preview',     href: '/dashboard/tienda/preview',   icon: 'ExternalLink', active: true },
    ],
  },
  {
    label: 'Módulos',
    items: [
      { name: 'Chat IA',  href: '/dashboard/chat',     icon: 'MessageSquare', active: false },
      { name: 'Pagos',    href: '/dashboard/pagos',    icon: 'CreditCard',    active: false },
      { name: 'Campañas', href: '/dashboard/campanas', icon: 'TrendingUp',    active: false },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { name: 'Tema visual',   href: '/dashboard/configuracion/tema',     icon: 'Palette',    active: true },
      { name: 'Feature Flags', href: '/dashboard/configuracion/flags',    icon: 'ToggleLeft', active: true },
      { name: 'Webhooks',      href: '/dashboard/configuracion/webhooks', icon: 'Webhook',    active: true },
      { name: 'Quotas',        href: '/dashboard/configuracion/quotas',   icon: 'BarChart2',  active: true },
    ],
  },
] as const;
EOF
echo "  ✔ config/navigation.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 11. config/site.ts — nombre genérico
# ─────────────────────────────────────────────────────────────────────────────
cat > config/site.ts << 'EOF'
export const siteConfig = {
  name:        'Dashboard',
  description: 'Panel de gestión SaaS',
  locale:      'es-AR',
} as const;
EOF
echo "  ✔ config/site.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 12. components/layout/dashboard-sidebar.tsx — iconos actualizados
# ─────────────────────────────────────────────────────────────────────────────
cat > components/layout/dashboard-sidebar.tsx << 'EOF'
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Package, ShoppingBag, ExternalLink,
  MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,
  LogOut, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { siteConfig } from '@/config/site';
import { NAV_GROUPS } from '@/config/navigation';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Package, ShoppingBag, ExternalLink,
  MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,
};

export function DashboardSidebar() {
  const pathname         = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar h-screen sticky top-0 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
        <span className="font-semibold text-sm text-sidebar-foreground">{siteConfig.name}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon   = ICON_MAP[item.icon] ?? Package;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        !item.active && 'opacity-50 pointer-events-none',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.name}
                      {!item.active && (
                        <span className="ml-auto text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Pronto
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-sidebar-border px-3 py-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors"
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user.displayName ?? user.email}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <div className="mt-1 rounded-md border border-border bg-popover shadow-md overflow-hidden">
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
EOF
echo "  ✔ components/layout/dashboard-sidebar.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 13. Config services — cambiar 'config' → realBackFetch
#     themes.service.ts, flags.service.ts, webhooks.service.ts, quotas.service.ts
# ─────────────────────────────────────────────────────────────────────────────
cat > features/config-themes/services/themes.service.ts << 'EOF'
import { realBackFetch } from '@/lib/api-client';
import type { ThemeConfig, CreateThemeInput } from '@/features/config/types';

const BASE = '/api/v1/config/themes';

export const getThemes = (orgId: string): Promise<ThemeConfig[]> =>
  realBackFetch.get(BASE, orgId);

export const createTheme = (data: CreateThemeInput, orgId: string): Promise<ThemeConfig> =>
  realBackFetch.post(BASE, data, orgId);

export const activateTheme = (id: string, orgId: string): Promise<{ success: boolean; message: string }> =>
  realBackFetch.patch(`${BASE}/${id}/activate`, {}, orgId);

export const deleteTheme = (id: string, orgId: string): Promise<{ success: boolean; message: string }> =>
  realBackFetch.delete(`${BASE}/${id}`, orgId);
EOF

cat > features/config-flags/services/flags.service.ts << 'EOF'
import { realBackFetch } from '@/lib/api-client';
import type { FeatureFlag } from '@/features/config/types';

const BASE = '/api/v1/config/flags';

export const getFlags = (orgId: string): Promise<FeatureFlag[]> =>
  realBackFetch.get(BASE, orgId);

export const updateFlag = (
  id: string,
  data: { enabled?: boolean; rolloutPercentage?: number; conditions?: Record<string, unknown> },
  orgId: string,
): Promise<FeatureFlag> =>
  realBackFetch.patch(`${BASE}/${id}`, data, orgId);
EOF

cat > features/config-webhooks/services/webhooks.service.ts << 'EOF'
import { realBackFetch } from '@/lib/api-client';
import type { WebhookEndpoint, CreateWebhookInput, WebhookDeliveryLog } from '@/features/config/types';

const BASE = '/api/v1/config/webhooks';

export const getWebhooks = (orgId: string): Promise<WebhookEndpoint[]> =>
  realBackFetch.get(BASE, orgId);

export const createWebhook = (
  data: CreateWebhookInput,
  orgId: string,
): Promise<WebhookEndpoint & { secret: string }> =>
  realBackFetch.post(BASE, data, orgId);

export const testWebhook = (
  id: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> =>
  realBackFetch.post(`${BASE}/${id}/test`, {}, orgId);

export const deleteWebhook = (
  id: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> =>
  realBackFetch.delete(`${BASE}/${id}`, orgId);

export const getWebhookLogs = (
  id: string,
  orgId: string,
  take = 50,
): Promise<WebhookDeliveryLog[]> =>
  realBackFetch.get(`${BASE}/${id}/logs?take=${take}`, orgId);
EOF

cat > features/config-quotas/services/quotas.service.ts << 'EOF'
import { realBackFetch } from '@/lib/api-client';
import type { QuotaConfig } from '@/features/config/types';

const BASE = '/api/v1/config/quotas';

export const getQuotas = (orgId: string): Promise<QuotaConfig[]> =>
  realBackFetch.get(BASE, orgId);

export const updateQuotaLimit = (
  resource: string,
  limit: number,
  orgId: string,
): Promise<QuotaConfig> =>
  realBackFetch.patch(`${BASE}/${encodeURIComponent(resource)}`, { limit }, orgId);
EOF

echo "  ✔ features/config-*/services/ → realBackFetch"

# ─────────────────────────────────────────────────────────────────────────────
# 14. features/store/api.ts — apuntar a ecommerceFetch con rutas reales
#     Las rutas de ecommerce-back son:
#       GET  /api/v1/ecommerce/catalog/admin       (productos admin)
#       POST /api/v1/ecommerce/catalog/admin        (crear producto)
#       GET  /api/v1/ecommerce/orders               (pedidos)
#       PATCH /api/v1/ecommerce/inventory/:variantId
# ─────────────────────────────────────────────────────────────────────────────
cat > features/store/api.ts << 'EOF'
// features/store/api.ts
// Consume real-ecommerce-back vía ecommerceFetch.
// Las rutas están prefijadas con /api/v1 dentro de NEXT_PUBLIC_ECOMMERCE_API_URL.

import { ecommerceFetch, buildQuery } from '@/lib/api-client';
import type {
  Product, ProductInput, ProductFilters,
  Order, OrderFilters, Paginated,
} from './types';

export const storeApi = {
  // ─── Catálogo (admin) ───────────────────────────────────────────────────────
  getProducts: (orgId: string, filters: ProductFilters = {}) =>
    ecommerceFetch.get<Paginated<Product>>(
      `/ecommerce/catalog/admin${buildQuery(filters as Record<string, unknown>)}`,
      orgId,
    ),

  getProduct: (orgId: string, id: string) =>
    ecommerceFetch.get<Product>(`/ecommerce/catalog/admin/${id}`, orgId),

  createProduct: (orgId: string, data: ProductInput) =>
    ecommerceFetch.post<Product>('/ecommerce/catalog/admin', data, orgId),

  updateProduct: (orgId: string, id: string, data: Partial<ProductInput>) =>
    ecommerceFetch.patch<Product>(`/ecommerce/catalog/admin/${id}`, data, orgId),

  deleteProduct: (orgId: string, id: string) =>
    ecommerceFetch.delete<{ message: string }>(`/ecommerce/catalog/admin/${id}`, orgId),

  // ─── Inventario ─────────────────────────────────────────────────────────────
  updateInventory: (orgId: string, variantId: string, quantityAvailable: number) =>
    ecommerceFetch.patch<{ message: string }>(
      `/ecommerce/inventory/${variantId}`,
      { quantityAvailable },
      orgId,
    ),

  // ─── Pedidos ────────────────────────────────────────────────────────────────
  getOrders: (orgId: string, filters: OrderFilters = {}) =>
    ecommerceFetch.get<Paginated<Order>>(
      `/ecommerce/orders${buildQuery(filters as Record<string, unknown>)}`,
      orgId,
    ),

  getOrder: (orgId: string, id: string) =>
    ecommerceFetch.get<Order>(`/ecommerce/orders/${id}`, orgId),
};
EOF
echo "  ✔ features/store/api.ts → ecommerceFetch"

# ─────────────────────────────────────────────────────────────────────────────
# 15. app/dashboard/page.tsx — dashboard principal genérico
# ─────────────────────────────────────────────────────────────────────────────
cat > app/dashboard/page.tsx << 'EOF'
'use client';

import { Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useOrders, useProducts } from '@/features/store/hooks';

export default function DashboardPage() {
  const { organizationId } = useAuth();
  const { data: ordersData } = useOrders(organizationId ?? '', {});
  const { data: productsData } = useProducts(organizationId ?? '', {});

  const totalOrders   = (ordersData as any)?.meta?.total   ?? 0;
  const totalProducts = (productsData as any)?.meta?.total ?? 0;

  const cards = [
    { icon: Package,     label: 'Productos',    value: totalProducts, color: '#60a5fa' },
    { icon: ShoppingBag, label: 'Pedidos',       value: totalOrders,   color: '#34d399' },
    { icon: TrendingUp,  label: 'Campañas',      value: '—',           color: '#fbbf24' },
    { icon: Users,       label: 'Clientes',      value: '—',           color: '#a78bfa' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vista general de tu organización
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" style={{ color }} />
              <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
EOF
echo "  ✔ app/dashboard/page.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 16. app/dashboard/zonas/page.tsx — reemplazada por placeholder
#     (zonas como concepto real-estate ya no existe)
# ─────────────────────────────────────────────────────────────────────────────
cat > app/dashboard/zonas/page.tsx << 'EOF'
'use client';
import { MapPin } from 'lucide-react';

// Esta página era específica del dominio real-estate.
// En la versión genérica las categorías de productos se gestionan
// desde /dashboard/tienda/productos.
export default function ZonasRedirect() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center gap-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <MapPin className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Zonas</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          El módulo de zonas ya no está disponible en esta versión.
          Las categorías se gestionan desde la sección Tienda → Productos.
        </p>
      </div>
    </div>
  );
}
EOF
echo "  ✔ app/dashboard/zonas/page.tsx (placeholder)"

# ─────────────────────────────────────────────────────────────────────────────
# 17. .env.local.example actualizado
# ─────────────────────────────────────────────────────────────────────────────
cat > .env.local.example << 'EOF'
# ─── Firebase ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ─── Backends ────────────────────────────────────────────────────────────────
# real-back: auth + config (flags, themes, webhooks, quotas)
NEXT_PUBLIC_REAL_BACK_URL=http://localhost:3000

# real-ecommerce-back: catálogo + stock + pedidos
NEXT_PUBLIC_ECOMMERCE_API_URL=http://localhost:3005/api/v1

# URL del storefront (solo para el link de "Preview")
NEXT_PUBLIC_STORE_FRONT_URL=http://localhost:3006
EOF
echo "  ✔ .env.local.example"

# ─────────────────────────────────────────────────────────────────────────────
# 18. Dockerfile — limpiar ARGs que ya no existen
# ─────────────────────────────────────────────────────────────────────────────
cat > Dockerfile << 'EOF'
# =============================================================================
# Dockerfile — real-dashboard-front (Next.js)
# =============================================================================

FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate
WORKDIR /app
COPY package.json .npmrc* ./
RUN pnpm install --no-frozen-lockfile

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate
WORKDIR /app

# Firebase
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

# Backends
ARG NEXT_PUBLIC_REAL_BACK_URL
ARG NEXT_PUBLIC_ECOMMERCE_API_URL
ARG NEXT_PUBLIC_STORE_FRONT_URL

ENV NEXT_PUBLIC_REAL_BACK_URL=$NEXT_PUBLIC_REAL_BACK_URL
ENV NEXT_PUBLIC_ECOMMERCE_API_URL=$NEXT_PUBLIC_ECOMMERCE_API_URL
ENV NEXT_PUBLIC_STORE_FRONT_URL=$NEXT_PUBLIC_STORE_FRONT_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public                               ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
EOF
echo "  ✔ Dockerfile"

# ─────────────────────────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "✅ [real-dashboard-front] S2 completado."
echo ""
echo "  Cambios aplicados:"
echo "  • lib/firebase.ts            — Firebase SDK init + getCurrentUserToken"
echo "  • lib/api-client.ts          — realBackFetch + ecommerceFetch (2 helpers)"
echo "  • features/auth/context/     — Firebase onAuthStateChanged → real-back /users/me"
echo "  • app/login/page.tsx         — login con Google (popup)"
echo "  • config/constants.ts        — 2 URLs, query keys genéricos"
echo "  • config/navigation.ts       — Tienda (Productos/Pedidos) en lugar de Inmobiliaria"
echo "  • config/site.ts             — nombre genérico"
echo "  • components/layout/sidebar  — iconos actualizados"
echo "  • features/config-*/services — → realBackFetch /api/v1/config/*"
echo "  • features/store/api.ts      — → ecommerceFetch rutas reales ecommerce-back"
echo "  • app/dashboard/page.tsx     — dashboard genérico con métricas de ecommerce"
echo "  • features/propiedades/      — ELIMINADO"
echo "  • features/zonas/            — ELIMINADO"
echo "  • .env.local.example         — 2 variables de entorno"
echo "  • Dockerfile                 — ARGs limpios"
echo ""
echo "  PENDIENTE MANUAL:"
echo "  1. Copiar .env.local.example → .env.local y completar con tus valores reales"
echo "  2. Verificar que real-back tiene /api/v1/auth/sync y /api/v1/users/me"
echo "  3. pnpm dev — verificar que el login con Google funciona"