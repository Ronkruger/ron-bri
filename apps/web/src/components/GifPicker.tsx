import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { giphyApi } from "@ronbri/api-client";

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

interface GifItem {
  id: string;
  images: { fixed_height: { url: string } };
}

const GifPicker: React.FC<GifPickerProps> = ({ open, onClose, onSelect }) => {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    giphyApi.trending(20)
      .then((data) => setGifs(data.data ?? []))
      .catch(() => setGifs([]))
      .finally(() => setLoading(false));
  }, [open]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await giphyApi.search(query, 20);
      setGifs(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-4xl sm:rounded-4xl w-full max-w-md h-[60vh] flex flex-col p-4"
        >
          <div className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search GIFs..."
              className="flex-1 rounded-2xl border border-gray-200 px-4 py-2 font-medium outline-none focus:border-[var(--color-primary)]"
            />
            <button onClick={search} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-2xl font-bold">
              Search
            </button>
            <button onClick={onClose} className="text-gray-400 text-2xl px-2">×</button>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2">
            {loading && (
              <div className="col-span-3 flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loading && gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.images.fixed_height.url)}
                className="rounded-2xl overflow-hidden hover:ring-2 ring-[var(--color-primary)] transition-all"
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt="gif"
                  className="w-full h-24 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GifPicker;
