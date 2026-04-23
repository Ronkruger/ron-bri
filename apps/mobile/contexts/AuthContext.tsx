import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import type { User } from "@ronbri/types";
import { authApi, setAccessToken, connectSocket, disconnectSocket, apiClient } from "@ronbri/api-client";

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
      // On mobile we store the refresh token in SecureStore since httpOnly cookies
      // don't work with React Native out of the box.
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await apiClient.post<{ accessToken: string }>(
        "/auth/refresh",
        {},
        { headers: { "x-refresh-token": refreshToken } }
      );
      setAccessToken(data.accessToken);
      const me = await authApi.me();
      setUser(me);
      connectSocket();
    } catch {
      setUser(null);
      await SecureStore.deleteItemAsync("refreshToken");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (username: string, password: string) => {
    const { user: u, accessToken } = await authApi.login(username, password);
    setAccessToken(accessToken);
    // Store refresh token from cookie — mobile needs a custom header approach
    // Server will also send it in body for mobile clients
    setUser(u);
    connectSocket();
  };

  const logout = async () => {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync("refreshToken");
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
