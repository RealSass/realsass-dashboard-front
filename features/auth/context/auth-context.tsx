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
