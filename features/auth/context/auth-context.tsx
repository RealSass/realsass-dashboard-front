'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '@/lib/api-client';
import { loginService, registerService, logoutService } from '../services/auth.service';
import { API_URLS } from '@/config/constants';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, nombre: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      exp: number;
      sub?: string;
      id?: string;
      email?: string;
      nombre?: string;
      role?: string;
    };
    if (payload.exp * 1000 <= Date.now()) return null;
    return {
      id:     payload.sub ?? payload.id ?? '',
      email:  payload.email ?? '',
      nombre: payload.nombre ?? '',
      role:   (payload.role as User['role']) ?? 'VENDEDOR',
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = getAccessToken();
      if (token) {
        const decoded = decodeToken(token);
        if (decoded) {
          setUser(decoded);
        } else {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const res = await fetch(`${API_URLS.dashboard}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });
              if (res.ok) {
                const json = await res.json() as { data?: { accessToken: string; refreshToken: string } };
                const tokens = json?.data ?? (json as { accessToken: string; refreshToken: string });
                saveTokens(tokens);
                setUser(decodeToken(tokens.accessToken));
              } else {
                clearTokens();
              }
            } catch {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginService(email, password);
    const userData: User = response.user ?? {
      id:     (response as unknown as { sub?: string; id?: string }).sub ?? (response as unknown as { id?: string }).id ?? '',
      email:  (response as unknown as { email?: string }).email ?? email,
      nombre: (response as unknown as { nombre?: string }).nombre ?? '',
      role:   (response as unknown as { role?: User['role'] }).role ?? 'VENDEDOR',
    };
    setUser(userData);
  }, []);

  const register = useCallback(async (email: string, nombre: string, password: string) => {
    const response = await registerService(email, nombre, password);
    const userData: User = response.user ?? {
      id:     (response as unknown as { sub?: string; id?: string }).sub ?? (response as unknown as { id?: string }).id ?? '',
      email:  (response as unknown as { email?: string }).email ?? email,
      nombre,
      role:   (response as unknown as { role?: User['role'] }).role ?? 'VENDEDOR',
    };
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
