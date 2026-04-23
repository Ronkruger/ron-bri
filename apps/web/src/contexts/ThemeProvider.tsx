import React, { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { Role } from "@ronbri/types";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    if (user?.role === Role.GIRL) {
      root.setAttribute("data-theme", "girl");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [user]);

  return <>{children}</>;
};
