import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays, startOfDay } from "date-fns";
import { invitesApi, uploadApi, giphyApi } from "@ronbri/api-client";
import type { DateInvite, CreateInvitePayload } from "@ronbri/types";
import { InviteType, InviteStatus } from "@ronbri/types";
import { useAuth } from "../contexts/AuthContext";
import GifPicker from "../components/GifPicker";
import EmojiPickerButton from "../components/EmojiPickerButton";

const INVITE_TYPES = [
  { type: InviteType.OUTSIDE, emoji: "🌿", label: "Go Outside" },
  { type: InviteType.FOOD, emoji: "🍜", label: "Eat Together" },
  { type: InviteType.BONDING, emoji: "🎮", label: "Bonding Time" },
  { type: InviteType.CUSTOM, emoji: "✨", label: "Custom" },
];

interface BadgeInfo { label: string; cls: string; extra?: string; }

function getDisplayBadge(
  invite: DateInvite & { scheduledDate?: string | null; rescheduleDate?: string | null }
): BadgeInfo {
  const { status, scheduledDate, rescheduleDate } = invite;

  if (status === InviteStatus.RESCHEDULED) {
    return {
      label: "Rescheduled 📅",
      cls: "bg-purple-100 text-purple-700",
      extra: rescheduleDate ? `New date: ${format(new Date(rescheduleDate), "MMM d, yyyy")}` : undefined,
    };
  }

  if (status === InviteStatus.ACCEPTED && scheduledDate) {
    const today = startOfDay(new Date());
    const eventDay = startOfDay(new Date(scheduledDate));
    const diff = differenceInDays(eventDay, today);
    if (diff < 0) return { label: "Done 🥰", cls: "bg-gray-100 text-gray-500", extra: format(new Date(scheduledDate), "MMM d, yyyy") };
    if (diff === 0) return { label: "Ongoing! 🎉", cls: "bg-green-200 text-green-800", extra: "Today!" };
    return { label: `${diff} day${diff !== 1 ? "s" : ""} left ✨`, cls: "bg-blue-100 text-blue-700", extra: format(new Date(scheduledDate), "MMM d, yyyy") };
  }

  const map: Record<string, BadgeInfo> = {
    PENDING: { label: "Pending ⏳", cls: "bg-yellow-100 text-yellow-700" },
    ACCEPTED: { label: "Accepted 💚", cls: "bg-green-100 text-green-700" },
    DECLINED: { label: "Declined 💔", cls: "bg-red-100 text-red-600" },
    RESCHEDULED: { label: "Rescheduled 📅", cls: "bg-purple-100 text-purple-700" },
  };
  return map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
}

