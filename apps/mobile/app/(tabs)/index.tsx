import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  format,
} from "date-fns";
import { relationshipApi, calendarApi } from "@ronbri/api-client";
import { useAuth } from "../../contexts/AuthContext";
import type { DateEvent } from "@ronbri/types";

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

  const isGirl = user?.role === "GIRL";
  const primaryColor = isGirl ? "#EAB308" : "#3B82F6";
  const lightColor = isGirl ? "#FEFCE8" : "#EFF6FF";
  const accentColor = isGirl ? "#A16207" : "#1D4ED8";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>
          Hey {user?.displayName}! {isGirl ? "💛" : "💙"}
        </Text>
        <Text style={styles.subgreeting}>Here's your love dashboard 🌸</Text>

        {/* Days Together */}
        <View style={[styles.card, styles.shadow]}>
          <Text style={styles.cardTitle}>💙 Ron Ron & BriBri 💛</Text>
          <Text style={[styles.togetherLabel, { color: "#9ca3af" }]}>Together for</Text>
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
            <Text style={styles.sinceLabel}>
              Since {format(startDate, "MMMM d, yyyy")} 🌸
            </Text>
          )}
        </View>

        {/* Upcoming */}
        <Text style={styles.sectionTitle}>Upcoming Dates 📅</Text>
        {upcoming.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No upcoming dates yet 🗓️</Text>
          </View>
        ) : (
          upcoming.map((event) => (
            <View
              key={event.id}
              style={[styles.eventCard, { borderLeftColor: event.createdBy?.role === "BOY" ? "#3B82F6" : "#EAB308" }]}
            >
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>
                  {event.emoji} {event.title}
                </Text>
                {event.description ? (
                  <Text style={styles.eventDesc}>{event.description}</Text>
                ) : null}
              </View>
              <Text style={styles.eventDate}>{format(new Date(event.date), "MMM d")}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  scroll: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 28, fontWeight: "900", color: "#1f2937", marginBottom: 4 },
  subgreeting: { fontSize: 15, color: "#9ca3af", fontWeight: "600", marginBottom: 24 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 24, marginBottom: 24 },
  shadow: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  cardTitle: { fontSize: 18, fontWeight: "900", color: "#1f2937", textAlign: "center", marginBottom: 4 },
  togetherLabel: { textAlign: "center", fontSize: 14, fontWeight: "600", marginBottom: 16 },
  counters: { flexDirection: "row", gap: 12 },
  counterBox: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  counterNum: { fontSize: 32, fontWeight: "900" },
  counterLabel: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  sinceLabel: { textAlign: "center", color: "#9ca3af", fontSize: 13, fontWeight: "600", marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#374151", marginBottom: 12 },
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
  eventTitle: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  eventDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  eventDate: { fontSize: 13, color: "#9ca3af", fontWeight: "700", marginLeft: 12 },
});
