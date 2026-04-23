import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
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

const STATUS_COLORS: Record<InviteStatus, string> = {
  [InviteStatus.PENDING]: "bg-yellow-100 text-yellow-700",
  [InviteStatus.ACCEPTED]: "bg-green-100 text-green-700",
  [InviteStatus.DECLINED]: "bg-red-100 text-red-600",
};

const InvitesPage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [creating, setCreating] = useState(false);

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
          list.map((invite) => (
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
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[invite.status]}`}>
                  {invite.status}
                </span>
              </div>
              {/* Accept/Decline for inbox & pending */}
              {tab === "inbox" && invite.status === InviteStatus.PENDING && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => respondMutation.mutate({ id: invite.id, status: "ACCEPTED" })}
                    className="flex-1 py-2 rounded-2xl bg-green-100 text-green-700 font-bold hover:bg-green-200"
                  >
                    💚 Accept
                  </button>
                  <button
                    onClick={() => respondMutation.mutate({ id: invite.id, status: "DECLINED" })}
                    className="flex-1 py-2 rounded-2xl bg-red-50 text-red-500 font-bold hover:bg-red-100"
                  >
                    💔 Decline
                  </button>
                </div>
              )}
            </motion.div>
          ))
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
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setType(InviteType.OUTSIDE);
    setTitle("");
    setMessage("");
    setEmojis([]);
    setGifUrl("");
    setImageUrl("");
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
            <div className="flex gap-2">
              <button onClick={() => setGifOpen(true)} className="px-4 py-2 rounded-2xl bg-gray-100 font-bold text-gray-600">
                GIF {gifUrl && "✓"}
              </button>
              <label className="px-4 py-2 rounded-2xl bg-gray-100 font-bold text-gray-600 cursor-pointer">
                📷 Photo {imageUrl && "✓"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
            </div>
            {gifUrl && <img src={gifUrl} alt="gif" className="rounded-2xl max-h-24 object-cover" />}
            {imageUrl && <img src={imageUrl} alt="" className="rounded-2xl max-h-24 object-cover" />}
            <div className="flex gap-3 mt-2">
              <button onClick={handleClose} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold">Cancel</button>
              <button
                onClick={() => onSubmit({ type, title, message, emojis, gifUrl: gifUrl || undefined, imageUrl: imageUrl || undefined })}
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
