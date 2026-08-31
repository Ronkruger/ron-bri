import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { calendarApi } from "@ronbri/api-client";
import type { DateEvent } from "@ronbri/types";
import { useAuth } from "../../contexts/AuthContext";
import { Icon, useUiTheme } from "../../components/ui";
import { mobileNotification } from "../../components/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CalendarScreen() {
  const { user } = useAuth();
  const theme = useUiTheme(user?.role);
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<DateEvent | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [emoji, setEmoji] = useState("💕");

  const { data: events = [] } = useQuery<DateEvent[]>({
    queryKey: ["calendar"],
    queryFn: calendarApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      mobileNotification.success("Date deleted.");
    },
    onError: (error) => mobileNotification.fromError(error, "Could not delete this date."),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(`${eventDate}T12:00:00`).toISOString(),
        emoji,
      };
      return editing ? calendarApi.update(editing.id, payload) : calendarApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      mobileNotification.success(editing ? "Date updated." : "Date created.");
      setEditorOpen(false);
    },
    onError: (error) => mobileNotification.fromError(error, "Could not save this date."),
  });

  const openEditor = (event?: DateEvent) => {
    setEditing(event ?? null);
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setEventDate(event?.date.slice(0, 10) ?? selected ?? new Date().toISOString().slice(0, 10));
    setEmoji(event?.emoji ?? "💕");
    setEditorOpen(true);
  };

  const primaryColor = theme.accent.primary;

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top) }]}>
        <Text style={[styles.title, { color: theme.text }]}><Icon name="calendar-month-outline" size={21} color={primaryColor} /> Calendar</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: primaryColor }]} onPress={() => openEditor()}>
          <Icon name="plus" size={18} color="#fff" /><Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
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
                <View key={event.id} style={[styles.eventCard, { backgroundColor: theme.surfaceRaised, borderLeftColor: event.createdBy?.role === "BOY" ? "#7c9fd6" : "#c69732" }]}>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{event.emoji} {event.title}</Text>
                  {event.description ? <Text style={[styles.eventDesc, { color: theme.textMuted }]}>{event.description}</Text> : null}
                  <Text style={styles.eventBy}>by {event.createdBy?.displayName}</Text>
                  {event.createdById === user?.id && (
                    <View style={styles.eventActions}>
                      <TouchableOpacity onPress={() => openEditor(event)} style={styles.deleteBtn}>
                        <Text style={[styles.deleteBtnText, { color: primaryColor }]}><Icon name="pencil-outline" size={15} color={primaryColor} /> Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => Alert.alert("Delete?", event.title, [
                        { text: "Cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(event.id) },
                        ])}
                        style={styles.deleteBtn}
                      >
                        <Text style={styles.deleteBtnText}><Icon name="trash-can-outline" size={15} color="#c05c58" /> Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? "Edit date" : "New date"}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
            <TextInput value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor={theme.textMuted} multiline style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]} />
            <TextInput value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Event tag</Text>
            <View style={styles.emojiRow}>
              {["💕", "🍜", "🎮", "🌿", "🎬", "🎂", "🌸", "✨"].map((choice) => (
                <TouchableOpacity key={choice} onPress={() => setEmoji(choice)} style={[styles.emojiChoice, emoji === choice && { borderColor: primaryColor, backgroundColor: theme.accent.soft }]}>
                  <Text style={styles.emojiText}>{choice}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, { borderColor: theme.border }]} onPress={() => setEditorOpen(false)}><Text style={{ color: theme.text, fontWeight: "800" }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || saveMutation.isPending} style={[styles.modalButton, { backgroundColor: primaryColor }, (!title.trim() || saveMutation.isPending) && { opacity: .5 }]} onPress={() => saveMutation.mutate()}><Text style={{ color: "#fff", fontWeight: "900" }}>{editing ? "Save" : "Create"}</Text></TouchableOpacity>
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
  scroll: { padding: 16, paddingBottom: 40 },
  calendar: { borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  eventsSection: { marginTop: 8 },
  selectedDate: { fontSize: 16, fontWeight: "800", color: "#374151", marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontWeight: "600", textAlign: "center", paddingVertical: 16 },
  eventCard: { borderRadius: 16, padding: 14, marginBottom: 10, borderLeftWidth: 4, shadowColor: "#9d654d", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  eventTitle: { fontSize: 15, fontWeight: "800" },
  eventDesc: { fontSize: 13, marginTop: 3 },
  eventBy: { fontSize: 12, color: "#9ca3af", marginTop: 4, fontWeight: "600" },
  deleteBtn: { marginTop: 8, alignSelf: "flex-start" },
  deleteBtnText: { fontSize: 12, color: "#ef4444", fontWeight: "700" },
  eventActions: { flexDirection: "row", gap: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(48,34,31,.35)", justifyContent: "center", padding: 18 },
  modalCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: "900", marginBottom: 3 },
  input: { minHeight: 50, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: "600" },
  textArea: { minHeight: 82, paddingTop: 13, textAlignVertical: "top" },
  fieldLabel: { fontSize: 12, fontWeight: "800" },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiChoice: { width: 43, height: 43, borderRadius: 13, borderWidth: 1.5, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 23 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 5 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
