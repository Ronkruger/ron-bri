import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"boy" | "girl" | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCardClick = (who: "boy" | "girl") => {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-black text-gray-800 mb-2">RonBri 💙💛</h1>
        <p className="text-gray-500 font-medium">Who are you?</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
        {/* Ron Ron Card */}
        <motion.button
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleCardClick("boy")}
          className={`flex-1 rounded-4xl p-8 cursor-pointer transition-all shadow-lg border-4 ${
            selected === "boy"
              ? "border-blue-500 bg-blue-50 shadow-blue-200"
              : "border-transparent bg-white hover:border-blue-200"
          }`}
        >
          <div className="text-6xl mb-4">💙</div>
          <div className="text-2xl font-black text-blue-600">Ron Ron</div>
          <div className="text-sm text-blue-400 mt-1 font-medium">That's my babe</div>
        </motion.button>

        {/* BriBri Card */}
        <motion.button
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleCardClick("girl")}
          className={`flex-1 rounded-4xl p-8 cursor-pointer transition-all shadow-lg border-4 ${
            selected === "girl"
              ? "border-yellow-400 bg-yellow-50 shadow-yellow-200"
              : "border-transparent bg-white hover:border-yellow-200"
          }`}
        >
          <div className="text-6xl mb-4">💛</div>
          <div className="text-2xl font-black text-yellow-500">BriBri</div>
          <div className="text-sm text-yellow-400 mt-1 font-medium">That's my girl</div>
        </motion.button>
      </div>

      {/* Password Input */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="password-form"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 32 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="w-full max-w-sm"
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Enter your password, ${selected === "boy" ? "Ron Ron" : "BriBri"} 🔒`}
                className={`w-full rounded-2xl px-5 py-4 text-center text-lg font-bold border-2 outline-none transition-all ${
                  selected === "boy"
                    ? "border-blue-300 focus:border-blue-500 bg-blue-50"
                    : "border-yellow-300 focus:border-yellow-400 bg-yellow-50"
                }`}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-center font-medium"
                >
                  {error}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={loading || !password}
                className={`w-full rounded-2xl py-4 font-black text-lg text-white transition-all ${
                  selected === "boy"
                    ? "bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300"
                    : "bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200"
                }`}
              >
                {loading ? "Logging in..." : "Let me in 🏠"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
