import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { Role } from "@ronbri/types";
import type { ThemeMode } from "@ronbri/ui-tokens";

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = window.localStorage.getItem("ronbri-theme-mode");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mode = mode;
    root.classList.toggle("dark", mode === "dark");
    if (user?.role === Role.GIRL) {
      root.setAttribute("data-theme", "girl");
    } else if (user?.role === Role.BOY) {
      root.setAttribute("data-theme", "boy");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [mode, user]);

  const toggleMode = () => {
    setMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("ronbri-theme-mode", next);
      return next;
    });
  };

  return <ThemeContext.Provider value={{ mode, toggleMode }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
};
