import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "conjex-theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

export function readInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage unavailable (private mode etc.) — fall through to system preference.
  }
  return window.matchMedia?.(LIGHT_QUERY).matches ? "light" : "dark";
}

/**
 * Theme controller. The data-theme attribute is set on <html> so both React
 * and the pre-paint bootstrap script in index.html share one source of truth.
 */
export function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Persisting is best-effort only.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
