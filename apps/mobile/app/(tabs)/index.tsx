import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  format,
} from "date-fns";
import { relationshipApi, calendarApi, getSocket } from "@ronbri/api-client";
import { useAuth } from "../../contexts/AuthContext";
import type { DateEvent } from "@ronbri/types";
import { Icon, InitialAvatar, styles as sharedStyles, useUiTheme } from "../../components/ui";
import { mobileNotification } from "../../components/toast";

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: rel } = useQuery({ queryKey: ["relationship"], queryFn: relationshipApi.get });
  const { data: events = [] } = useQuery<DateEvent[]>({ queryKey: ["calendar"], queryFn: calendarApi.list });

  const startDate = rel ? new Date(rel.startDate) : null;
  const today = new Date();

  const years = startDate ? differenceInYears(today, startDate) : 0;
  const afterYears = startDate
    ? new Date(startDate.getFullYear() + years, startDate.getMonth(), startDate.getDate())
    : today;
  const months = startDate ? differenceInMonths(today, afterYears) : 0;
  const afterMonths = startDate
    ? new Date(afterYears.getFullYear(), afterYears.getMonth() + months, afterYears.getDate())
    : today;
  const days = startDate ? differenceInDays(today, afterMonths) : 0;

  const upcoming = [...events]
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const theme = useUiTheme(user?.role);
  const primaryColor = theme.accent.primary;
  const lightColor = theme.accent.soft;
  const accentColor = theme.accent.primaryStrong;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.greetingRow}>
          <InitialAvatar name={user?.displayName} color={accentColor} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: theme.text }]}>Hey {user?.displayName}!</Text>
            <Text style={[styles.subgreeting, { color: theme.textMuted }]}>Your shared space at a glance</Text>
          </View>
        </View>

        {/* Days Together */}
        <View style={[styles.card, sharedStyles.shadow, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}><Icon name="heart-outline" size={18} color={primaryColor} /> Ron Ron & BriBri</Text>
          <Text style={[styles.togetherLabel, { color: theme.textMuted }]}>Together for</Text>
          <View style={styles.counters}>
            {[
              { value: years, label: years === 1 ? "Year" : "Years" },
              { value: months, label: months === 1 ? "Month" : "Months" },
              { value: days, label: days === 1 ? "Day" : "Days" },
            ].map(({ value, label }) => (
              <View key={label} style={[styles.counterBox, { backgroundColor: lightColor }]}>
                <Text style={[styles.counterNum, { color: accentColor }]}>{value}</Text>
                <Text style={[styles.counterLabel, { color: primaryColor }]}>{label}</Text>
              </View>
            ))}
          </View>
          {startDate && (
                <Text style={[styles.sinceLabel, { color: theme.textMuted }]}>
              Since {format(startDate, "MMMM d, yyyy")}
            </Text>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => {
            getSocket().emit("heart:send");
            mobileNotification.success(`Heartbeat sent to ${user?.role === "BOY" ? "BriBri" : "Ron Ron"}.`);
          }}
          style={[styles.heartbeat, sharedStyles.shadow, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
        >
          <Icon name="heart-outline" size={34} color={theme.accent.primaryStrong} />
          <Text style={[styles.heartbeatTitle, { color: theme.text }]}>Send a heartbeat</Text>
          <Text style={[styles.heartbeatText, { color: theme.textMuted }]}>Let them know you are thinking of them.</Text>
        </TouchableOpacity>

        {/* Upcoming */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}><Icon name="calendar-month-outline" size={19} color={primaryColor} /> Upcoming dates</Text>
        {upcoming.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: theme.accent.border }]}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No upcoming dates yet.</Text>
          </View>
        ) : (
          upcoming.map((event) => (
            <View
              key={event.id}
              style={[styles.eventCard, { backgroundColor: theme.surfaceRaised, borderLeftColor: event.createdBy?.role === "BOY" ? "#7c9fd6" : "#c69732" }]}
            >
              <View style={styles.eventContent}>
                <Text style={[styles.eventTitle, { color: theme.text }]}>
                  {event.emoji} {event.title}
                </Text>
                {event.description ? (
                  <Text style={[styles.eventDesc, { color: theme.textMuted }]}>{event.description}</Text>
                ) : null}
              </View>
              <Text style={[styles.eventDate, { color: theme.textMuted }]}>{format(new Date(event.date), "MMM d")}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  greeting: { fontSize: 27, fontWeight: "900", marginBottom: 4 },
  subgreeting: { fontSize: 14, fontWeight: "600" },
  card: { borderRadius: 20, padding: 22, marginBottom: 24, borderWidth: 1, borderColor: "rgba(185, 130, 103, .22)" },
  shadow: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  cardTitle: { fontSize: 18, fontWeight: "900", textAlign: "center", marginBottom: 4, flexDirection: "row" },
  togetherLabel: { textAlign: "center", fontSize: 14, fontWeight: "600", marginBottom: 16 },
  counters: { flexDirection: "row", gap: 12 },
  counterBox: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  counterNum: { fontSize: 32, fontWeight: "900" },
  counterLabel: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  sinceLabel: { textAlign: "center", color: "#9ca3af", fontSize: 13, fontWeight: "600", marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 12, flexDirection: "row", alignItems: "center" },
  heartbeat: { alignItems: "center", borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24 },
  heartbeatTitle: { fontSize: 17, fontWeight: "900", marginTop: 8 },
  heartbeatText: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  emptyBox: { borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: "#e5e7eb", padding: 24, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontWeight: "600" },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  eventContent: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: "800" },
  eventDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  eventDate: { fontSize: 13, color: "#9ca3af", fontWeight: "700", marginLeft: 12 },
});
