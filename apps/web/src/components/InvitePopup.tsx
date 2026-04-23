import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import { invitesApi } from "@ronbri/api-client";
import { getSocket } from "@ronbri/api-client";
import type { DateInvite } from "@ronbri/types";
import { InviteStatus } from "@ronbri/types";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";

// Inline minimal envelope Lottie JSON (open envelope animation)
// In production, replace with a proper Lottie JSON from lottiefiles.com
const ENVELOPE_LOTTIE = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: "Envelope",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "envelope",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] }, t: 0, s: [0] }, { t: 60, s: [360] }] },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ i: { x: [0.5], y: [1.5] }, o: { x: [0.5], y: [0] }, t: 0, s: [0, 0, 100] }, { t: 30, s: [120, 120, 100] }, { t: 60, s: [100, 100, 100] }] },
      },
      ao: 0,
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [120, 80] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 12 },
          nm: "body",
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.98, 0.83, 0.16, 1] },
          o: { a: 0, k: 100 },
          r: 1,
          nm: "fill",
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
};

const InvitePopup: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [queue, setQueue] = useState<DateInvite[]>([]);
  const [current, setCurrent] = useState<DateInvite | null>(null);
  const [stage, setStage] = useState<"envelope" | "card">("envelope");
  const [responded, setResponded] = useState(false);

  // Check for pending unseen invites on mount
  useEffect(() => {
    if (!user) return;
    invitesApi.inbox().then((invites) => {
      const unseen = invites.filter(
        (i) => i.status === InviteStatus.PENDING && !i.seenAt
      );
      if (unseen.length > 0) {
        setQueue(unseen);
      }
    });
  }, [user]);

  // Listen for real-time invite:new
  useEffect(() => {
    const socket = getSocket();
    const onInviteNew = ({ invite }: { invite: DateInvite }) => {
      setQueue((prev) => [...prev, invite]);
    };
    socket.on("invite:new", onInviteNew);
    return () => { socket.off("invite:new", onInviteNew); };
  }, []);

  // Dequeue
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setCurrent(next);
      setStage("envelope");
      setResponded(false);
      // Mark as seen
      invitesApi.seen(next.id);
    }
  }, [queue, current]);

  const dismiss = () => setCurrent(null);

  const handleRespond = async (status: "ACCEPTED" | "DECLINED") => {
    if (!current) return;
    setResponded(true);
    await invitesApi.respond(current.id, { status: status as any });
    qc.invalidateQueries({ queryKey: ["invites"] });
    setTimeout(dismiss, 1200);
  };

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="invite-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <AnimatePresence mode="wait">
          {stage === "envelope" ? (
            <motion.div
              key="envelope"
              initial={{ y: 300, scale: 0.5, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="flex flex-col items-center gap-6 cursor-pointer"
              onClick={() => setStage("card")}
            >
              <div className="w-48 h-48">
                <Lottie animationData={ENVELOPE_LOTTIE} loop={false} />
              </div>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-white font-bold text-lg"
              >
                Tap to open 💌
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 18 }}
              className="bg-white rounded-4xl w-full max-w-sm p-8 shadow-2xl text-center"
            >
              {/* Wax seal pop */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10, delay: 0.2 }}
                className="text-5xl mb-4"
              >
                💌
              </motion.div>

              <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] mb-2">
                {current.sender.displayName} sent you a date invite
              </div>
              <div className="text-xl font-black text-gray-800 mb-3">{current.title}</div>
              <p className="text-gray-600 leading-relaxed mb-4">{current.message}</p>

              {current.emojis.length > 0 && (
                <div className="text-3xl mb-4">{current.emojis.join(" ")}</div>
              )}

              {current.gifUrl && (
                <img src={current.gifUrl} alt="gif" className="rounded-2xl mx-auto mb-4 max-h-36 object-cover" />
              )}
              {current.imageUrl && (
                <img src={current.imageUrl} alt="" className="rounded-2xl mx-auto mb-4 max-h-36 object-cover" />
              )}

              {!responded ? (
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => handleRespond("ACCEPTED")}
                    className="flex-1 py-3 rounded-2xl bg-green-100 text-green-700 font-black text-lg hover:bg-green-200"
                  >
                    💚 Accept
                  </button>
                  <button
                    onClick={() => handleRespond("DECLINED")}
                    className="flex-1 py-3 rounded-2xl bg-red-50 text-red-500 font-black text-lg hover:bg-red-100"
                  >
                    💔 Decline
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-4xl py-3"
                >
                  ✨
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default InvitePopup;
