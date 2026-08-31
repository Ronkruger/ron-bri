import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format, formatDistanceToNow, isSameDay, isToday, isYesterday } from "date-fns";
import { authApi, getSocket, messagesApi, resolveMediaUrl } from "@ronbri/api-client";
import type { Message, PublicAccount } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";
import { Icon, useUiTheme } from "../../components/ui";
import { mobileNotification } from "../../components/toast";

export default function ChatScreen() {
  const { user } = useAuth();
  const theme = useUiTheme(user?.role);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [peer, setPeer] = useState<PublicAccount | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const [typingActive, setTypingActive] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const data = await messagesApi.list(undefined, 50);
      setMessages(data.messages);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) { mobileNotification.fromError(error, "Messages could not be synchronized."); }
  }, []);

  useEffect(() => {
    authApi.accounts().then((accounts) => setPeer(accounts.find((account) => account.id !== user?.id) ?? null)).catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    void loadMessages();
    const socket = getSocket();
    const onActive = (state: string) => { if (state === "active") void loadMessages(); };
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    socket.on("connect", loadMessages);
    const appState = AppState.addEventListener("change", onActive);
    return () => { socket.off("connect", loadMessages); appState.remove(); show.remove(); hide.remove(); };
  }, [loadMessages]);

  useEffect(() => {
    const socket = getSocket();
    const onNew = ({ message }: { message: Message }) => {
      setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message]);
      if (message.senderId !== user?.id) socket.emit("message:read", { messageId: message.id });
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    };
    const onTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => { if (userId !== user?.id) setPeerTyping(isTyping); };
    const onRead = ({ messageId, readAt }: { messageId: string; readAt: string }) => setMessages((previous) => previous.map((item) => item.id === messageId ? { ...item, readAt } : item));
    const onPresence = ({ userId, online, lastSeenAt: seen }: { userId: string; online: boolean; lastSeenAt?: string | null }) => { if (userId === peer?.id) { setPeerOnline(online); if (seen !== undefined) setLastSeenAt(seen); } };
    const onSnapshot = ({ users }: { users: Array<{ userId: string; online: boolean; lastSeenAt?: string | null }> }) => { const current = users.find((person) => person.userId === peer?.id); if (current) { setPeerOnline(current.online); setLastSeenAt(current.lastSeenAt ?? null); } };
    socket.on("message:new", onNew); socket.on("message:typing", onTyping); socket.on("message:read", onRead); socket.on("presence:update", onPresence); socket.on("presence:snapshot", onSnapshot);
    return () => { socket.off("message:new", onNew); socket.off("message:typing", onTyping); socket.off("message:read", onRead); socket.off("presence:update", onPresence); socket.off("presence:snapshot", onSnapshot); };
  }, [peer?.id, user?.id]);

  const handleTyping = (value: string) => {
    setContent(value);
    const socket = getSocket();
    if (!typingActive) { setTypingActive(true); socket.emit("message:typing", { isTyping: true }); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { setTypingActive(false); socket.emit("message:typing", { isTyping: false }); }, 1500);
  };

  const sendMessage = async (body = content.trim()) => {
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await messagesApi.create({ content: body });
      setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message]);
      setContent(""); clearTimeout(typingTimer.current); getSocket().emit("message:typing", { isTyping: false }); setTypingActive(false);
    } catch (error) { mobileNotification.fromError(error, "Message not sent. Please try again."); }
    finally { setSending(false); }
  };

  const filteredMessages = search.trim() ? messages.filter((message) => message.content?.toLowerCase().includes(search.trim().toLowerCase())) : messages;
  const mediaMessages = messages.filter((message) => message.imageUrl || message.gifUrl);
  const activity = peerOnline ? "Active now" : lastSeenAt ? `Active ${formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}` : "Offline";
  const primaryColor = theme.accent.primary;

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const own = item.senderId === user?.id;
    const date = new Date(item.createdAt);
    const previous = index > 0 ? new Date(filteredMessages[index - 1].createdAt) : null;
    const mediaOnly = Boolean(!item.content && (item.imageUrl || item.gifUrl));
    return <React.Fragment key={item.id}>
      {(!previous || !isSameDay(date, previous)) && <View style={styles.dateSep}><View style={styles.dateLine} /><Text style={styles.dateLabel}>{isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d")}</Text><View style={styles.dateLine} /></View>}
      <View style={[styles.bubbleRow, own ? styles.ownRow : styles.theirRow]}>
        <View style={[styles.bubble, mediaOnly && styles.mediaBubble, own ? { ...styles.ownBubble, backgroundColor: mediaOnly ? "transparent" : primaryColor } : { ...styles.theirBubble, backgroundColor: mediaOnly ? "transparent" : theme.surfaceRaised, borderColor: mediaOnly ? "transparent" : theme.border }]}>
          {item.content ? <Text style={[styles.bubbleText, { color: own ? "#fff" : theme.text }]}>{item.content}</Text> : null}
          {item.imageUrl ? <Image source={{ uri: resolveMediaUrl(item.imageUrl) ?? undefined }} style={styles.bubbleImage} /> : null}
          {item.gifUrl ? <Image source={{ uri: resolveMediaUrl(item.gifUrl) ?? undefined }} style={styles.bubbleImage} /> : null}
        </View>
        <View style={[styles.meta, own ? styles.metaRight : styles.metaLeft]}><Text style={styles.metaTime}>{format(date, "h:mm a")}</Text>{own && <Text style={[styles.readTick, { color: item.readAt ? primaryColor : "#d1d5db" }]}>✓✓</Text>}</View>
      </View>
    </React.Fragment>;
  };

  return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
    <View style={[styles.header, { paddingTop: Math.max(10, insets.top) }]}>
      {peer?.avatar ? <Image source={{ uri: resolveMediaUrl(peer.avatar) ?? undefined }} style={styles.peerAvatar} /> : <View style={[styles.peerAvatar, { backgroundColor: theme.accent.soft }]}><Text style={{ color: theme.accent.primaryStrong, fontWeight: "900" }}>{peer?.displayName?.charAt(0) ?? "R"}</Text></View>}
      <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: theme.text }]}>{peer?.displayName ?? "Our Chat"}</Text><Text style={[styles.typingText, { color: peerTyping ? primaryColor : theme.textMuted }]}>{peerTyping ? "Typing…" : activity}</Text></View>
      <TouchableOpacity accessibilityLabel="Chat options" onPress={() => setMenuOpen(true)} style={styles.moreButton}><Icon name="dots-horizontal" size={23} color={theme.textMuted} /></TouchableOpacity>
    </View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top + 52}>
      <FlatList ref={flatRef} data={filteredMessages} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list} onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })} />
      <View style={[styles.inputBar, { paddingBottom: Math.max(10, insets.bottom) }]}>
        <TextInput value={content} onChangeText={handleTyping} placeholder="Write a message…" placeholderTextColor={theme.textMuted} style={[styles.input, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, color: theme.text }]} returnKeyType="send" onSubmitEditing={() => void sendMessage()} />
        {content.trim() || keyboardVisible ? <TouchableOpacity onPress={() => void sendMessage()} disabled={!content.trim() || sending} style={[styles.sendBtn, { backgroundColor: primaryColor }, (!content.trim() || sending) && styles.sendBtnDisabled]}><Icon name="send-outline" size={19} color="#fff" /></TouchableOpacity> : <TouchableOpacity accessibilityLabel="Send like" onPress={() => void sendMessage("❤️")} style={[styles.sendBtn, { backgroundColor: theme.accent.soft }]}><Icon name="heart" size={20} color={primaryColor} /></TouchableOpacity>}
      </View>
    </KeyboardAvoidingView>
    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}><TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)}><View style={[styles.menuCard, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.menuTitleRow}><Text style={[styles.menuTitle, { color: theme.text }]}>Chat details</Text><TouchableOpacity onPress={() => setMenuOpen(false)}><Icon name="close" size={21} color={theme.textMuted} /></TouchableOpacity></View><View style={[styles.searchBox, { borderColor: theme.border }]}><Icon name="magnify" size={19} color={theme.textMuted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search messages" placeholderTextColor={theme.textMuted} style={[styles.searchInput, { color: theme.text }]} /></View><Text style={[styles.mediaTitle, { color: theme.textMuted }]}>Shared media ({mediaMessages.length})</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>{mediaMessages.map((message) => <Image key={message.id} source={{ uri: resolveMediaUrl(message.imageUrl ?? message.gifUrl) ?? undefined }} style={styles.mediaThumb} />)}{mediaMessages.length === 0 && <Text style={{ color: theme.textMuted, fontWeight: "600" }}>No shared media yet.</Text>}</ScrollView><TouchableOpacity style={styles.likeOption} onPress={() => { setMenuOpen(false); void sendMessage("❤️"); }}><Icon name="heart-outline" size={20} color={primaryColor} /><Text style={[styles.likeOptionText, { color: theme.text }]}>Send a like</Text></TouchableOpacity></View></TouchableOpacity></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, container: { flex: 1 }, header: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: "rgba(255,253,249,.96)", borderBottomWidth: 1, borderBottomColor: "rgba(185,130,103,.18)", flexDirection: "row", alignItems: "center", gap: 10 }, peerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1 }, moreButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 17, fontWeight: "900" }, typingText: { fontSize: 12, fontWeight: "600", marginTop: 2 }, list: { padding: 16, paddingBottom: 8 }, dateSep: { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 8 }, dateLine: { flex: 1, height: 1, backgroundColor: "#f3f4f6" }, dateLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "600" }, bubbleRow: { marginBottom: 4 }, ownRow: { alignItems: "flex-end" }, theirRow: { alignItems: "flex-start" }, bubble: { maxWidth: "75%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 }, mediaBubble: { paddingHorizontal: 0, paddingVertical: 0 }, ownBubble: { borderBottomRightRadius: 4 }, theirBubble: { borderBottomLeftRadius: 4, shadowColor: "#9d654d", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1 }, bubbleText: { fontSize: 15, fontWeight: "500", lineHeight: 21 }, bubbleImage: { width: 220, height: 165, borderRadius: 16 }, meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, marginHorizontal: 4 }, metaRight: { justifyContent: "flex-end" }, metaLeft: { justifyContent: "flex-start" }, metaTime: { fontSize: 11, color: "#9ca3af" }, readTick: { fontSize: 11, fontWeight: "700" }, inputBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "rgba(255,253,249,.98)", borderTopWidth: 1, borderTopColor: "rgba(185,130,103,.18)" }, input: { flex: 1, borderRadius: 21, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontWeight: "500" }, sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, sendBtnDisabled: { opacity: 0.5 }, menuBackdrop: { flex: 1, backgroundColor: "rgba(48,34,31,.32)", justifyContent: "flex-start", paddingTop: 62, paddingHorizontal: 14 }, menuCard: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 14, elevation: 8 }, menuTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, menuTitle: { fontSize: 19, fontWeight: "900" }, searchBox: { minHeight: 48, borderWidth: 1.5, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }, searchInput: { flex: 1, fontSize: 14, fontWeight: "600" }, mediaTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 1 }, mediaRow: { gap: 8 }, mediaThumb: { width: 72, height: 72, borderRadius: 14 }, likeOption: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 }, likeOptionText: { fontSize: 15, fontWeight: "800" },
});
