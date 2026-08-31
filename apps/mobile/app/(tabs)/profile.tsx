import React, { useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { authApi, resolveMediaUrl, uploadApi } from "@ronbri/api-client";
import { Icon, InitialAvatar, styles as sharedStyles, useUiTheme } from "../../components/ui";
import { mobileNotification } from "../../components/toast";

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const theme = useUiTheme(user?.role);
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      mobileNotification.info("Allow photo access to change your profile image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    setUploading(true);
    mobileNotification.info("Uploading profile photo…");
    try {
      const asset = result.assets[0];
      const uploaded = await uploadApi.imageNative(asset.uri, asset.fileName ?? "profile.jpg", asset.mimeType ?? "image/jpeg");
      await authApi.updateAvatar(uploaded.url);
      await refreshUser();
      mobileNotification.success("Profile photo updated.");
    } catch (error) {
      mobileNotification.fromError(error, "Could not update your profile photo.");
    } finally {
      setUploading(false);
    }
  };

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
            <Image source={{ uri: resolveMediaUrl(user.avatar) ?? undefined }} style={styles.avatar} />
          ) : (
            <InitialAvatar name={user.displayName} color={theme.accent.primaryStrong} size={86} />
          )}
          <TouchableOpacity disabled={uploading} onPress={uploadAvatar} style={[styles.uploadButton, { backgroundColor: theme.accent.primaryStrong }, uploading && { opacity: .55 }]}>
            <Icon name="camera-outline" size={18} color="#fff" />
            <Text style={styles.uploadText}>{uploading ? "Uploading…" : "Change profile photo"}</Text>
          </TouchableOpacity>
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
  uploadButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  uploadText: { color: "#fff", fontSize: 13, fontWeight: "900" },
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
