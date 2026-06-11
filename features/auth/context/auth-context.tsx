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
