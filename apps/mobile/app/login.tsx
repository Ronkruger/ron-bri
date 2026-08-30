import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "@ronbri/api-client";
import type { PublicAccount } from "@ronbri/types";
import { useAuth } from "../contexts/AuthContext";
import { Icon, InitialAvatar, styles as sharedStyles, useUiTheme } from "../components/ui";
import { getUiTheme } from "@ronbri/ui-tokens";
import { mobileNotification } from "../components/toast";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState(false);
  const [selected, setSelected] = useState<PublicAccount | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useUiTheme(selected?.role);

  const loadAccounts = useCallback(() => {
    let active = true;
    setAccountsLoading(true);
    setAccountsError(false);
    authApi.accounts()
      .then((data) => {
        if (active) setAccounts(data);
      })
      .catch((caughtError) => {
        if (active) setAccountsError(true);
        mobileNotification.fromError(caughtError, "Unable to load accounts. Please try again.");
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => loadAccounts(), [loadAccounts]);

  const handleLogin = async () => {
    if (!selected || !password) return;
    setLoading(true);
    try {
      await login(selected.username, password);
      mobileNotification.success(`Welcome back, ${selected.displayName}.`);
      router.replace("/(tabs)");
    } catch (caughtError) {
      mobileNotification.fromError(caughtError, "That password was not accepted. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={require("../assets/login-background.jpg")} style={page.background} resizeMode="cover">
      <View style={page.overlay} />
      <SafeAreaView style={[page.container, { backgroundColor: "transparent" }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={page.content} keyboardShouldPersistTaps="handled">
          <View style={[page.brand, { backgroundColor: theme.accent.soft }]}>
            <Icon name="heart-outline" size={24} color={theme.accent.primaryStrong} />
          </View>
          <Text style={[page.title, { color: theme.text }]}>Welcome back</Text>
          <Text style={[page.subtitle, { color: theme.textMuted }]}>Choose your account to enter RonBri.</Text>

          {accountsLoading ? (
            <ActivityIndicator size="large" color={theme.accent.primaryStrong} />
          ) : accountsError ? (
            <View style={[sharedStyles.surface, page.errorCard, { backgroundColor: theme.surfaceRaised }]}>
              <Text style={[page.errorTitle, { color: theme.text }]}>Connection unavailable</Text>
              <Text style={[page.errorText, { color: theme.textMuted }]}>The shared space could not load the accounts.</Text>
              <TouchableOpacity onPress={loadAccounts} style={[page.retryButton, { backgroundColor: theme.accent.primaryStrong }]}>
                <Text style={page.loginText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : !selected ? (
            <View style={page.cards}>
              {accounts.map((account) => {
                const accountTheme = getUiTheme(theme.mode, account.role === "GIRL" ? "girl" : "boy");
                return (
                  <TouchableOpacity
                    key={account.id}
                    style={[sharedStyles.surface, sharedStyles.shadow, page.accountCard, { backgroundColor: accountTheme.surfaceRaised, borderColor: accountTheme.accent.border }]}
                    onPress={() => { setSelected(account); setPassword(""); }}
                    activeOpacity={0.84}
                  >
                    <InitialAvatar name={account.displayName} color={accountTheme.accent.primaryStrong} size={50} />
                    <View style={page.accountCopy}>
                      <Text style={[page.accountName, { color: accountTheme.text }]}>{account.displayName}</Text>
                      <Text style={[page.accountSub, { color: accountTheme.textMuted }]}>{account.username}</Text>
                    </View>
                    <Icon name="chevron-right" size={21} color={accountTheme.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[sharedStyles.surface, page.passwordCard, { backgroundColor: theme.surfaceRaised }] }>
              <View style={page.selectedRow}>
                <InitialAvatar name={selected.displayName} color={theme.accent.primaryStrong} size={48} />
                <View>
                  <Text style={[page.accountName, { color: theme.text }]}>{selected.displayName}</Text>
                  <Text style={[page.accountSub, { color: theme.textMuted }]}>{selected.username}</Text>
                </View>
              </View>
              <View style={page.inputWrap}>
                <Icon name="lock-outline" size={19} color={theme.textMuted} />
                <TextInput
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textMuted}
                  style={[page.input, { color: theme.text }]}
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
              </View>
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading || !password}
                style={[page.loginButton, { backgroundColor: theme.accent.primaryStrong }, (!password || loading) && page.disabled]}
              >
                <Text style={page.loginText}>{loading ? "Signing in…" : "Sign in"}</Text>
                <Icon name="login" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelected(null)} style={page.backButton}>
                <Icon name="arrow-left" size={17} color={theme.textMuted} />
                <Text style={[page.backText, { color: theme.textMuted }]}>Choose another account</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const page = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255, 249, 243, .64)" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 22 },
  brand: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  title: { fontSize: 32, fontWeight: "900", letterSpacing: -0.6, marginBottom: 5 },
  subtitle: { fontSize: 15, fontWeight: "600", marginBottom: 28, textAlign: "center" },
  cards: { width: "100%", gap: 12 },
  accountCard: { width: "100%", flexDirection: "row", alignItems: "center", padding: 14 },
  accountCopy: { flex: 1, marginLeft: 12 },
  accountName: { fontSize: 17, fontWeight: "800" },
  accountSub: { fontSize: 12, fontWeight: "600", marginTop: 3 },
  passwordCard: { width: "100%", padding: 17, gap: 14 },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  inputWrap: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(185, 130, 103, .22)", borderRadius: 14 },
  input: { flex: 1, fontSize: 16, fontWeight: "600" },
  loginButton: { minHeight: 52, borderRadius: 14, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center" },
  loginText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  errorCard: { width: "100%", padding: 18, alignItems: "center", gap: 10 },
  errorTitle: { fontSize: 17, fontWeight: "800" },
  errorText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  retryButton: { minHeight: 46, minWidth: 130, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  backButton: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 5 },
  backText: { fontSize: 13, fontWeight: "700" },
});
