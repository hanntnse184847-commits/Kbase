"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { decodeJwt, isExpired } from "@/lib/jwt";
import type { LoginResponse, Role, UserResponse } from "@/lib/types";

interface AuthUser {
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean; // true while we're reading localStorage on first mount
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<UserResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = "kbase_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On first mount, restore the session from localStorage (if the token
  // is still there and hasn't expired).
  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      const payload = decodeJwt(storedToken);
      if (payload && !isExpired(payload)) {
        setToken(storedToken);
        setUser({ email: payload.sub, role: payload.role });
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  function applyToken(newToken: string) {
    const payload = decodeJwt(newToken);
    if (!payload) {
      throw new Error("Token trả về không hợp lệ");
    }
    window.localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUser({ email: payload.sub, role: payload.role });
  }

  async function login(email: string, password: string) {
    try {
      const response = await api.post<LoginResponse>("/api/auth/login", {
        email,
        password,
      });
      applyToken(response.data.token);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const response = await api.post<UserResponse>("/api/auth/register", {
        name,
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
