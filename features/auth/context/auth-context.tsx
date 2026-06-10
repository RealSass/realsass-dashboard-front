'use client';

// =============================================================================
// auth-context.tsx — AuthProvider del dashboard-front
//
// FLUJO DE AUTENTICACIÓN:
//   1. Firebase onAuthStateChanged dispara con el usuario Firebase (fbUser)
//   2. Con el Firebase token, sincronizamos con dashboard-back (POST /auth/sync)
//      → crea o actualiza el User en la DB del dashboard-back
//      → devuelve { id, email, nombre, role, firebaseUid, isActive, createdAt }
//   3. Con el mismo Firebase token, consultamos real-back (GET /users/me)
//      → devuelve el perfil completo con organization.id
//      → de ahí extraemos organizationId
//
// INVARIANTE DE isAuthenticated:
//   = !!firebaseUser
//   Firebase es la fuente de verdad de autenticación.
//   El perfil del backend (user) puede tardar o fallar sin expulsar al usuario.
//
// FLUJO SSO DESDE real-front:
//   real-front llama POST /auth/firebase-sso → obtiene accessToken (JWT propio)
//   El dashboard-front NO usa ese JWT — usa Firebase directamente.
//   Cuando el usuario llega al dashboard-front, Firebase ya restauró la sesión
//   via IndexedDB (mismo proyecto Firebase) → onAuthStateChanged dispara con fbUser.
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
import { apiClient } from '@/lib/api-client';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface DashboardUser {
  id:          string;
  email:       string;
  nombre:      string;
  role:        string;
  firebaseUid: string;
  isActive:    boolean;
  createdAt:   string;
  // Perfil del Sistema 1 (real-back) — puede ser null
  realBackProfile: Record<string, unknown> | null;
}

