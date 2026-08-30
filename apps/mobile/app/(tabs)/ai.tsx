import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { aiApi } from "@ronbri/api-client";
import type { AIChatMessage } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";
import { Icon, useUiTheme } from "../../components/ui";
import { mobileNotification } from "../../components/toast";

export default function AIScreen() {
  const { user } = useAuth();
  const theme = useUiTheme(user?.role);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const primaryColor = theme.accent.primary;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const userMsg: AIChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setStreaming(true);

    const assistantMsg: AIChatMessage = { role: "assistant", content: "" };
    setMessages([...nextMessages, assistantMsg]);

    try {
      const response = await aiApi.chat({ messages: nextMessages });

      if (!response.body) throw new Error("No body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            full += delta;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: "assistant", content: full };
              return copy;
            });
          } catch {}
        }
      }
    } catch (e: any) {
      mobileNotification.fromError(e, "The AI companion could not respond. Try again.");
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
        return copy;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}><Icon name="auto-fix" size={20} color={primaryColor} /> AI Companion</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Ask me anything about your relationship</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.accent.soft }]}><Icon name="auto-fix" size={32} color={primaryColor} /></View>
              <Text style={styles.emptyTitle}>Hi {user?.displayName}!</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Ask me anything — date ideas, couple games, love advice, or just chat.
              </Text>
            </View>
          )}
          {messages.map((msg, i) => (
            <View key={i} style={[styles.bubble, msg.role === "user" ? { ...styles.userBubble, backgroundColor: primaryColor } : styles.aiBubble]}>
              <Text style={[styles.bubbleText, msg.role === "user" && { color: "#fff" }]}>
                {msg.content}
                {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                  <Text style={{ color: "#9ca3af" }}> ▌</Text>
                )}
              </Text>
            </View>
          ))}
          {streaming && messages[messages.length - 1]?.content === "" && (
            <View style={[styles.aiBubble, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color="#9ca3af" />
            </View>
          )}
        </ScrollView>
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask the AI something…"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, color: theme.text }]}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            editable={!streaming}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || streaming}
            style={[styles.sendBtn, { backgroundColor: primaryColor }, (!input.trim() || streaming) && styles.sendBtnDisabled]}
          >
            <Icon name="send-outline" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "rgba(255,253,249,.86)", borderBottomWidth: 1, borderBottomColor: "rgba(185,130,103,.18)" },
  title: { fontSize: 20, fontWeight: "900" },
  subtitle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 8 },
  emptyState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 22, fontWeight: "900", marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 21 },
  bubble: { marginBottom: 8, maxWidth: "80%", borderRadius: 20, padding: 12 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, shadowColor: "#9d654d", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "rgba(255,253,249,.94)", borderTopWidth: 1, borderTopColor: "rgba(185,130,103,.18)" },
  input: { flex: 1, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontWeight: "500" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "900" },
});
