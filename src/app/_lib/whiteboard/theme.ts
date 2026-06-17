import { THEME_STORAGE_KEY } from "./constants";
import type { ThemeMode } from "./types";

export function storedThemePreference(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return null;
}

export function systemTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function preferredTheme(): ThemeMode {
  return storedThemePreference() ?? systemTheme();
}
