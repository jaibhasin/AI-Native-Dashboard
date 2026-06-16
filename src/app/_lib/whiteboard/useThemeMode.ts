"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "@/app/_lib/whiteboard/constants";
import { preferredTheme } from "@/app/_lib/whiteboard/theme";
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
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [hasHydratedTheme, theme]);

  return [theme, setTheme] as const;
}
