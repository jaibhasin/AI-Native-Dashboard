"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { THEME_STORAGE_KEY } from "@/app/_lib/whiteboard/constants";
import { preferredTheme, storedThemePreference } from "@/app/_lib/whiteboard/theme";
import type { ThemeMode } from "@/app/_lib/whiteboard/types";

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [hasHydratedTheme, setHasHydratedTheme] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTheme(preferredTheme());
      setHasHydratedTheme(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasHydratedTheme) {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [hasHydratedTheme, theme]);

  useEffect(() => {
    if (!hasHydratedTheme || storedThemePreference()) {
      return;
    }

    const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (storedThemePreference()) {
        return;
      }

      setTheme(event.matches ? "dark" : "light");
    };

    themeQuery.addEventListener("change", handleSystemThemeChange);

    return () => themeQuery.removeEventListener("change", handleSystemThemeChange);
  }, [hasHydratedTheme]);

  const setThemePreference = useCallback((themeAction: SetStateAction<ThemeMode>) => {
    setTheme((currentTheme) => {
      const nextTheme = typeof themeAction === "function" ? themeAction(currentTheme) : themeAction;

      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);

      return nextTheme;
    });
  }, []);

  return [theme, setThemePreference] as const;
}
