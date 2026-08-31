import React from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import Toast from "react-native-toast-message";
import { toastConfig } from "../components/toast";
import { configureBaseUrl } from "@ronbri/api-client";
import { AppSyncBridge } from "../components/AppSyncBridge";
import { NotificationBridge } from "../components/NotificationBridge";
import { ChatHead } from "../components/ChatHead";

configureBaseUrl(process.env.EXPO_PUBLIC_API_URL);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppSyncBridge />
            <NotificationBridge />
            <Stack screenOptions={{ headerShown: false }} />
            <ChatHead />
            <Toast config={toastConfig} />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
