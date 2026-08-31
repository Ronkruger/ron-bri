import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import type { Message } from "@ronbri/types";
import { getSocket } from "@ronbri/api-client";
import { useAuth } from "../contexts/AuthContext";
import { Icon, useUiTheme } from "./ui";

export function ChatHead() {
  const { user } = useAuth();
  const theme = useUiTheme(user?.role);
  const pathname = usePathname();
  const router = useRouter();
  const [latest, setLatest] = React.useState<Message | null>(null);

  React.useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onMessage = ({ message }: { message: Message }) => {
      if (message.senderId !== user.id) setLatest(message);
    };
    socket.on("message:new", onMessage);
    return () => { socket.off("message:new", onMessage); };
  }, [user?.id]);

  React.useEffect(() => {
    if (pathname.includes("chat")) setLatest(null);
  }, [pathname]);

  if (!user || !latest || pathname.includes("chat")) return null;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open message from ${latest.sender.displayName}`}
      activeOpacity={0.9}
      style={[styles.container, { backgroundColor: theme.surfaceRaised, borderColor: theme.accent.border }]}
      onPress={() => {
        setLatest(null);
        router.push("/(tabs)/chat");
      }}
    >
      {latest.sender.avatar ? (
        <Image source={{ uri: latest.sender.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.fallback, { backgroundColor: theme.accent.soft }]}>
          <Text style={[styles.initial, { color: theme.accent.primaryStrong }]}>{latest.sender.displayName.charAt(0)}</Text>
        </View>
      )}
      <View style={[styles.badge, { backgroundColor: theme.accent.primary }]}>
        <Icon name="message-outline" size={12} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 14,
    top: 82,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    padding: 3,
    zIndex: 100,
    elevation: 12,
    shadowColor: "#3b2723",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  fallback: { alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 21, fontWeight: "900" },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
