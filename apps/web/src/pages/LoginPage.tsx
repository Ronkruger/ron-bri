import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

const sparkles = [
  { top: "8%", left: "12%", size: 28, delay: 0 },
  { top: "15%", left: "78%", size: 18, delay: 0.3 },
  { top: "30%", left: "5%", size: 14, delay: 0.6 },
  { top: "60%", left: "88%", size: 22, delay: 0.2 },
  { top: "75%", left: "70%", size: 16, delay: 0.5 },
  { top: "80%", left: "18%", size: 20, delay: 0.8 },
  { top: "45%", left: "92%", size: 12, delay: 0.4 },
  { top: "20%", left: "55%", size: 10, delay: 0.7 },
];

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"boy" | "girl" | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelect = (who: "boy" | "girl") => {
    setSelected(who);
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const username = selected === "boy" ? "ronron" : "bribri";
      await login(username, password);
      navigate("/");
    } catch {
      setError("Wrong password. Try again! 💔");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f9c0e0 0%, #e8d5f5 40%, #c9d8f5 100%)" }}
    >
      {/* Sparkle decorations */}
      {sparkles.map((s, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none select-none text-yellow-400"
          style={{ top: s.top, left: s.left, fontSize: s.size }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9], rotate: [0, 20, -20, 0] }}
          transition={{ duration: 3 + s.delay, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        >
          ✦
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-2xl px-10 py-12 w-full max-w-sm mx-4 flex flex-col items-center gap-5"
      >
        <div className="text-3xl">✦</div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Babi Time</h1>
        <p className="text-gray-500 text-center text-sm font-medium -mt-2">
          Choose your side to enter your shared love space.
        </p>

        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3 w-full"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect("boy")}
                className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base transition-colors"
              >
                Login as Ronron
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect("girl")}
                className="w-full py-4 rounded-2xl font-bold text-base transition-colors text-white"
                style={{ background: "#d4a017" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#b8880f")}
                onMouseLeave={e => (e.currentTarget.style.background = "#d4a017")}
              >
                Login as Bribri
              </motion.button>
            </motion.div>
          ) : (
            <motion.form
              key="password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 w-full"
            >
              <p className="text-center text-sm font-semibold text-gray-600">
                {selected === "boy" ? "💙 Ronron" : "💛 Bribri"} — enter your password
              </p>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password 🔒"
                className={`w-full rounded-2xl px-5 py-4 text-center text-base font-bold border-2 outline-none transition-all ${
                  selected === "boy"
                    ? "border-blue-300 focus:border-blue-500 bg-blue-50"
                    : "border-yellow-300 focus:border-yellow-500 bg-yellow-50"
                }`}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-center text-sm font-medium"
                >
                  {error}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={loading || !password}
                className={`w-full rounded-2xl py-4 font-bold text-base text-white transition-all ${
                  selected === "boy"
                    ? "bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300"
                    : "bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300"
                }`}
              >
                {loading ? "Logging in..." : "Let me in 🏠"}
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
              >
                ← Go back
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default LoginPage;
