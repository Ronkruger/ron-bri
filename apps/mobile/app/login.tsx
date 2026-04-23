import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<"boy" | "girl" | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!selected || !password) return;
    setLoading(true);
    try {
      const username = selected === "boy" ? "ronron" : "bribri";
      await login(username, password);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Wrong password 💔", "Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>RonBri 💙💛</Text>
        <Text style={styles.subtitle}>Who are you?</Text>

        <View style={styles.cards}>
          <TouchableOpacity
            style={[styles.card, styles.boyCard, selected === "boy" && styles.boyCardSelected]}
            onPress={() => { setSelected("boy"); setPassword(""); }}
            activeOpacity={0.85}
          >
            <Text style={styles.cardEmoji}>💙</Text>
            <Text style={[styles.cardName, { color: "#1D4ED8" }]}>Ron Ron</Text>
            <Text style={styles.cardSub}>That's my babe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.girlCard, selected === "girl" && styles.girlCardSelected]}
            onPress={() => { setSelected("girl"); setPassword(""); }}
            activeOpacity={0.85}
          >
            <Text style={styles.cardEmoji}>💛</Text>
            <Text style={[styles.cardName, { color: "#A16207" }]}>BriBri</Text>
            <Text style={styles.cardSub}>That's my girl</Text>
          </TouchableOpacity>
        </View>

        {selected && (
          <View style={styles.passwordSection}>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder={`Password, ${selected === "boy" ? "Ron Ron" : "BriBri"} 🔒`}
              style={[
                styles.passwordInput,
                selected === "boy" ? styles.passwordBoy : styles.passwordGirl,
              ]}
              autoFocus
            />
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading || !password}
              style={[
                styles.loginBtn,
                selected === "boy" ? styles.loginBtnBoy : styles.loginBtnGirl,
                (!password || loading) && styles.loginBtnDisabled,
              ]}
            >
              <Text style={styles.loginBtnText}>
                {loading ? "Logging in..." : "Let me in 🏠"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 36, fontWeight: "900", color: "#1f2937", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#9ca3af", fontWeight: "600", marginBottom: 32 },
  cards: { flexDirection: "row", gap: 16, width: "100%", marginBottom: 32 },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 3,
    borderColor: "transparent",
  },
  boyCard: {},
  boyCardSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  girlCard: {},
  girlCardSelected: { borderColor: "#EAB308", backgroundColor: "#FEFCE8" },
  cardEmoji: { fontSize: 48, marginBottom: 8 },
  cardName: { fontSize: 20, fontWeight: "900" },
  cardSub: { fontSize: 12, color: "#9ca3af", marginTop: 4, fontWeight: "600" },
  passwordSection: { width: "100%", gap: 12 },
  passwordInput: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "#fff",
  },
  passwordBoy: { borderColor: "#93C5FD" },
  passwordGirl: { borderColor: "#FDE047" },
  loginBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  loginBtnBoy: { backgroundColor: "#3B82F6" },
  loginBtnGirl: { backgroundColor: "#EAB308" },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: "#fff", fontSize: 18, fontWeight: "900" },
});
