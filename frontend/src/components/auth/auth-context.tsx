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
import {
  clearStoredSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredUser,
} from "@/lib/api/client";
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
  // Optimistically restore session from localStorage for seamless persistence
  const [user, setUser] = useState<UserPublic | null>(() => getStoredUser<UserPublic>());
  const [isLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");

  const refreshUser = useCallback(async () => {
    const token = getStoredAccessToken() || getStoredRefreshToken();
    if (!token) {
      setUser(null);
      setStoredUser(null);
      return;
    }
    try {
      const current = await getMeApi();
      setUser(current);
      setStoredUser(current);
    } catch {
      setUser(null);
      clearStoredSession();
    }
  }, []);

  // Listen for session expiry event from API client
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setStoredUser(null);
    }
    window.addEventListener("skyfare:auth:session_expired", handleSessionExpired);
    return () => window.removeEventListener("skyfare:auth:session_expired", handleSessionExpired);
  }, []);

  // Validate and sync session in background on mount
  useEffect(() => {
    let ignore = false;
    const token = getStoredAccessToken() || getStoredRefreshToken();
    if (!token) {
      return;
    }
    getMeApi()
      .then((current) => {
        if (!ignore) {
          setUser(current);
          setStoredUser(current);
        }
      })
      .catch(() => {
        if (!ignore && !getStoredRefreshToken()) {
          setUser(null);
          setStoredUser(null);
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
      setStoredUser(res.user);
      setAuthModalOpen(false);
    },
    [],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await registerApi(payload);
      setUser(res.user);
      setStoredUser(res.user);
      setAuthModalOpen(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    setStoredUser(null);
  }, []);

  const joinPrivilegeClub = useCallback(async () => {
    const membership = await joinMembershipApi();
    setUser((prev) => {
      const updated = prev ? { ...prev, membership } : null;
      setStoredUser(updated);
      return updated;
    });
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
