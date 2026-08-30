import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  House,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeProvider";
import InvitePopup from "../components/InvitePopup";
import AIDrawer from "../components/AIDrawer";
import { Avatar, Button } from "../components/ui";
import { notification } from "../components/AppToaster";

const navItems = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/chat", label: "Chat", icon: MessageCircle, end: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, end: false },
  { to: "/invites", label: "Invites", icon: Mail, end: false },
  { to: "/profile", label: "Profile", icon: UserRound, end: false },
];

const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      notification.success("You have been signed out.");
      navigate("/login");
    } catch (caughtError) {
      notification.fromError(caughtError, "Could not sign out. Please try again.");
    }
  };

  return (
    <div className="darwin-shell flex min-h-screen">
      <aside className="darwin-sidebar hidden md:flex w-72 shrink-0 flex-col border-r">
        <div className="border-b p-6" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar} name={user?.displayName} size="md" />
            <div className="min-w-0">
              <div className="truncate text-lg font-extrabold tracking-tight">RonBri</div>
              <div className="mt-0.5 flex items-center gap-2 truncate text-xs font-medium text-gray-500">
                {user?.displayName}
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Online" />
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="Primary navigation">
          <p className="ui-eyebrow px-3 pb-2 pt-1">Workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-[var(--color-light)] text-[var(--color-accent)]"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`
                }
              >
                <Icon size={18} strokeWidth={2.2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-2 border-t p-4" style={{ borderColor: "var(--line)" }}>
          <Button
            variant="ghost"
            fullWidth
            onClick={toggleMode}
            leftIcon={mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            className="justify-start text-gray-500"
            aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
          >
            {mode === "dark" ? "Light appearance" : "Dark appearance"}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={handleLogout}
            leftIcon={<LogOut size={17} />}
            className="justify-start text-gray-500 hover:text-red-500"
          >
            Log out
          </Button>
        </div>
      </aside>

      <main className="darwin-main flex flex-1 flex-col overflow-hidden">
        <motion.div
          className="darwin-content flex-1 overflow-auto"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="darwin-dock fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t px-1 py-2 md:hidden safe-area-bottom" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-bold transition-colors ${
                  isActive ? "text-[var(--color-accent)]" : "text-gray-400"
                }`
              }
            >
              <Icon size={20} strokeWidth={2.2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-bold text-gray-400 transition-colors hover:text-red-500"
          aria-label="Log out"
        >
          <LogOut size={20} strokeWidth={2.2} />
          <span>Log out</span>
        </button>
      </nav>

      <Button
        variant="primary"
        iconOnly
        onClick={() => setAiOpen(true)}
        className="ai-pet-button fixed bottom-20 right-5 z-50 h-12 w-12 rounded-2xl shadow-xl md:bottom-6 md:right-6"
        aria-label="Open AI assistant"
      >
        <Bot size={21} />
      </Button>

      <AIDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
      <InvitePopup />
    </div>
  );
};

export default AppLayout;
