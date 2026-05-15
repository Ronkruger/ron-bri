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
  Modal,
  Animated,
  Pressable,
  Dimensions,
  GestureResponderEvent,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { messagesApi } from "@ronbri/api-client";
import { getSocket } from "@ronbri/api-client";
import type { Message, MessageReaction } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";

const SCREEN_H = Dimensions.get("window").height;
const DEFAULT_REACTIONS = ["❤️", "😆", "😮", "😢", "😡"];
const REACTIONS_STORAGE_KEY = "ronbri_custom_reactions";

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const [typingActive, setTypingActive] = useState(false);

  // Reaction state
  const [reactionSet, setReactionSet] = useState<string[]>(DEFAULT_REACTIONS);
  const [pickerMsg, setPickerMsg] = useState<Message | null>(null);
  const [pickerY, setPickerY] = useState(300);
  const [customizingIdx, setCustomizingIdx] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState("");
  const pickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SecureStore.getItemAsync(REACTIONS_STORAGE_KEY).then((v) => {
      if (v) setReactionSet(JSON.parse(v));
    });
  }, []);

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
    const onReactions = ({ messageId, reactions }: { messageId: string; reactions: MessageReaction[] }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };
    socket.on("message:new", onNew);
    socket.on("message:typing", onTyping);
    socket.on("message:read", onRead);
    socket.on("message:reactions", onReactions);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:typing", onTyping);
      socket.off("message:read", onRead);
      socket.off("message:reactions", onReactions);
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

  const openPicker = (msg: Message, e: GestureResponderEvent) => {
    setPickerMsg(msg);
    setPickerY(e.nativeEvent.pageY);
    setCustomizingIdx(null);
    setCustomInput("");
    pickerAnim.setValue(0);
    Animated.spring(pickerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 250,
      friction: 18,
    }).start();
  };

  const closePicker = () => {
    Animated.timing(pickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setPickerMsg(null);
      setCustomizingIdx(null);
    });
  };

  const handleReact = (emoji: string, messageId?: string) => {
    const id = messageId ?? pickerMsg?.id;
    if (!id) return;
    const socket = getSocket();
    socket.emit("message:react", { messageId: id, emoji });
    if (!messageId) closePicker(); // only close if from picker, not from pill tap
  };

  const handleCustomizeSlot = (idx: number) => {
    setCustomizingIdx(idx);
    setCustomInput("");
  };

  const commitCustomize = async () => {
    if (customizingIdx === null || !customInput.trim()) {
      setCustomizingIdx(null);
      return;
    }
    const newEmoji = [...customInput.trim()][0] ?? customInput.trim();
    const updated = [...reactionSet];
    updated[customizingIdx] = newEmoji;
    setReactionSet(updated);
    await SecureStore.setItemAsync(REACTIONS_STORAGE_KEY, JSON.stringify(updated));
    setCustomizingIdx(null);
    setCustomInput("");
  };

  const isGirl = user?.role === "GIRL";
  const primaryColor = isGirl ? "#EAB308" : "#3B82F6";

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === user?.id;
    const d = new Date(item.createdAt);
    const prev = index > 0 ? new Date(messages[index - 1].createdAt) : null;
    const showDateSep = !prev || !isSameDay(d, prev);
    const dateLabel = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMMM d");
    const groupedReactions = groupReactions(item.reactions ?? []);

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
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={(e) => openPicker(item, e)}
            delayLongPress={350}
          >
            <View style={[styles.bubble, isOwn ? { ...styles.ownBubble, backgroundColor: primaryColor } : styles.theirBubble]}>
              {item.content ? <Text style={[styles.bubbleText, isOwn && { color: "#fff" }]}>{item.content}</Text> : null}
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.bubbleImage} /> : null}
              {item.gifUrl ? <Image source={{ uri: item.gifUrl }} style={styles.bubbleImage} /> : null}
            </View>
            {groupedReactions.length > 0 && (
              <View style={[styles.reactionRow, isOwn ? styles.reactionRowRight : styles.reactionRowLeft]}>
                {groupedReactions.map(({ emoji, count, users }) => {
                  const isMine = users.includes(user?.id ?? "");
                  return (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleReact(emoji, item.id)}
                      style={[styles.reactionPill, isMine && { borderColor: primaryColor, borderWidth: 1.5 }]}
                    >
                      <Text style={styles.reactionPillEmoji}>{emoji}</Text>
                      {count > 1 && <Text style={styles.reactionPillCount}>{count}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </TouchableOpacity>
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

  // Picker position: show above press in bottom half, below in top half
  const pickerTop = pickerY > SCREEN_H / 2 ? pickerY - 90 : pickerY + 24;
  const clampedPickerTop = Math.max(60, Math.min(pickerTop, SCREEN_H - 130));

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

      {/* ── Reaction Picker Modal ─────────────────────────────────────────── */}
      <Modal visible={!!pickerMsg} transparent animationType="none" onRequestClose={closePicker}>
        <Pressable style={styles.pickerOverlay} onPress={closePicker}>
          <Animated.View
            style={[
              styles.pickerContainer,
              { top: clampedPickerTop },
              {
                opacity: pickerAnim,
                transform: [
                  { scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                ],
              },
            ]}
          >
            {customizingIdx !== null ? (
              <View style={styles.customizeBox}>
                <Text style={styles.customizeLabel}>Replace "{reactionSet[customizingIdx]}"</Text>
                <TextInput
                  autoFocus
                  value={customInput}
                  onChangeText={setCustomInput}
                  placeholder="Paste or type an emoji"
                  style={styles.customizeInput}
                  maxLength={4}
                />
                <View style={styles.customizeBtns}>
                  <TouchableOpacity onPress={() => setCustomizingIdx(null)} style={styles.customizeCancelBtn}>
                    <Text style={styles.customizeCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={commitCustomize} style={[styles.customizeSaveBtn, { backgroundColor: primaryColor }]}>
                    <Text style={styles.customizeSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.pickerRow}>
                {reactionSet.map((emoji, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.emojiBtn}
                    onPress={() => handleReact(emoji)}
                    onLongPress={() => handleCustomizeSlot(idx)}
                    delayLongPress={600}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.moreBtn}
                  onPress={() => handleCustomizeSlot(reactionSet.length - 1)}
                >
                  <Text style={styles.moreBtnText}>＋</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </Pressable>
      </Modal>
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
  bubble: { maxWidth: "75%", flexShrink: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
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

  // Reaction pills on bubbles
  reactionRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  reactionRowRight: { justifyContent: "flex-end" },
  reactionRowLeft: { justifyContent: "flex-start" },
  reactionPill: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: "transparent" },
  reactionPillEmoji: { fontSize: 14 },
  reactionPillCount: { fontSize: 11, fontWeight: "700", color: "#6b7280" },

  // Reaction picker overlay
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  pickerContainer: { position: "absolute", alignSelf: "center", backgroundColor: "#fff", borderRadius: 32, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, elevation: 12, paddingVertical: 8, paddingHorizontal: 6 },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  emojiBtn: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 26 },
  emojiText: { fontSize: 28 },
  moreBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#f3f4f6", marginLeft: 2 },
  moreBtnText: { fontSize: 20, color: "#6b7280", fontWeight: "700" },

  // Customize slot modal
  customizeBox: { padding: 8, gap: 10, minWidth: 220 },
  customizeLabel: { fontSize: 13, fontWeight: "700", color: "#374151", textAlign: "center" },
  customizeInput: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 22, textAlign: "center", backgroundColor: "#fafafa" },
  customizeBtns: { flexDirection: "row", gap: 8 },
  customizeCancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  customizeCancelText: { fontSize: 14, fontWeight: "700", color: "#6b7280" },
  customizeSaveBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  customizeSaveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

function groupReactions(reactions: MessageReaction[]) {
  const map = new Map<string, { count: number; users: string[] }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(r.userId);
    } else {
      map.set(r.emoji, { count: 1, users: [r.userId] });
    }
  }
  return Array.from(map.entries()).map(([emoji, { count, users }]) => ({ emoji, count, users }));
}

