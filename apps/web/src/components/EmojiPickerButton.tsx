import React, { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface EmojiPickerButtonProps {
  onPick: (emoji: string) => void;
}

const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({ onPick }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 text-xl hover:bg-gray-200 transition-colors"
      >
        😊
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            className="absolute bottom-12 left-0 z-[90]"
          >
            <Picker
              data={data}
              onEmojiSelect={(em: { native: string }) => {
                onPick(em.native);
                setOpen(false);
              }}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[89]" onClick={() => setOpen(false)} />
      )}
    </div>
  );
};

export default EmojiPickerButton;
