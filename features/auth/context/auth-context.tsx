'use client';

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
  getIdToken,
  type User,
} from '@/lib/firebase';
import { apiClient } from '@/lib/api-client';

export interface DashboardUser {
  id:          string;
  email:       string;
  nombre:      string;
  role:        string;
  firebaseUid: string;
  isActive:    boolean;
  createdAt:   string;
  // Perfil del Sistema 1 (real-back) — puede ser null si el servicio no está disponible
  realBackProfile: Record<string, unknown> | null;
}

interface AuthContextType {
  firebaseUser:    User | null;
  user:            DashboardUser | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  organizationId:  string | null;
  setOrganizationId: (id: string) => void;
  loginWithGoogle: () => Promise<void>;
  logout:          () => Promise<void>;
  refreshUser:     () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser]                 = useState<DashboardUser | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [organizationId, setOrgId]      = useState<string | null>(null);
  const router                          = useRouter();
  const refreshTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Sync con el dashboard back y obtiene perfil completo.
   * El firebaseToken se pasa para reutilizarlo en la llamada al Sistema 1.
   */
  const syncWithBackend = useCallback(async (fbUser: User): Promise<DashboardUser | null> => {
    try {
      const token = await fbUser.getIdToken();
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
      return result.data;
    } catch (err) {
      console.error('[Auth] Error sincronizando con backend:', err);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return;
    const profile = await syncWithBackend(firebaseUser);
    if (profile) setUser(profile);
  }, [firebaseUser, syncWithBackend]);

  /**
   * Programa refresh proactivo del token Firebase a los 55 min (expira a los 60).
   */
  const scheduleTokenRefresh = useCallback((fbUser: User) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try { await fbUser.getIdToken(true); } catch { /* Firebase disparará onAuthStateChanged */ }
    }, 55 * 60 * 1000);
  }, []);

  /**
   * Lee organizationId del perfil del Sistema 1 si está disponible.
   */
  const extractOrgId = useCallback((profile: DashboardUser): string | null => {
    const realBack = profile.realBackProfile as Record<string, unknown> | null;
    if (!realBack) return null;
    const org = realBack.organization as Record<string, unknown> | null;
    return (org?.id as string) ?? null;
  }, []);

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

  // ── Listener principal de auth state ────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        scheduleTokenRefresh(fbUser);
        const profile = await syncWithBackend(fbUser);
        if (profile) {
          setUser(profile);
          const orgId = extractOrgId(profile);
          if (orgId) setOrgId(orgId);
        }
      } else {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        setUser(null);
        setOrgId(null);
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [syncWithBackend, scheduleTokenRefresh, extractOrgId]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        isLoading,
        isAuthenticated: !!firebaseUser && !!user,
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
