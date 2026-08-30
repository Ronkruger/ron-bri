import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme, StyleSheet, Text, View } from "react-native";
import { getUiTheme } from "@ronbri/ui-tokens";
import type { RoleTheme, ThemeMode } from "@ronbri/ui-tokens";

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export function Icon({ name, size = 20, color = "#8f7771" }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function useUiTheme(role?: string) {
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";
  const roleTheme: RoleTheme = role === "GIRL" ? "girl" : "boy";
  return getUiTheme(mode, roleTheme);
}

export function InitialAvatar({ name, color, size = 42 }: { name?: string | null; color: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: color + "22" }]}>
      <Text style={{ color, fontSize: size * 0.36, fontWeight: "800" }}>{name?.charAt(0) ?? "R"}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(185, 130, 103, .22)" },
  shadow: { shadowColor: "#9d654d", shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  surface: { borderWidth: 1, borderColor: "rgba(185, 130, 103, .22)", borderRadius: 18 },
});
