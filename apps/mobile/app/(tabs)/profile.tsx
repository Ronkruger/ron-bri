import React from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { Icon, InitialAvatar, styles as sharedStyles, useUiTheme } from "../../components/ui";
import { mobileNotification } from "../../components/toast";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const theme = useUiTheme(user?.role);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      mobileNotification.fromError(error, "Could not log out. Please try again.");
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, sharedStyles.shadow, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <InitialAvatar name={user.displayName} color={theme.accent.primaryStrong} size={86} />
          )}
          <Text style={[styles.eyebrow, { color: theme.accent.primaryStrong }]}>PROFILE</Text>
          <Text style={[styles.name, { color: theme.text }]}>{user.displayName}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Your identity inside RonBri.</Text>

          <View style={[styles.details, { borderTopColor: theme.border }]}>
            <Detail label="Username" value={user.username} color={theme.text} muted={theme.textMuted} />
            <Detail label="Role" value={user.role === "BOY" ? "Ron Ron" : "BriBri"} color={theme.text} muted={theme.textMuted} />
            <Detail label="Theme" value={user.theme} color={theme.text} muted={theme.textMuted} />
            <Detail label="Joined" value={format(new Date(user.createdAt), "MMMM d, yyyy")} color={theme.text} muted={theme.textMuted} />
          </View>

          <TouchableOpacity style={[styles.logout, { borderColor: theme.accent.border }]} onPress={handleLogout}>
            <Icon name="logout" size={20} color={theme.accent.primaryStrong} />
            <Text style={[styles.logoutText, { color: theme.accent.primaryStrong }]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
  return (
    <View style={styles.detail}>
      <Text style={[styles.label, { color: muted }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  card: { alignItems: "center", borderRadius: 24, borderWidth: 1, padding: 24 },
  avatar: { width: 86, height: 86, borderRadius: 28 },
  eyebrow: { marginTop: 18, fontSize: 11, letterSpacing: 2, fontWeight: "900" },
  name: { marginTop: 8, fontSize: 29, fontWeight: "900" },
  subtitle: { marginTop: 5, fontSize: 14, fontWeight: "600" },
  details: { width: "100%", marginTop: 24, paddingTop: 20, borderTopWidth: 1, gap: 18 },
  detail: { gap: 4 },
  label: { fontSize: 10, letterSpacing: 1.4, fontWeight: "900" },
  value: { fontSize: 15, fontWeight: "800" },
  logout: { width: "100%", minHeight: 50, marginTop: 26, borderWidth: 1.5, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  logoutText: { fontSize: 15, fontWeight: "900" },
});
