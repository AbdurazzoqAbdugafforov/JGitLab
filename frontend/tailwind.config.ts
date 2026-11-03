import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        charcoal: {
          950: "#04060E",
          900: "#090E1E",
          850: "#0E152C",
          800: "#141D3B",
          700: "#1C284F",
          600: "#273668",
          500: "#354885",
        },
        violet: {
          DEFAULT: "#8B5CF6",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
        },
        border: "rgba(255, 255, 255, 0.08)",
        muted: "rgba(255, 255, 255, 0.45)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(139, 92, 246, 0.35)",
        cyanGlow: "0 0 20px -5px rgba(6, 182, 212, 0.35)",
      }
    },
  },
  plugins: [],
};

export default config;
