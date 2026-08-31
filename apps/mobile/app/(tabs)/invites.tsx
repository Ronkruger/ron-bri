import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { invitesApi } from "@ronbri/api-client";
import type { DateInvite } from "@ronbri/types";
import { InviteStatus, InviteType } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";
import { Icon, useUiTheme } from "../../components/ui";
import { mobileNotification } from "../../components/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUS_COLORS: Record<InviteStatus, { bg: string; text: string }> = {
  [InviteStatus.PENDING]: { bg: "#FEF9C3", text: "#A16207" },
  [InviteStatus.ACCEPTED]: { bg: "#DCFCE7", text: "#166534" },
  [InviteStatus.DECLINED]: { bg: "#FEE2E2", text: "#DC2626" },
  [InviteStatus.RESCHEDULED]: { bg: "#F3E8FF", text: "#7C3AED" },
};

const INVITE_EMOJIS: Record<string, string> = {
  OUTSIDE: "🌿",
  FOOD: "🍜",
  BONDING: "🎮",
  CUSTOM: "✦",
};

export default function InvitesScreen() {
  const { user } = useAuth();
  const theme = useUiTheme(user?.role);
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [composerOpen, setComposerOpen] = useState(false);
  const [inviteType, setInviteType] = useState<InviteType>(InviteType.OUTSIDE);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  const { data: inbox = [] } = useQuery<DateInvite[]>({
    queryKey: ["invites", "inbox"],
    queryFn: invitesApi.inbox,
  });
  const { data: sent = [] } = useQuery<DateInvite[]>({
    queryKey: ["invites", "sent"],
    queryFn: invitesApi.sent,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACCEPTED" | "DECLINED" }) =>
      invitesApi.respond(id, { status: status as any }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      mobileNotification.success(variables.status === "ACCEPTED" ? "Invite accepted." : "Invite declined.");
    },
    onError: (error) => mobileNotification.fromError(error, "Could not respond to this invite."),
  });

  const createMutation = useMutation({
    mutationFn: () => invitesApi.create({
      type: inviteType,
      title: title.trim(),
      message: message.trim(),
      emojis: [],
      scheduledDate: scheduledDate.trim()
        ? new Date(`${scheduledDate.trim()}T12:00:00`).toISOString()
        : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setComposerOpen(false);
      setTitle("");
      setMessage("");
      setScheduledDate("");
      setTab("sent");
      mobileNotification.success("Invite sent.");
    },
    onError: (error) => mobileNotification.fromError(error, "Could not send this invite."),
  });

  const primaryColor = theme.accent.primary;

  const list = tab === "inbox" ? inbox : sent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top) }]}>
        <Text style={[styles.title, { color: theme.text }]}><Icon name="email-outline" size={21} color={primaryColor} /> Invites</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: primaryColor }]} onPress={() => setComposerOpen(true)}>
          <Icon name="plus" size={18} color="#fff" /><Text style={styles.addButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
        {(["inbox", "sent"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { backgroundColor: primaryColor }]}
          >
            <Text style={[styles.tabText, { color: tab === t ? "#fff" : theme.textMuted }]}>
              <Icon name={t === "inbox" ? "inbox-arrow-down-outline" : "send-outline"} size={15} color={tab === t ? "#fff" : theme.textMuted} /> {t === "inbox" ? "Inbox" : "Sent"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {list.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>No invites here.</Text>
        ) : (
          list.map((invite) => {
            const sc = STATUS_COLORS[invite.status];
            return (
              <View key={invite.id} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>{INVITE_EMOJIS[invite.type] ?? "✦"}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{invite.title}</Text>
                    <Text style={styles.cardMessage}>{invite.message}</Text>
                    {invite.emojis.length > 0 && (
                      <Text style={styles.cardEmojis}>{invite.emojis.join(" ")}</Text>
                    )}
                    <Text style={styles.cardDate}>
                      {format(new Date(invite.createdAt), "MMM d, h:mm a")}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{invite.status}</Text>
                  </View>
                </View>
                {tab === "inbox" && invite.status === InviteStatus.PENDING && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => respondMutation.mutate({ id: invite.id, status: "ACCEPTED" })}
                      style={[styles.actionBtn, { backgroundColor: "#DCFCE7" }]}
                    >
                      <Text style={{ color: "#166534", fontWeight: "800" }}><Icon name="check" size={15} color="#166534" /> Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => respondMutation.mutate({ id: invite.id, status: "DECLINED" })}
                      style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                    >
                      <Text style={{ color: "#DC2626", fontWeight: "800" }}><Icon name="close" size={15} color="#DC2626" /> Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
      <Modal visible={composerOpen} transparent animationType="fade" onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New invite</Text>
            <View style={styles.typeGrid}>
              {([InviteType.OUTSIDE, InviteType.FOOD, InviteType.BONDING, InviteType.CUSTOM] as const).map((choice) => (
                <TouchableOpacity key={choice} onPress={() => setInviteType(choice)} style={[styles.typeChoice, { borderColor: inviteType === choice ? primaryColor : theme.border, backgroundColor: inviteType === choice ? theme.accent.soft : theme.surface }] }>
                  <Text style={styles.typeEmoji}>{INVITE_EMOJIS[choice]}</Text>
                  <Text style={[styles.typeLabel, { color: theme.text }]}>{choice === InviteType.OUTSIDE ? "Go outside" : choice === InviteType.FOOD ? "Eat together" : choice === InviteType.BONDING ? "Bonding time" : "Custom"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
            <TextInput value={message} onChangeText={setMessage} placeholder="Write a sweet message" placeholderTextColor={theme.textMuted} multiline style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]} />
            <TextInput value={scheduledDate} onChangeText={setScheduledDate} placeholder="Schedule (optional): YYYY-MM-DD" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, { borderColor: theme.border }]} onPress={() => setComposerOpen(false)}><Text style={{ color: theme.text, fontWeight: "800" }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={!title.trim() || !message.trim() || createMutation.isPending || Boolean(scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate))} style={[styles.modalButton, { backgroundColor: primaryColor }, (!title.trim() || !message.trim() || createMutation.isPending) && { opacity: .5 }]} onPress={() => createMutation.mutate()}><Text style={{ color: "#fff", fontWeight: "900" }}>Send invite</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "rgba(255,253,249,.86)", borderBottomWidth: 1, borderBottomColor: "rgba(185,130,103,.18)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "900" },
  addButton: { minHeight: 38, paddingHorizontal: 14, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 5 },
  addButtonText: { color: "#fff", fontWeight: "900" },
  tabs: { flexDirection: "row", gap: 8, padding: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: "center", backgroundColor: "#f3f4f6" },
  tabText: { fontWeight: "800", color: "#6b7280", fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: "center", color: "#9ca3af", fontWeight: "600", marginTop: 40 },
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: "#9d654d", shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  cardTop: { flexDirection: "row", gap: 10 },
  cardEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  cardMessage: { fontSize: 13, color: "#6b7280", marginTop: 3, lineHeight: 18 },
  cardEmojis: { fontSize: 18, marginTop: 4 },
  cardDate: { fontSize: 11, color: "#9ca3af", marginTop: 4, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  statusText: { fontSize: 11, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(48,34,31,.35)", justifyContent: "center", padding: 18 },
  modalCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: "900" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChoice: { width: "48%", minHeight: 82, borderWidth: 1.5, borderRadius: 16, alignItems: "center", justifyContent: "center", padding: 8 },
  typeEmoji: { fontSize: 25 },
  typeLabel: { fontSize: 12, fontWeight: "800", marginTop: 4 },
  input: { minHeight: 50, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: "600" },
  textArea: { minHeight: 86, paddingTop: 13, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 3 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
