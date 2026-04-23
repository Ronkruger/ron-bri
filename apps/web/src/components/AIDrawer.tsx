import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { aiApi } from "@ronbri/api-client";
import type { AIChatMessage } from "@ronbri/types";

interface AIDrawerProps {
  open: boolean;
  onClose: () => void;
}

const AIDrawer: React.FC<AIDrawerProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const systemPrompt: AIChatMessage = {
    role: "system",
    content: `You are a sweet, helpful AI assistant for a couple named Ron Ron (boyfriend) and BriBri (girlfriend).
Help them plan dates, suggest romantic activities, answer questions, and be a supportive, cheerful companion.
Keep responses warm, playful, and concise. Use cute emojis occasionally. 🌸
Current user: ${user?.displayName ?? "unknown"}`,
  };

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: AIChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const assistantMsg: AIChatMessage = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    abortRef.current = new AbortController();
    try {
      const res = await aiApi.chat({ messages: [systemPrompt, ...newMessages] });
      if (!res.ok || !res.body) {
        throw new Error("AI response failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, content: last.content + delta };
                  return updated;
                });
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 10);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Oops, something went wrong! 😅 Try again?" };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (!open) {
      // Clear conversation on close
      abortRef.current?.abort();
      setMessages([]);
      setInput("");
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="text-2xl">🤖</div>
              <div className="flex-1">
                <div className="font-black text-gray-800">AI Assistant</div>
                <div className="text-xs text-gray-400">Your couples companion 🌸</div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 font-medium mt-8">
                  <div className="text-5xl mb-3">🌸</div>
                  <p>Ask me anything!</p>
                  <p className="text-sm mt-1">Date ideas, questions, anything 💕</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[var(--color-primary)] text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {msg.content || (streaming && i === messages.length - 1 ? (
                      <span className="animate-pulse">...</span>
                    ) : "")}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Ask something cute..."
                  disabled={streaming}
                  className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 font-medium outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                  className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white text-xl disabled:opacity-50 hover:opacity-90"
                >
                  ➤
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIDrawer;
