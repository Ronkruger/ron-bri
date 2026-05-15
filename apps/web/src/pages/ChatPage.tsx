import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { messagesApi, uploadApi } from "@ronbri/api-client";
import { getSocket } from "@ronbri/api-client";
import type { Message, MessageReaction } from "@ronbri/types";
import { useAuth } from "../contexts/AuthContext";
import GifPicker from "../components/GifPicker";
import EmojiPickerButton from "../components/EmojiPickerButton";
import { fireNotification, requestNotificationPermission } from "../lib/notify";

const DEFAULT_REACTIONS = ["❤️", "😆", "😮", "😢", "😡"];
const REACTIONS_KEY = "ronbri_web_reactions";

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [content, setContent] = useState("");
  const [typing, setTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadingOlderRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  const [imagePreview, setImagePreview] = useState<{ file: File; dataUrl: string } | null>(null);

  // Request notification permission once
  useEffect(() => { requestNotificationPermission(); }, []);

  const [reactionSet, setReactionSet] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(REACTIONS_KEY) ?? "null") ?? DEFAULT_REACTIONS; }
    catch { return DEFAULT_REACTIONS; }
  });

  const saveReactionSet = (rs: string[]) => {
    setReactionSet(rs);
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(rs));
  };

  // Initial load
  useEffect(() => {
    messagesApi.list(undefined, 50).then((data) => {
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor ?? undefined);
    });
  }, []);

  // Socket events
  useEffect(() => {
    const socket = getSocket();

    const onNewMessage = ({ message }: { message: Message }) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.senderId !== user?.id) {
        socket.emit("message:read", { messageId: message.id });
        const senderName = message.sender?.displayName ?? "Someone";
        const body = message.content ?? (message.imageUrl ? "📷 Photo" : message.gifUrl ? "🎞️ GIF" : "New message");
        fireNotification(`${senderName} 💬`, body, "ronbri-chat");
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };

    const onTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId !== user?.id) setPeerTyping(isTyping);
    };

    const onRead = ({ messageId, readAt }: { messageId: string; readAt: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, readAt } : m))
      );
    };

    const onReactions = ({ messageId, reactions }: { messageId: string; reactions: MessageReaction[] }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };

    socket.on("message:new", onNewMessage);
    socket.on("message:typing", onTyping);
    socket.on("message:read", onRead);
    socket.on("message:reactions", onReactions);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:typing", onTyping);
      socket.off("message:read", onRead);
      socket.off("message:reactions", onReactions);
    };
  }, [user]);

  // Auto-scroll on mount
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  const handleTyping = (val: string) => {
    setContent(val);
    const socket = getSocket();
    if (!typing) {
      setTyping(true);
      socket.emit("message:typing", { isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      socket.emit("message:typing", { isTyping: false });
    }, 1500);
  };

  const sendMessage = (data: { content?: string; imageUrl?: string; gifUrl?: string }) => {
    const socket = getSocket();
    socket.emit("message:send", data);
    clearTimeout(typingTimer.current);
    setTyping(false);
    socket.emit("message:typing", { isTyping: false });
  };

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage({ content: content.trim() });
    setContent("");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => setImagePreview({ file, dataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleImageSend = async () => {
    if (!imagePreview) return;
    setUploading(true);
    try {
      const { url } = await uploadApi.image(imagePreview.file);
      sendMessage({ imageUrl: url });
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleGif = (gifUrl: string) => {
    sendMessage({ gifUrl });
    setGifOpen(false);
  };

  const loadOlder = useCallback(async () => {
    if (!hasMore || !cursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    const data = await messagesApi.list(cursor, 50);
    setMessages((prev) => [...data.messages, ...prev]);
    setHasMore(data.hasMore);
    setCursor(data.nextCursor ?? undefined);
    loadingOlderRef.current = false;
  }, [hasMore, cursor]);

  const handleReact = (messageId: string, emoji: string) => {
    getSocket().emit("message:react", { messageId, emoji });
  };

  // Date separator labels
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  // Build messages with date separators
  const renderMessages = () => {
    const items: React.ReactNode[] = [];
    let lastDate: Date | null = null;
    messages.forEach((msg) => {
      const d = new Date(msg.createdAt);
      if (!lastDate || !isSameDay(d, lastDate)) {
        items.push(
          <div key={`sep-${msg.id}`} className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-semibold text-gray-400">{getDateLabel(d)}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        );
        lastDate = d;
      }
      items.push(
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.senderId === user?.id}
          userId={user?.id ?? ""}
          onReact={handleReact}
          reactionSet={reactionSet}
          onUpdateReactionSet={saveReactionSet}
        />
      );
    });
    return items;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3">
        <div className="text-2xl">💬</div>
        <div>
          <div className="font-black text-gray-800">Our Chat</div>
          {peerTyping && (
            <div className="text-xs text-[var(--color-primary)] font-medium animate-pulse">
              {user?.role === "BOY" ? "BriBri" : "Ron Ron"} is typing...{" "}
              {user?.role === "BOY" ? "💛" : "💙"}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={(e) => {
          if ((e.currentTarget as HTMLDivElement).scrollTop === 0) loadOlder();
        }}
      >
        <div ref={topRef} />
        {hasMore && (
          <button
            onClick={loadOlder}
            className="block mx-auto mb-4 text-sm text-gray-400 font-medium"
          >
            Load older messages
          </button>
        )}
        {renderMessages()}
        {peerTyping && (
          <div className="flex items-end gap-2 mb-2">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex gap-1 items-center">
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "100ms" }} />
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "200ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-4"
            onClick={() => !uploading && setImagePreview(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-white rounded-3xl p-4 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-bold text-gray-500 mb-3 text-center">Send this photo?</p>
              <img
                src={imagePreview.dataUrl}
                alt="Preview"
                className="w-full rounded-2xl max-h-72 object-cover"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setImagePreview(null)}
                  disabled={uploading}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImageSend}
                  disabled={uploading}
                  className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {uploading ? "Sending…" : "Send 📤"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 pb-safe">
        <div className="flex items-end gap-2">
          {/* Emoji */}
          <EmojiPickerButton onPick={(em) => setContent((c) => c + em)} />
          {/* GIF */}
          <button
            onClick={() => setGifOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 text-lg font-bold text-gray-500 hover:bg-gray-200 transition-colors"
          >
            GIF
          </button>
          <label
            aria-label="Take photo"
            title="Take photo"
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 text-lg cursor-pointer hover:bg-gray-200 transition-colors"
          >
            📸
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelect}
            />
          </label>
          {/* Image */}
          <label
            aria-label="Choose from gallery"
            title="Choose from gallery"
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 text-lg cursor-pointer hover:bg-gray-200 transition-colors"
          >
            🖼️
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </label>
          {/* Text */}
          <div className="flex-1">
            <input
              value={content}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Type something cute... 💕"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-medium outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!content.trim() && !uploading}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white text-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            ➤
          </button>
        </div>
      </div>

      {/* GIF Picker */}
      <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onSelect={handleGif} />
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  userId: string;
  onReact: (messageId: string, emoji: string) => void;
  reactionSet: string[];
  onUpdateReactionSet: (rs: string[]) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message, isOwn, userId, onReact, reactionSet, onUpdateReactionSet,
}) => {
  const d = new Date(message.createdAt);
  const avatarFallback = message.sender?.displayName?.charAt(0) ?? "R";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customizingIdx, setCustomizingIdx] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group reactions
  const grouped = groupReactions(message.reactions ?? []);

  const openPicker = () => { setPickerOpen(true); setCustomizingIdx(null); setCustomInput(""); };
  const closePicker = () => { setPickerOpen(false); setCustomizingIdx(null); };

  // Touch long-press (mobile web)
  const onTouchStart = () => {
    longPressTimer.current = setTimeout(openPicker, 350);
  };
  const onTouchEnd = () => clearTimeout(longPressTimer.current);

  // Right-click (desktop)
  const onContextMenu = (e: React.MouseEvent) => { e.preventDefault(); openPicker(); };

  const handleReact = (emoji: string) => {
    onReact(message.id, emoji);
    closePicker();
  };

  const commitCustomize = () => {
    if (customizingIdx === null || !customInput.trim()) { setCustomizingIdx(null); return; }
    const newEmoji = [...customInput.trim()][0] ?? customInput.trim();
    const updated = [...reactionSet];
    updated[customizingIdx] = newEmoji;
    onUpdateReactionSet(updated);
    setCustomizingIdx(null);
    setCustomInput("");
  };

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) closePicker();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [pickerOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex mb-2 ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {!isOwn &&
        (message.sender?.avatar ? (
          <img src={message.sender.avatar} alt={message.sender.displayName} className="w-9 h-9 rounded-2xl object-cover border border-gray-100 mr-2 self-end" />
        ) : (
          <div className="w-9 h-9 rounded-2xl bg-[var(--color-light)] text-[var(--color-accent)] flex items-center justify-center font-black mr-2 self-end">
            {avatarFallback}
          </div>
        ))}

      <div ref={containerRef} className="relative max-w-xs md:max-w-sm lg:max-w-md">
        {/* Bubble */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchEnd}
          onContextMenu={onContextMenu}
          className={`rounded-3xl px-4 py-3 shadow-sm select-none cursor-pointer active:scale-95 transition-transform ${
            isOwn ? "bg-[var(--color-primary)] text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm"
          }`}
        >
          {message.content && <p className="font-medium leading-relaxed break-words">{message.content}</p>}
          {message.imageUrl && <img src={message.imageUrl} alt="" className="rounded-2xl max-w-full mt-1" />}
          {message.gifUrl && <img src={message.gifUrl} alt="gif" className="rounded-2xl max-w-full mt-1" />}
        </div>

        {/* Reaction pills */}
        {grouped.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {grouped.map(({ emoji, count, users }) => {
              const isMine = users.includes(userId);
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white shadow text-sm border transition-colors ${
                    isMine ? "border-[var(--color-primary)]" : "border-gray-100"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-xs font-bold text-gray-500">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Meta */}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
          <span className={`text-xs ${isOwn ? "text-gray-400" : "text-gray-300"}`}>{format(d, "h:mm a")}</span>
          {isOwn && (
            <span className={`text-xs font-bold ${message.readAt ? "text-[var(--color-primary)]" : "text-gray-300"}`}>✓✓</span>
          )}
        </div>

        {/* Reaction Picker */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className={`absolute z-50 bottom-full mb-2 ${isOwn ? "right-0" : "left-0"} bg-white rounded-3xl shadow-xl border border-gray-100 p-2`}
            >
              {customizingIdx !== null ? (
                <div className="flex flex-col gap-2 p-1 min-w-[180px]">
                  <p className="text-xs font-bold text-gray-500 text-center">Replace "{reactionSet[customizingIdx]}"</p>
                  <input
                    autoFocus
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Paste emoji"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xl text-center outline-none focus:border-[var(--color-primary)]"
                    maxLength={4}
                  />
                  <div className="flex gap-1">
                    <button onClick={() => setCustomizingIdx(null)} className="flex-1 py-1.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-500">Cancel</button>
                    <button onClick={commitCustomize} className="flex-1 py-1.5 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-0.5">
                  {reactionSet.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleReact(emoji)}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCustomizingIdx(idx); setCustomInput(""); }}
                      className="w-11 h-11 flex items-center justify-center rounded-full text-2xl hover:bg-gray-50 active:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => { setCustomizingIdx(reactionSet.length - 1); setCustomInput(""); }}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 font-bold text-base hover:bg-gray-200 transition-colors"
                  >
                    ＋
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isOwn &&
        (message.sender?.avatar ? (
          <img src={message.sender.avatar} alt={message.sender.displayName} className="w-9 h-9 rounded-2xl object-cover border border-gray-100 ml-2 self-end" />
        ) : (
          <div className="w-9 h-9 rounded-2xl bg-[var(--color-light)] text-[var(--color-accent)] flex items-center justify-center font-black ml-2 self-end">
            {avatarFallback}
          </div>
        ))}
    </motion.div>
  );
};

function groupReactions(reactions: MessageReaction[]) {
  const map = new Map<string, { count: number; users: string[] }>();
  for (const r of reactions) {
    const e = map.get(r.emoji);
    if (e) { e.count++; e.users.push(r.userId); }
    else map.set(r.emoji, { count: 1, users: [r.userId] });
  }
  return Array.from(map.entries()).map(([emoji, { count, users }]) => ({ emoji, count, users }));
}

export default ChatPage;

