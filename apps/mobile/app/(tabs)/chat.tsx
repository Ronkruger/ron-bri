import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { messagesApi } from "@ronbri/api-client";
import { getSocket } from "@ronbri/api-client";
import type { Message } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const [typingActive, setTypingActive] = useState(false);

  useEffect(() => {
    messagesApi.list(undefined, 50).then((data) => {
      setMessages(data.messages);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onNew = ({ message }: { message: Message }) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.senderId !== user?.id) {
        socket.emit("message:read", { messageId: message.id });
      }
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    };
    const onTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId !== user?.id) setPeerTyping(isTyping);
    };
    const onRead = ({ messageId, readAt }: { messageId: string; readAt: string }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, readAt } : m));
    };
    socket.on("message:new", onNew);
    socket.on("message:typing", onTyping);
    socket.on("message:read", onRead);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:typing", onTyping);
      socket.off("message:read", onRead);
    };
  }, [user]);

  const handleTyping = (val: string) => {
    setContent(val);
    const socket = getSocket();
    if (!typingActive) {
      setTypingActive(true);
      socket.emit("message:typing", { isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTypingActive(false);
      socket.emit("message:typing", { isTyping: false });
    }, 1500);
  };

  const sendMessage = () => {
    if (!content.trim()) return;
    const socket = getSocket();
    socket.emit("message:send", { content: content.trim() });
    setContent("");
    clearTimeout(typingTimer.current);
    socket.emit("message:typing", { isTyping: false });
    setTypingActive(false);
  };

  const isGirl = user?.role === "GIRL";
  const primaryColor = isGirl ? "#EAB308" : "#3B82F6";

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === user?.id;
    const d = new Date(item.createdAt);
    const prev = index > 0 ? new Date(messages[index - 1].createdAt) : null;
    const showDateSep = !prev || !isSameDay(d, prev);
    const dateLabel = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMMM d");

    return (
      <>
        {showDateSep && (
          <View style={styles.dateSep}>
            <View style={styles.dateLine} />
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.bubbleRow, isOwn ? styles.ownRow : styles.theirRow]}>
          <View style={[styles.bubble, isOwn ? { ...styles.ownBubble, backgroundColor: primaryColor } : styles.theirBubble]}>
            {item.content ? <Text style={[styles.bubbleText, isOwn && { color: "#fff" }]}>{item.content}</Text> : null}
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.bubbleImage} /> : null}
            {item.gifUrl ? <Image source={{ uri: item.gifUrl }} style={styles.bubbleImage} /> : null}
          </View>
          <View style={[styles.meta, isOwn ? styles.metaRight : styles.metaLeft]}>
            <Text style={styles.metaTime}>{format(d, "h:mm a")}</Text>
            {isOwn && (
              <Text style={[styles.readTick, { color: item.readAt ? primaryColor : "#d1d5db" }]}>✓✓</Text>
            )}
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Our Chat</Text>
        {peerTyping && (
          <Text style={[styles.typingText, { color: primaryColor }]}>
            {user?.role === "BOY" ? "BriBri" : "Ron Ron"} is typing... {user?.role === "BOY" ? "💛" : "💙"}
          </Text>
        )}
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        />
        <View style={styles.inputBar}>
          <TextInput
            value={content}
            onChangeText={handleTyping}
            placeholder="Type something cute... 💕"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!content.trim()}
            style={[styles.sendBtn, { backgroundColor: primaryColor }, !content.trim() && styles.sendBtnDisabled]}
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
  header: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1f2937" },
  typingText: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  list: { padding: 16, paddingBottom: 8 },
  dateSep: { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: "#f3f4f6" },
  dateLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  bubbleRow: { marginBottom: 4 },
  ownRow: { alignItems: "flex-end" },
  theirRow: { alignItems: "flex-start" },
  bubble: { maxWidth: "75%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  ownBubble: { borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 15, fontWeight: "500", color: "#1f2937", lineHeight: 21 },
  bubbleImage: { width: 200, height: 150, borderRadius: 12, marginTop: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, marginHorizontal: 4 },
  metaRight: { justifyContent: "flex-end" },
  metaLeft: { justifyContent: "flex-start" },
  metaTime: { fontSize: 11, color: "#9ca3af" },
  readTick: { fontSize: 11, fontWeight: "700" },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  input: { flex: 1, borderRadius: 20, borderWidth: 1.5, borderColor: "#e5e7eb", paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontWeight: "500", backgroundColor: "#fafafa" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "900" },
});
