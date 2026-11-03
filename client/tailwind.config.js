/** @type {import('tailwindcss').Config} */
export default {
  // "class" strategy: dark mode is controlled by the "dark" class on <html>.
  // This lets the user switch without a page reload and avoids the FOUC
  // that the prefers-color-scheme media-query strategy can cause.
  darkMode: "class",

  content: ["./index.html", "./src/**/*.{js,jsx}"],

  theme: {
    extend: {
      fontFamily: {
        // Inter is cleaner than the browser default for a productivity tool.
        sans: ["Inter", "sans-serif"],
      },

      colors: {
        // Map CSS variables → Tailwind utilities so we can write
        // bg-surface, text-muted, border-token, etc.
        // The `DEFAULT` key lets us use `bg-bg` (short form).
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-hover": "var(--color-surface-hover)",
        border: "var(--color-border)",
        token: {
          text: "var(--color-text)",
          muted: "var(--color-text-muted)",
          accent: "var(--color-accent)",
          "accent-text": "var(--color-accent-text)",
        },
      },

      borderRadius: {
        xl:  "0.75rem",
        "2xl": "1rem",
      },

      boxShadow: {
        card:       "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)",
      },

      transitionDuration: {
        // 150-200ms per the design spec — snappy but not jarring.
        DEFAULT: "150ms",
      },
    },
  },

  plugins: [],
};