interface AuthContextType {
  firebaseUser:      User | null;
  user:              DashboardUser | null;
  isLoading:         boolean;
  isAuthenticated:   boolean;   // = !!firebaseUser (Firebase es la fuente de verdad)
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

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Llama POST /auth/sync al dashboard-back para sincronizar el usuario.
 * Si falla, NO lanza — devuelve null y logea el error.
 */
async function syncDashboardBackend(
  fbUser: User,
): Promise<DashboardUser | null> {
  try {
    const result = await apiClient.post<{ success: boolean; data: DashboardUser }>(
      'dashboard',
      '/auth/sync',
      {
        firebaseUid: fbUser.uid,
        email:       fbUser.email ?? '',
        nombre:      fbUser.displayName ?? fbUser.email?.split('@')[0] ?? '',
        avatarUrl:   fbUser.photoURL ?? undefined,
      },
    );
    return result?.data ?? null;
  } catch (err) {
    console.error('[Auth] syncDashboardBackend falló:', err);
    return null;
  }
}

/**
 * Llama GET /auth/me al dashboard-back como fallback si el sync no respondió.
 * El token Firebase es válido en el dashboard-back (FirebaseAuthGuard).
 */
async function fetchDashboardMe(): Promise<DashboardUser | null> {
  try {
    const result = await apiClient.get<{ success: boolean; data: DashboardUser }>(
      'dashboard',
      '/auth/me',
    );
    return result?.data ?? null;
  } catch (err) {
    console.error('[Auth] fetchDashboardMe falló:', err);
    return null;
  }
}

/**
 * Llama GET /users/me al Sistema 1 (real-back) para obtener organizationId.
 *
 * El real-back también usa FirebaseAuthGuard → acepta el mismo token Firebase.
 * URL configurada en NEXT_PUBLIC_REAL_BACK_URL (o fallback a NEXT_PUBLIC_API_URL).
 *
 * Si el servicio no está disponible, devuelve null sin romper el flujo.
 */
async function fetchRealBackProfile(): Promise<Record<string, unknown> | null> {
  const realBackUrl =
    process.env.NEXT_PUBLIC_REAL_BACK_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    null;

  if (!realBackUrl) {
    // Si no hay URL del real-back configurada, no bloqueamos el flujo
    return null;
  }

  try {
    // No usamos apiClient para no depender del sistema 'dashboard'
    // Necesitamos el token Firebase directamente
    const { auth: firebaseAuth } = await import('@/lib/firebase');
    if (!firebaseAuth.currentUser) return null;

    const token = await firebaseAuth.currentUser.getIdToken();
    const res = await fetch(`${realBackUrl}/users/me`, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: unknown };
    return (json?.data as Record<string, unknown>) ?? null;
  } catch (err) {
    console.error('[Auth] fetchRealBackProfile falló:', err);
    return null;
  }
}

/**
 * Extrae el organizationId del perfil del real-back.
 * El real-back devuelve { organization: { id, ... } } dentro de data.
 */
function extractOrgId(profile: Record<string, unknown> | null): string | null {
  if (!profile) return null;

  // Caso 1: profile.organization.id (estructura de real-back)
  const org = profile.organization as Record<string, unknown> | null | undefined;
  if (org?.id) return org.id as string;

  // Caso 2: profile.tenants[0].organizationId (si viene con tenants)
  const tenants = profile.tenants as Array<Record<string, unknown>> | null | undefined;
  if (Array.isArray(tenants) && tenants.length > 0) {
    const ownerTenant = tenants.find((t) => t.role === 'OWNER');
    const firstTenant = ownerTenant ?? tenants[0];
    if (firstTenant?.organizationId) return firstTenant.organizationId as string;
  }

  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser]                 = useState<DashboardUser | null>(null);
  const [isLoading, setIsLoading]       = useState(true);   // true hasta que onAuthStateChanged resuelve
  const [organizationId, setOrgId]      = useState<string | null>(null);
  const router                          = useRouter();
  const refreshTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Refresh proactivo del token Firebase (expira cada 60 min).
   * Lo hacemos a los 55 min para evitar 401 en requests de larga sesión.
   */
  const scheduleTokenRefresh = useCallback((fbUser: User) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        await fbUser.getIdToken(true);
      } catch {
        // Si falla, Firebase dispara onAuthStateChanged(null) → logout automático
      }
    }, 55 * 60 * 1000);
  }, []);

  /**
   * Carga completa del perfil post-autenticación:
   *  1. Sync con dashboard-back (crea/actualiza usuario en esa DB)
   *  2. Fetch de real-back para obtener organizationId
   */
  const loadProfile = useCallback(async (fbUser: User) => {
    // Paso 1 — sync con dashboard-back
    let dashboardProfile = await syncDashboardBackend(fbUser);

    // Fallback — si sync falló, intentar GET /auth/me
    if (!dashboardProfile) {
      dashboardProfile = await fetchDashboardMe();
    }

    // Paso 2 — obtener organizationId del real-back
    const realBackProfile = await fetchRealBackProfile();
    const orgId = extractOrgId(realBackProfile);

    if (dashboardProfile) {
      setUser({ ...dashboardProfile, realBackProfile });
    } else {
      // No pudimos obtener el perfil del backend, pero Firebase sí autenticó.
      // Creamos un perfil mínimo para no bloquear el dashboard.
      setUser({
        id:              fbUser.uid,
        email:           fbUser.email ?? '',
        nombre:          fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Usuario',
        role:            'AGENTE',
        firebaseUid:     fbUser.uid,
        isActive:        true,
        createdAt:       new Date().toISOString(),
        realBackProfile,
      });
    }

    if (orgId) setOrgId(orgId);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return;
    await loadProfile(firebaseUser);
  }, [firebaseUser, loadProfile]);

  const loginWithGoogle = useCallback(async () => {
    await signInWithGoogle();
    // onAuthStateChanged se encarga del resto
  }, []);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await signOut();
    setUser(null);
    setOrgId(null);
    router.push('/login');
  }, [router]);

  // ── Listener principal de auth state ──────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        scheduleTokenRefresh(fbUser);
        // loadProfile es async — cuando termine actualizará user y orgId.
        // isLoading se pone a false DESPUÉS de intentar cargar el perfil
        // para evitar flashes de UI con estado incompleto.
        await loadProfile(fbUser);
      } else {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        setUser(null);
        setOrgId(null);
      }

      // Siempre marcar como listo, independientemente del resultado del perfil
      setIsLoading(false);
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
        // CAMBIO CLAVE: isAuthenticated depende SOLO de Firebase, no del perfil backend.
        // Esto evita redirects prematuros mientras el backend carga.
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
