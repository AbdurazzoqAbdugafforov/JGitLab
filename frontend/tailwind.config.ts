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
        // GitHub / Stripe Deep Slate palette
        slate: {
          950: "#0A0D14", // Deepest canvas
          900: "#0D1117", // Primary surface
          850: "#161B22", // Card / Panel
          800: "#1F242C", // Hover / Active panel
          750: "#262C36", // Border subtle
          700: "#30363D", // Border default
          600: "#484F58", // Border strong
          500: "#6E7681", // Muted
          400: "#8B949E", // Secondary text
          300: "#C9D1D9", // Primary body text
          200: "#E6EDF3",
          100: "#F0F6FC", // Crisp white heading
        },
        // Backward-compatibility aliases
        charcoal: {
          950: "#0A0D14",
          900: "#0D1117",
          850: "#161B22",
          800: "#1F242C",
          700: "#30363D",
          600: "#484F58",
          500: "#6E7681",
        },
        obsidian: {
          950: "#0A0D14",
          900: "#0D1117",
          850: "#161B22",
          800: "#1F242C",
          750: "#262C36",
          700: "#30363D",
          600: "#484F58",
          500: "#6E7681",
        },
        // Royal Tech Blue (GitHub / Stripe Accent)
        brand: {
          DEFAULT: "#1F6FEB",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#388BFD",
          600: "#1F6FEB",
          700: "#1A56DB",
          800: "#1E429F",
          900: "#1E3A8A",
        },
        blue: {
          DEFAULT: "#1F6FEB",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#388BFD",
          600: "#1F6FEB",
          700: "#1A56DB",
          800: "#1E429F",
          900: "#1E3A8A",
        },
        border: "#30363D",
        muted: "#8B949E",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -4px rgba(31, 111, 235, 0.35)",
        blueGlow: "0 0 24px -4px rgba(31, 111, 235, 0.45)",
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
        card: "0 8px 24px -4px rgba(0, 0, 0, 0.55)",
        stripe: "0 2px 5px rgba(0,0,0,0.4), 0 10px 25px rgba(0,0,0,0.3)",
        btn: "0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)",
      }
    },
  },
  plugins: [],
};

export default config;
