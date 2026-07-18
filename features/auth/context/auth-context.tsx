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
