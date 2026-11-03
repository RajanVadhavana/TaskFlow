import { useState, useEffect, useCallback } from "react";

/**
 * useTheme
 *
 * Reads the current theme from the <html> class (set by the inline script in
 * index.html) rather than from a separate React state.  This makes <html> the
 * single source of truth and avoids the one-frame flicker you'd get if React
 * state initialised first.
 *
 * @returns {{ isDark: boolean, toggle: () => void }}
 */
export function useTheme() {
  // Read initial state from the class the inline script already set.
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  // After the first paint, remove the no-transitions guard so future toggles
  // are animated.  Using useEffect guarantees this runs after the browser has
  // painted the page.
  useEffect(() => {
    const html = document.documentElement;
    // Small timeout so the browser has time to paint before we re-enable
    // transitions.  Without this the very first render can still flash.
    const id = setTimeout(() => {
      html.classList.remove("no-transitions");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      const html = document.documentElement;

      if (next) {
        html.classList.add("dark");
        html.style.colorScheme = "dark";
      } else {
        html.classList.remove("dark");
        html.style.colorScheme = "light";
      }

      // Persist so the inline script reads it on the next page load.
      try {
        localStorage.setItem("taskflow-theme", next ? "dark" : "light");
      } catch (_) {
        // Storage blocked (e.g. Safari private mode) — ignore.
      }

      return next;
    });
  }, []);

  return { isDark, toggle };
}
