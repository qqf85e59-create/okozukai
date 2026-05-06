"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type ThemeId, DEFAULT_THEME_ID } from "@/themes/registry";

const STORAGE_KEY = "okozukai.themeId";

type ThemeCtx = { themeId: ThemeId; setThemeId: (id: ThemeId) => void };
const ThemeContext = createContext<ThemeCtx>({ themeId: DEFAULT_THEME_ID, setThemeId: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const initial = saved ?? DEFAULT_THEME_ID;
    setThemeIdState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.setAttribute("data-theme", id);
  };

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
