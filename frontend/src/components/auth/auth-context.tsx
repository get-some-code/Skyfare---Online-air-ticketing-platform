"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getMeApi,
  joinMembershipApi,
  loginApi,
  logoutApi,
  registerApi,
} from "@/lib/api/auth";
import { getStoredAccessToken } from "@/lib/api/client";
import type {
  LoginPayload,
  RegisterPayload,
  UserPublic,
} from "@/lib/api/types";

interface AuthContextType {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalTab: "login" | "register";
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  joinPrivilegeClub: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");

  const refreshUser = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const current = await getMeApi();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const token = getStoredAccessToken();
    if (!token) {
      queueMicrotask(() => {
        if (!ignore) setIsLoading(false);
      });
      return;
    }
    getMeApi()
      .then((current) => {
        if (!ignore) {
          setUser(current);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setUser(null);
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const openAuthModal = useCallback((tab: "login" | "register" = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await loginApi(payload);
      setUser(res.user);
      setAuthModalOpen(false);
    },
    [],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await registerApi(payload);
      setUser(res.user);
      setAuthModalOpen(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  const joinPrivilegeClub = useCallback(async () => {
    const membership = await joinMembershipApi();
    setUser((prev) => (prev ? { ...prev, membership } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        authModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        joinPrivilegeClub,
        refreshUser,
      }}
    >
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
