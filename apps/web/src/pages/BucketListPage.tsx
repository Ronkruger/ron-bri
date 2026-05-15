import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { bucketListApi, uploadApi } from "@ronbri/api-client";
import { useAuth } from "../contexts/AuthContext";
import type { BucketItem, CreateBucketItemPayload } from "@ronbri/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Travel", emoji: "🌍", color: "bg-teal-50/80 border-teal-200/60" },
  { label: "Food", emoji: "🍜", color: "bg-orange-50/80 border-orange-200/60" },
  { label: "Adventure", emoji: "🎉", color: "bg-purple-50/80 border-purple-200/60" },
  { label: "Home", emoji: "🏡", color: "bg-rose-50/80 border-rose-200/60" },
  { label: "Other", emoji: "💡", color: "bg-gray-50/80 border-gray-200/60" },
] as const;

function categoryStyle(cat: string | null): string {
  return CATEGORIES.find((c) => c.label === cat)?.color ?? "bg-white/70 border-white/80";
}

function categoryEmoji(cat: string | null): string {
  return CATEGORIES.find((c) => c.label === cat)?.emoji ?? "✨";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BucketListPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const { data: items = [], isLoading } = useQuery<BucketItem[]>({
    queryKey: ["bucket-list"],
    queryFn: bucketListApi.list,
  });

  const createMutation = useMutation({
    mutationFn: bucketListApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] });
      setAddOpen(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url?: string }) =>
      bucketListApi.complete(id, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bucket-list"] });
      setCompletingId(null);
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.55 },
        colors: ["#fce7f3", "#ddd6fe", "#bfdbfe", "#fbcfe8", "#a5f3fc"],
      });
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: bucketListApi.uncomplete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bucket-list"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: bucketListApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bucket-list"] }),
  });

  const todo = items.filter((i) => !i.completedAt);
  const done = items.filter((i) => i.completedAt);
  const progress = items.length > 0 ? Math.round((done.length / items.length) * 100) : 0;

  const handleComplete = async (item: BucketItem) => {
    setCompletingId(item.id);
  };

  const handleCompleteConfirm = async (id: string, photoFile?: File) => {
    let url: string | undefined;
    if (photoFile) {
      setPhotoUploading(true);
      try {
        const res = await uploadApi.image(photoFile);
        url = res.url;
      } finally {
        setPhotoUploading(false);
      }
    }
    completeMutation.mutate({ id, url });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] md:h-screen">
        <div className="text-4xl animate-bounce">🪣</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto pb-28 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-black text-gray-800">Bucket List 🪣</h1>
        <p className="text-gray-400 font-medium mt-1">
          Adventures you want to do together
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="mb-6 bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-black text-gray-700">
            {done.length} / {items.length} completed
          </span>
          <span className="text-2xl font-black text-[var(--color-accent)]">{progress}%</span>
        </div>
        <div className="h-3 bg-[var(--color-muted)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Add button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setAddOpen(true)}
        className="w-full mb-8 py-4 rounded-3xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-black text-base shadow-md"
      >
        + Add to Bucket List
      </motion.button>

      {/* To Do section */}
      {todo.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="text-lg font-black text-gray-600 mb-3">To Do Together ✨</h2>
          <div className="flex flex-col gap-3 mb-8">
            {todo.map((item, i) => (
              <BucketCard
                key={item.id}
                item={item}
                userId={user?.id ?? ""}
                index={i}
                onComplete={() => handleComplete(item)}
                onDelete={() => deleteMutation.mutate(item.id)}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Done section */}
      {done.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <h2 className="text-lg font-black text-gray-600 mb-3">Done Together 🥰</h2>
          <div className="flex flex-col gap-3">
            {done.map((item, i) => (
              <BucketCard
                key={item.id}
                item={item}
                userId={user?.id ?? ""}
                index={i}
                done
                onUncomplete={() => uncompleteMutation.mutate(item.id)}
                onDelete={() => deleteMutation.mutate(item.id)}
              />
            ))}
          </div>
        </motion.section>
      )}

      {items.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🪣</div>
          <p className="font-bold text-lg">Your bucket list is empty!</p>
          <p className="text-sm mt-1">Start adding adventures you want to share.</p>
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {addOpen && (
          <AddModal
            onClose={() => setAddOpen(false)}
            onSubmit={(payload) => createMutation.mutate(payload)}
            loading={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Complete modal */}
      <AnimatePresence>
        {completingId && (
          <CompleteModal
            onClose={() => setCompletingId(null)}
            onConfirm={(file) => handleCompleteConfirm(completingId, file)}
            loading={completeMutation.isPending || photoUploading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Bucket Card ──────────────────────────────────────────────────────────────

interface BucketCardProps {
  item: BucketItem;
  userId: string;
  index: number;
  done?: boolean;
  onComplete?: () => void;
  onUncomplete?: () => void;
  onDelete?: () => void;
}

const BucketCard: React.FC<BucketCardProps> = ({
  item,
  userId,
  index,
  done = false,
  onComplete,
  onUncomplete,
  onDelete,
}) => {
  const isOwner = item.createdById === userId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`relative rounded-3xl border backdrop-blur-sm shadow-sm overflow-hidden ${categoryStyle(item.category)} ${done ? "opacity-80" : ""}`}
    >
      {done && item.completedImageUrl && (
        <div className="relative">
          <img
            src={item.completedImageUrl}
            alt={item.title}
            className="w-full h-36 object-cover saturate-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <span className="absolute top-3 right-3 bg-white/90 text-green-600 font-black text-xs px-3 py-1 rounded-full shadow">
            ✅ Done!
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{item.emoji ?? categoryEmoji(item.category)}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-black text-gray-800 ${done ? "line-through text-gray-500" : ""}`}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
            )}
            {item.category && (
              <span className="inline-block mt-2 text-xs font-bold text-gray-400 bg-white/60 rounded-full px-2 py-0.5">
                {categoryEmoji(item.category)} {item.category}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {!done && (
            <button
              onClick={onComplete}
              className="flex-1 py-2.5 rounded-2xl bg-green-100 text-green-700 font-black text-sm hover:bg-green-200 transition-colors"
            >
              ✅ We did it!
            </button>
          )}
          {done && (
            <button
              onClick={onUncomplete}
              className="flex-1 py-2.5 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              ↩ Undo
            </button>
          )}
          {isOwner && (
            <button
              onClick={onDelete}
              className="p-2.5 rounded-2xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Add Modal ────────────────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void;
  onSubmit: (payload: CreateBucketItemPayload) => void;
  loading: boolean;
}

const AddModal: React.FC<AddModalProps> = ({ onClose, onSubmit, loading }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [category, setCategory] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      emoji: emoji.trim() || undefined,
      category: category || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ y: 40, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-4xl p-7 shadow-2xl border border-white/60"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-black text-gray-800 mb-5">Add to Bucket List 🪣</h2>

        <div className="flex gap-3 mb-4">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="✨"
            maxLength={4}
            className="w-16 text-center text-2xl border-2 border-gray-100 rounded-2xl py-3 outline-none focus:border-[var(--color-primary)] bg-white/80"
          />
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to do?"
            maxLength={200}
            required
            className="flex-1 border-2 border-gray-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:border-[var(--color-primary)] bg-white/80"
          />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="More details (optional)"
          maxLength={500}
          rows={2}
          className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] resize-none mb-4 bg-white/80"
        />

        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setCategory(category === c.label ? "" : c.label)}
              className={`px-3 py-1.5 rounded-2xl text-sm font-bold border transition-all ${
                category === c.label
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-white/80 border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] text-white font-black disabled:opacity-60 hover:opacity-90 transition-opacity"
          >
            {loading ? "Adding..." : "Add 🪣"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
};

// ─── Complete Modal ───────────────────────────────────────────────────────────

interface CompleteModalProps {
  onClose: () => void;
  onConfirm: (file?: File) => void;
  loading: boolean;
}

const CompleteModal: React.FC<CompleteModalProps> = ({ onClose, onConfirm, loading }) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-sm bg-white/90 backdrop-blur-md rounded-4xl p-7 shadow-2xl border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🥳</div>
          <h2 className="text-xl font-black text-gray-800">You did it!</h2>
          <p className="text-gray-400 text-sm mt-1">Add a memory photo (optional)</p>
        </div>

        {preview ? (
          <div className="mb-5 rounded-2xl overflow-hidden">
            <img src={preview} alt="preview" className="w-full h-36 object-cover" />
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full mb-5 py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-semibold text-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            📸 Add a photo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(photoFile ?? undefined)}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-green-500 text-white font-black disabled:opacity-60 hover:bg-green-600 transition-colors"
          >
            {loading ? "Saving..." : "✅ Mark Done!"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BucketListPage;
