import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@ronbri/types";
import { authApi, setAccessToken, connectSocket, disconnectSocket } from "@ronbri/api-client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const { data: authData } = await import("axios").then(() =>
        import("@ronbri/api-client").then((m) => m.apiClient.post<{ accessToken: string }>("/auth/refresh"))
      );
      setAccessToken(authData.accessToken);
      const me = await authApi.me();
      setUser(me);
      connectSocket();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
    const handleLogout = () => {
      setUser(null);
      disconnectSocket();
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [bootstrap]);

  const login = async (username: string, password: string) => {
    const { user: u, accessToken } = await authApi.login(username, password);
    setAccessToken(accessToken);
    setUser(u);
    connectSocket();
  };

  const logout = async () => {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
