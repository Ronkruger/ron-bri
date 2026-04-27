import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { calendarApi, uploadApi } from "@ronbri/api-client";
import type { DateEvent, CreateEventPayload } from "@ronbri/types";
import { useAuth } from "../contexts/AuthContext";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [panelEvent, setPanelEvent] = useState<DateEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DateEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  const { data: events = [] } = useQuery<DateEvent[]>({
    queryKey: ["calendar"],
    queryFn: calendarApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (p: CreateEventPayload) => calendarApi.create(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventPayload> }) =>
      calendarApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      setPanelEvent(null);
    },
  });

  const calendarEvents = events.map((e) => ({
    id: e.id,
    title: `${e.emoji ?? ""} ${e.title}`.trim(),
    start: new Date(e.date),
    end: new Date(e.date),
    resource: e,
  }));

  const eventStyleGetter = (event: (typeof calendarEvents)[0]) => {
    const role = event.resource.createdBy?.role;
    const bg = role === "BOY" ? "#3B82F6" : "#EAB308";
    return { style: { backgroundColor: bg, color: "#fff", borderRadius: 12, border: "none", fontWeight: 700 } };
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setEditTarget(null);
    setSelectedSlot(start);
    setModalOpen(true);
  };

  const handleSelectEvent = (event: (typeof calendarEvents)[0]) => {
    setPanelEvent(event.resource);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen">
      {/* Calendar */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-gray-800">Calendar 📅</h1>
          <button
            onClick={() => { setEditTarget(null); setSelectedSlot(new Date()); setModalOpen(true); }}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-2xl font-bold hover:opacity-90 transition-opacity"
          >
            + New Date
          </button>
        </div>
        <div className="h-[calc(100%-4rem)] bg-white rounded-3xl shadow-sm p-4">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            defaultView={Views.MONTH}
            style={{ height: "100%" }}
            eventPropGetter={eventStyleGetter}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
          />
        </div>
      </div>

      {/* Day Detail Panel */}
      <AnimatePresence>
        {panelEvent && (
          <motion.aside
            key="day-panel"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="w-80 bg-white shadow-xl border-l border-gray-100 p-6 flex flex-col gap-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-800">Event</h2>
              <button onClick={() => setPanelEvent(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="text-4xl">{panelEvent.emoji ?? "📅"}</div>
            <div>
              <div className="text-xl font-black text-gray-800">{panelEvent.title}</div>
              {panelEvent.description && (
                <div className="text-gray-500 mt-2">{panelEvent.description}</div>
              )}
              <div className="text-sm text-gray-400 mt-3 font-medium">
                {format(new Date(panelEvent.date), "EEEE, MMMM d, yyyy · h:mm a")}
              </div>
              <div className="text-sm mt-2 font-semibold" style={{ color: panelEvent.createdBy?.role === "BOY" ? "#3B82F6" : "#EAB308" }}>
                Created by {panelEvent.createdBy?.displayName}
              </div>
            </div>
            {panelEvent.imageUrl && (
              <img src={panelEvent.imageUrl} alt="" className="rounded-2xl w-full object-cover" />
            )}
            {panelEvent.createdById === user?.id && (
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => { setEditTarget(panelEvent); setModalOpen(true); setPanelEvent(null); }}
                  className="flex-1 py-2 rounded-2xl bg-[var(--color-light)] text-[var(--color-accent)] font-bold"
                >
                  Edit
                </button>
                <button
                  onClick={() => { if (window.confirm("Delete this event?")) deleteMutation.mutate(panelEvent.id); }}
                  className="flex-1 py-2 rounded-2xl bg-red-50 text-red-500 font-bold"
                >
                  Delete
                </button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <EventModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        initial={editTarget}
        defaultDate={selectedSlot}
        onSubmit={(data) => {
          if (editTarget) {
            updateMutation.mutate({ id: editTarget.id, data });
          } else {
            createMutation.mutate(data);
          }
          setModalOpen(false);
          setEditTarget(null);
        }}
      />
    </div>
  );
};

// ─── Event Modal ─────────────────────────────────────────────────────────────

const EMOJIS = ["💕", "🍜", "🎮", "🌿", "🎬", "🎂", "🌸", "✨", "🏖️", "🎉"];

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  initial: DateEvent | null;
  defaultDate: Date | null;
  onSubmit: (data: CreateEventPayload) => void;
}

const EventModal: React.FC<EventModalProps> = ({ open, onClose, initial, defaultDate, onSubmit }) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(
    initial
      ? new Date(initial.date).toISOString().slice(0, 16)
      : defaultDate
        ? new Date(defaultDate).toISOString().slice(0, 16)
        : ""
  );
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setDate(
        initial
          ? new Date(initial.date).toISOString().slice(0, 16)
          : defaultDate ? new Date(defaultDate).toISOString().slice(0, 16) : ""
      );
      setEmoji(initial?.emoji ?? "");
      setImageUrl(initial?.imageUrl ?? "");
    }
  }, [open, initial, defaultDate]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadApi.image(file);
      setImageUrl(url);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-4xl w-full max-w-md p-8 shadow-2xl"
        >
          <h2 className="text-2xl font-black text-gray-800 mb-6">
            {initial ? "Edit Date ✏️" : "New Date 📅"}
          </h2>
          <div className="flex flex-col gap-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold outline-none focus:border-[var(--color-primary)]"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)..."
              rows={2}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-medium outline-none focus:border-[var(--color-primary)] resize-none"
            />
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold outline-none focus:border-[var(--color-primary)]"
            />
            {/* Emoji Picker */}
            <div>
              <div className="text-sm font-semibold text-gray-500 mb-2">Emoji tag</div>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(emoji === e ? "" : e)}
                    className={`text-2xl p-2 rounded-xl transition-all ${emoji === e ? "bg-[var(--color-light)] ring-2 ring-[var(--color-primary)]" : "hover:bg-gray-50"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            {/* Image */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">Photo (optional)</span>
              <label className="ml-auto text-sm px-3 py-1 rounded-xl bg-gray-100 font-semibold cursor-pointer">
                🖼️ {uploading ? "Uploading..." : imageUrl ? "Change" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              <label className="text-sm px-3 py-1 rounded-xl bg-gray-100 font-semibold cursor-pointer">
                📸 Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImage}
                />
              </label>
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="" className="rounded-2xl w-full h-32 object-cover" />
            )}
            <div className="flex gap-3 mt-2">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold">
                Cancel
              </button>
              <button
                onClick={() => title && date && onSubmit({ title, description: description || undefined, date, emoji: emoji || undefined, imageUrl: imageUrl || undefined })}
                disabled={!title || !date}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] text-white font-black disabled:opacity-50"
              >
                {initial ? "Save" : "Create ✨"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CalendarPage;