const InvitesPage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [creating, setCreating] = useState(false);
  const [rescheduling, setRescheduling] = useState<{ id: string; date: string } | null>(null);

  const { data: inbox = [] } = useQuery<DateInvite[]>({
    queryKey: ["invites", "inbox"],
    queryFn: invitesApi.inbox,
  });

  const { data: sent = [] } = useQuery<DateInvite[]>({
    queryKey: ["invites", "sent"],
    queryFn: invitesApi.sent,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status, rescheduleDate }: { id: string; status: "ACCEPTED" | "DECLINED" | "RESCHEDULED"; rescheduleDate?: string }) =>
      invitesApi.respond(id, { status: status as any, rescheduleDate } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setRescheduling(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (p: CreateInvitePayload) => invitesApi.create(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setCreating(false);
    },
  });

  const list = tab === "inbox" ? inbox : sent;

  return (
    <div className="p-6 max-w-xl mx-auto pb-28 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-800">Invites 💌</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-2xl font-bold hover:opacity-90"
        >
          + Send
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["inbox", "sent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-2xl font-bold capitalize transition-all ${
              tab === t
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white text-gray-500 border border-gray-100"
            }`}
          >
            {t === "inbox" ? "📬 Inbox" : "📤 Sent"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-4">
        {list.length === 0 ? (
          <div className="text-center text-gray-400 font-medium py-10">
            No invites here yet 💌
          </div>
        ) : (
          list.map((invite) => {
            const inv = invite as DateInvite & { scheduledDate?: string | null; rescheduleDate?: string | null };
            const badge = getDisplayBadge(inv);
            const isReschedulingThis = rescheduling?.id === invite.id;
            return (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-sm p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">
                        {INVITE_TYPES.find((t) => t.type === invite.type)?.emoji}
                      </span>
                      <span className="font-black text-gray-800">{invite.title}</span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{invite.message}</p>
                    {invite.emojis.length > 0 && (
                      <div className="mt-2 text-lg">{invite.emojis.join(" ")}</div>
                    )}
                    {invite.gifUrl && (
                      <img src={invite.gifUrl} alt="gif" className="rounded-2xl mt-3 max-h-32 object-cover" />
                    )}
                    {invite.imageUrl && (
                      <img src={invite.imageUrl} alt="" className="rounded-2xl mt-3 max-h-32 object-cover" />
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      {format(new Date(invite.createdAt), "MMM d, h:mm a")}
                    </div>
                    {inv.scheduledDate && invite.status !== InviteStatus.RESCHEDULED && (
                      <div className="text-xs text-indigo-500 font-semibold mt-1">
                        📅 {format(new Date(inv.scheduledDate), "MMM d, yyyy")}
                      </div>
                    )}
                    {invite.status === InviteStatus.RESCHEDULED && inv.rescheduleDate && (
                      <div className="text-xs text-purple-600 font-semibold mt-1">
                        🔄 New date: {format(new Date(inv.rescheduleDate), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {badge.extra && (
                      <span className="text-xs text-gray-400 text-right">{badge.extra}</span>
                    )}
                  </div>
                </div>
                {/* Actions for inbox + PENDING */}
                {tab === "inbox" && invite.status === InviteStatus.PENDING && (
                  <div className="mt-4">
                    {!isReschedulingThis ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondMutation.mutate({ id: invite.id, status: "ACCEPTED" })}
                          disabled={respondMutation.isPending}
                          className="flex-1 py-2 rounded-2xl bg-green-100 text-green-700 font-bold hover:bg-green-200 text-sm disabled:opacity-50"
                        >
                          💚 Accept
                        </button>
                        <button
                          onClick={() => respondMutation.mutate({ id: invite.id, status: "DECLINED" })}
                          disabled={respondMutation.isPending}
                          className="flex-1 py-2 rounded-2xl bg-red-50 text-red-500 font-bold hover:bg-red-100 text-sm disabled:opacity-50"
                        >
                          💔 Decline
                        </button>
                        <button
                          onClick={() => setRescheduling({ id: invite.id, date: "" })}
                          className="flex-1 py-2 rounded-2xl bg-purple-50 text-purple-600 font-bold hover:bg-purple-100 text-sm"
                        >
                          📅 Reschedule
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pick new date</label>
                        <input
                          type="date"
                          value={rescheduling.date}
                          onChange={(e) => setRescheduling({ id: invite.id, date: e.target.value })}
                          className="w-full rounded-2xl border border-gray-200 px-4 py-2 font-semibold outline-none focus:border-[var(--color-primary)]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRescheduling(null)}
                            className="flex-1 py-2 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={!rescheduling.date || respondMutation.isPending}
                            onClick={() => respondMutation.mutate({ id: invite.id, status: "RESCHEDULED", rescheduleDate: rescheduling.date })}
                            className="flex-1 py-2 rounded-2xl bg-purple-500 text-white font-bold hover:bg-purple-600 disabled:opacity-50 text-sm"
                          >
                            {respondMutation.isPending ? "Saving..." : "Confirm 📅"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Invite Modal */}
      <CreateInviteModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />
    </div>
  );
};

// ─── Create Invite Modal ──────────────────────────────────────────────────────

interface CreateInviteModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvitePayload) => void;
  loading: boolean;
}

const CreateInviteModal: React.FC<CreateInviteModalProps> = ({ open, onClose, onSubmit, loading }) => {
  const [type, setType] = useState<InviteType>(InviteType.OUTSIDE);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [emojis, setEmojis] = useState<string[]>([]);
  const [gifUrl, setGifUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setType(InviteType.OUTSIDE);
    setTitle("");
    setMessage("");
    setEmojis([]);
    setGifUrl("");
    setImageUrl("");
    setScheduledDate("");
  };

  const handleClose = () => { reset(); onClose(); };

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
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-4xl w-full max-w-md p-8 shadow-2xl my-4"
        >
          <h2 className="text-2xl font-black text-gray-800 mb-6">Send a Date Invite 💌</h2>

          {/* Type Picker */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {INVITE_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => { setType(t.type); setTitle(`${t.emoji} ${t.label}`); }}
                className={`p-4 rounded-3xl border-2 transition-all font-bold ${
                  type === t.type
                    ? "border-[var(--color-primary)] bg-[var(--color-light)]"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="text-3xl mb-1">{t.emoji}</div>
                <div className="text-sm text-gray-700">{t.label}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold outline-none focus:border-[var(--color-primary)]"
            />
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a sweet message... 💕"
                rows={3}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-medium outline-none focus:border-[var(--color-primary)] resize-none"
              />
              <div className="absolute right-3 bottom-3">
                <EmojiPickerButton onPick={(em) => {
                  setEmojis((prev) => [...prev, em]);
                  setMessage((m) => m + em);
                }} />
              </div>
            </div>
            {emojis.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {emojis.map((em, i) => (
                  <button key={i} onClick={() => setEmojis((prev) => prev.filter((_, j) => j !== i))} className="text-xl hover:opacity-60">{em}</button>
                ))}
              </div>
            )}
            {/* Scheduled Date */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                📅 Schedule for (optional)
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-semibold outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setGifOpen(true)} className="px-4 py-2 rounded-2xl bg-gray-100 font-bold text-gray-600">
                GIF {gifUrl && "✓"}
              </button>
              <label className="px-4 py-2 rounded-2xl bg-gray-100 font-bold text-gray-600 cursor-pointer">
                📸 Camera {imageUrl && "✓"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImage}
                />
              </label>
              <label className="px-4 py-2 rounded-2xl bg-gray-100 font-bold text-gray-600 cursor-pointer">
                🖼️ Gallery {imageUrl && "✓"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
            </div>
            {gifUrl && <img src={gifUrl} alt="gif" className="rounded-2xl max-h-24 object-cover" />}
            {imageUrl && <img src={imageUrl} alt="" className="rounded-2xl max-h-24 object-cover" />}
            <div className="flex gap-3 mt-2">
              <button onClick={handleClose} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold">Cancel</button>
              <button
                onClick={() => onSubmit({ type, title, message, emojis, gifUrl: gifUrl || undefined, imageUrl: imageUrl || undefined, scheduledDate: scheduledDate || undefined })}
                disabled={!title || !message || loading}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] text-white font-black disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send 💌"}
              </button>
            </div>
          </div>
          <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onSelect={(url) => { setGifUrl(url); setGifOpen(false); }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InvitesPage;
