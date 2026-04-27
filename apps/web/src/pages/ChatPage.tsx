import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { messagesApi, uploadApi, giphyApi } from "@ronbri/api-client";
import { getSocket } from "@ronbri/api-client";
import type { Message, PaginatedMessages } from "@ronbri/types";
import { useAuth } from "../contexts/AuthContext";
import GifPicker from "../components/GifPicker";
import EmojiPickerButton from "../components/EmojiPickerButton";

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
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const loadingOlderRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

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
      // Mark as read if we're the receiver
      if (message.senderId !== user?.id) {
        socket.emit("message:read", { messageId: message.id });
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

    socket.on("message:new", onNewMessage);
    socket.on("message:typing", onTyping);
    socket.on("message:read", onRead);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:typing", onTyping);
      socket.off("message:read", onRead);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadApi.image(file);
      sendMessage({ imageUrl: url });
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
      items.push(<MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.id} />);
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
              onChange={handleImageUpload}
            />
          </label>
          {/* Image */}
          <label
            aria-label="Choose from gallery"
            title="Choose from gallery"
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 text-lg cursor-pointer hover:bg-gray-200 transition-colors"
          >
            🖼️
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
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

const MessageBubble: React.FC<{ message: Message; isOwn: boolean }> = ({ message, isOwn }) => {
  const [hovered, setHovered] = useState(false);
  const d = new Date(message.createdAt);
  const avatarFallback = message.sender?.displayName?.charAt(0) ?? "R";

  return (
    <motion.div
      initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex mb-2 ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {!isOwn &&
        (message.sender?.avatar ? (
          <img
            src={message.sender.avatar}
            alt={message.sender.displayName}
            className="w-9 h-9 rounded-2xl object-cover border border-gray-100 mr-2 self-end"
          />
        ) : (
          <div className="w-9 h-9 rounded-2xl bg-[var(--color-light)] text-[var(--color-accent)] flex items-center justify-center font-black mr-2 self-end">
            {avatarFallback}
          </div>
        ))}
      <div
        className={`max-w-xs md:max-w-sm lg:max-w-md`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={`rounded-3xl px-4 py-3 shadow-sm ${
            isOwn
              ? "bg-[var(--color-primary)] text-white rounded-br-sm"
              : "bg-white text-gray-800 rounded-bl-sm"
          }`}
        >
          {message.content && (
            <p className="font-medium leading-relaxed">{message.content}</p>
          )}
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt=""
              className="rounded-2xl max-w-full mt-1"
            />
          )}
          {message.gifUrl && (
            <img src={message.gifUrl} alt="gif" className="rounded-2xl max-w-full mt-1" />
          )}
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
          <span className={`text-xs ${isOwn ? "text-gray-400" : "text-gray-300"}`}>
            {hovered ? format(d, "h:mm a") : format(d, "h:mm a")}
          </span>
          {isOwn && (
            <span
              className={`text-xs font-bold ${message.readAt ? "text-[var(--color-primary)]" : "text-gray-300"}`}
            >
              {message.readAt ? "✓✓" : "✓✓"}
            </span>
          )}
        </div>
      </div>
      {isOwn &&
        (message.sender?.avatar ? (
          <img
            src={message.sender.avatar}
            alt={message.sender.displayName}
            className="w-9 h-9 rounded-2xl object-cover border border-gray-100 ml-2 self-end"
          />
        ) : (
          <div className="w-9 h-9 rounded-2xl bg-[var(--color-light)] text-[var(--color-accent)] flex items-center justify-center font-black ml-2 self-end">
            {avatarFallback}
          </div>
        ))}
    </motion.div>
  );
};

export default ChatPage;
