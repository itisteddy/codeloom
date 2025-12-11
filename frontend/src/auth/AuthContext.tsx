import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { AnyUserRole, normalizeRole, UserRole } from '../types/roles';

interface AuthUser {
  id: string;
  practiceId: string;
  practiceName?: string; // Practice name from backend
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'codeloom_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { user: AuthUser; token: string };
        setUser(parsed.user);
        setToken(parsed.token);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Login failed');
      }

      const data = await res.json();
      // Normalize legacy 'admin' role to 'practice_admin'
      const rawUser = data.user;
      const authUser: AuthUser = {
        ...rawUser,
        role: normalizeRole(rawUser.role as AnyUserRole),
        practiceName: rawUser.practiceName || undefined, // Include practiceName if available
      };
      const authToken: string = data.token;

      // After login, fetch full user data from /api/me to get practiceName
      try {
        const meRes = await apiFetch('/me', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          authUser.practiceName = meData.practiceName || undefined;
        }
      } catch {
        // If /api/me fails, continue with login data
      }

      setUser(authUser);
      setToken(authToken);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: authUser, token: authToken })
      );
    } catch (e: any) {
      setError(e.message || 'Login failed');
      setUser(null);
      setToken(null);
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

