import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import InvitePopup from "../components/InvitePopup";
import AIDrawer from "../components/AIDrawer";

const navItems = [
  { to: "/", label: "Home", emoji: "🏠", end: true },
  { to: "/chat", label: "Chat", emoji: "💬", end: false },
  { to: "/calendar", label: "Calendar", emoji: "📅", end: false },
  { to: "/invites", label: "Invites", emoji: "💌", end: false },
  { to: "/profile", label: "Profile", emoji: "👤", end: false },
];

const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.displayName} className="w-12 h-12 rounded-2xl object-cover border border-gray-100" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-light)] text-[var(--color-accent)] flex items-center justify-center font-black text-lg">
                {user?.displayName?.charAt(0) ?? "R"}
              </div>
            )}
            <div>
              <div className="text-2xl font-black text-gray-800">RonBri</div>
              <div className="text-sm text-gray-400 mt-1">
                {user?.displayName}{" "}
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 ml-1" />
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all ${
                  isActive
                    ? "bg-[var(--color-light)] text-[var(--color-accent)]"
                    : "text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              <span className="text-xl">{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-500 font-semibold transition-all"
          >
            <span className="text-xl">👋</span>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <motion.div
          className="flex-1 overflow-auto"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Bottom tab bar — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-40 safe-area-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                isActive ? "text-[var(--color-accent)]" : "text-gray-400"
              }`
            }
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-xs font-semibold">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* AI FAB */}
      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
        aria-label="Open AI assistant"
      >
        🤖
      </button>

      {/* AI Drawer */}
      <AIDrawer open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* Invite Popup */}
      <InvitePopup />
    </div>
  );
};

export default AppLayout;
