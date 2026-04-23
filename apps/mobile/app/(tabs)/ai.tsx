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
import { getAccessToken } from "@ronbri/api-client";
import type { AIChatMessage } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";

export default function AIScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isGirl = user?.role === "GIRL";
  const primaryColor = isGirl ? "#EAB308" : "#3B82F6";

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
      const token = getAccessToken();
      const response = await fetch(
        (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001") + "/api/ai/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ messages: nextMessages }),
        }
      );

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
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "Sorry, something went wrong 😔" };
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 AI Companion</Text>
        <Text style={styles.subtitle}>Ask me anything about your relationship 💕</Text>
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
              <Text style={styles.emptyEmoji}>🤖</Text>
              <Text style={styles.emptyTitle}>Hi {user?.displayName}!</Text>
              <Text style={styles.emptyText}>
                Ask me anything — date ideas, couple games, love advice, or just chat! 💕
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
            <View style={styles.aiBubble}>
              <ActivityIndicator size="small" color="#9ca3af" />
            </View>
          )}
        </ScrollView>
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask the AI something... 🤖"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            editable={!streaming}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || streaming}
            style={[styles.sendBtn, { backgroundColor: primaryColor }, (!input.trim() || streaming) && styles.sendBtnDisabled]}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "900", color: "#1f2937" },
  subtitle: { fontSize: 13, color: "#9ca3af", fontWeight: "600", marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 8 },
  emptyState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 22, fontWeight: "900", color: "#1f2937", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#9ca3af", fontWeight: "600", textAlign: "center", lineHeight: 21 },
  bubble: { marginBottom: 8, maxWidth: "80%", borderRadius: 20, padding: 12 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: "flex-start", backgroundColor: "#fff", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 15, color: "#1f2937", lineHeight: 22 },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  input: { flex: 1, borderRadius: 20, borderWidth: 1.5, borderColor: "#e5e7eb", paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontWeight: "500", backgroundColor: "#fafafa" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "900" },
});
