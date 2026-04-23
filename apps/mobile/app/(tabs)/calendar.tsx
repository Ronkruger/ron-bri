import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { calendarApi } from "@ronbri/api-client";
import type { DateEvent } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";

export default function CalendarScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: events = [] } = useQuery<DateEvent[]>({
    queryKey: ["calendar"],
    queryFn: calendarApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  const isGirl = user?.role === "GIRL";
  const primaryColor = isGirl ? "#EAB308" : "#3B82F6";

  const markedDates: Record<string, any> = {};
  events.forEach((e) => {
    const dateStr = e.date.slice(0, 10);
    markedDates[dateStr] = {
      marked: true,
      dotColor: e.createdBy?.role === "BOY" ? "#3B82F6" : "#EAB308",
    };
  });
  if (selected) {
    markedDates[selected] = { ...markedDates[selected], selected: true, selectedColor: primaryColor };
  }

  const selectedEvents = selected
    ? events.filter((e) => e.date.slice(0, 10) === selected)
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar 📅</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Calendar
          markedDates={markedDates}
          onDayPress={(day: { dateString: string }) => setSelected(day.dateString)}
          theme={{
            selectedDayBackgroundColor: primaryColor,
            todayTextColor: primaryColor,
            dotColor: primaryColor,
            arrowColor: primaryColor,
          }}
          style={styles.calendar}
        />

        {selected && (
          <View style={styles.eventsSection}>
            <Text style={styles.selectedDate}>
              {format(new Date(selected + "T00:00:00"), "EEEE, MMMM d")}
            </Text>
            {selectedEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events on this day</Text>
            ) : (
              selectedEvents.map((event) => (
                <View key={event.id} style={[styles.eventCard, { borderLeftColor: event.createdBy?.role === "BOY" ? "#3B82F6" : "#EAB308" }]}>
                  <Text style={styles.eventTitle}>{event.emoji} {event.title}</Text>
                  {event.description ? <Text style={styles.eventDesc}>{event.description}</Text> : null}
                  <Text style={styles.eventBy}>by {event.createdBy?.displayName}</Text>
                  {event.createdById === user?.id && (
                    <TouchableOpacity
                      onPress={() => Alert.alert("Delete?", event.title, [
                        { text: "Cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(event.id) },
                      ])}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteBtnText}>Delete 🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "900", color: "#1f2937" },
  scroll: { padding: 16, paddingBottom: 40 },
  calendar: { borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  eventsSection: { marginTop: 8 },
  selectedDate: { fontSize: 16, fontWeight: "800", color: "#374151", marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontWeight: "600", textAlign: "center", paddingVertical: 16 },
  eventCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, borderLeftWidth: 4, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  eventTitle: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  eventDesc: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  eventBy: { fontSize: 12, color: "#9ca3af", marginTop: 4, fontWeight: "600" },
  deleteBtn: { marginTop: 8, alignSelf: "flex-start" },
  deleteBtnText: { fontSize: 12, color: "#ef4444", fontWeight: "700" },
});
