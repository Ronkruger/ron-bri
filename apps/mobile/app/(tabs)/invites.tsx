import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { invitesApi } from "@ronbri/api-client";
import type { DateInvite } from "@ronbri/types";
import { InviteStatus } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_COLORS: Record<InviteStatus, { bg: string; text: string }> = {
  [InviteStatus.PENDING]: { bg: "#FEF9C3", text: "#A16207" },
  [InviteStatus.ACCEPTED]: { bg: "#DCFCE7", text: "#166534" },
  [InviteStatus.DECLINED]: { bg: "#FEE2E2", text: "#DC2626" },
};

const INVITE_EMOJIS: Record<string, string> = {
  OUTSIDE: "🌿",
  FOOD: "🍜",
  BONDING: "🎮",
  CUSTOM: "✨",
};

export default function InvitesScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });

  const isGirl = user?.role === "GIRL";
  const primaryColor = isGirl ? "#EAB308" : "#3B82F6";

  const list = tab === "inbox" ? inbox : sent;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invites 💌</Text>
      </View>
      <View style={styles.tabs}>
        {(["inbox", "sent"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { backgroundColor: primaryColor }]}
          >
            <Text style={[styles.tabText, tab === t && { color: "#fff" }]}>
              {t === "inbox" ? "📬 Inbox" : "📤 Sent"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {list.length === 0 ? (
          <Text style={styles.empty}>No invites here 💌</Text>
        ) : (
          list.map((invite) => {
            const sc = STATUS_COLORS[invite.status];
            return (
              <View key={invite.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>{INVITE_EMOJIS[invite.type] ?? "💌"}</Text>
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
                      <Text style={{ color: "#166534", fontWeight: "800" }}>💚 Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => respondMutation.mutate({ id: invite.id, status: "DECLINED" })}
                      style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                    >
                      <Text style={{ color: "#DC2626", fontWeight: "800" }}>💔 Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "900", color: "#1f2937" },
  tabs: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#fff" },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: "center", backgroundColor: "#f3f4f6" },
  tabText: { fontWeight: "800", color: "#6b7280", fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: "center", color: "#9ca3af", fontWeight: "600", marginTop: 40 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
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
});
