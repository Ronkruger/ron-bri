import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import type { User } from "@ronbri/types";
import { authApi, setAccessToken, connectSocket, disconnectSocket, apiClient, notificationsApi } from "@ronbri/api-client";
import { getExpoPushToken } from "../components/notifications";
import { Platform } from "react-native";

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

      const { data } = await apiClient.post<{ accessToken: string; refreshToken?: string }>(
        "/auth/refresh",
        {},
        { headers: { "x-refresh-token": refreshToken } }
      );
      if (data.refreshToken) {
        await SecureStore.setItemAsync("refreshToken", data.refreshToken);
      }
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

  useEffect(() => {
    if (!user || (Platform.OS !== "android" && Platform.OS !== "ios")) return;
    const platform: "android" | "ios" = Platform.OS;

    let active = true;
    void getExpoPushToken().then(async (token) => {
      if (!active || !token) return;
      await notificationsApi.register(token, platform);
      await SecureStore.setItemAsync("expoPushToken", token);
    }).catch(() => {
      // Messaging remains usable when notification permission or FCM is absent.
    });

    return () => { active = false; };
  }, [user?.id]);

  const login = async (username: string, password: string) => {
    const { user: u, accessToken, refreshToken } = await authApi.loginMobile(username, password);
    if (!refreshToken) {
      throw new Error("The server did not return a mobile refresh token.");
    }
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    setAccessToken(accessToken);
    setUser(u);
    connectSocket();
  };

  const logout = async () => {
    const pushToken = await SecureStore.getItemAsync("expoPushToken");
    if (pushToken) {
      await notificationsApi.unregister(pushToken).catch(() => undefined);
    }
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("expoPushToken");
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
