import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

import { CATEGORY_COLOR_MAP } from "./config/category-colors";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#007CF0",
          green: "#22C55E",
          darkBg: "#0B1943",
          midnight: "#081134",
        },
        lightBg: "#F5F7FF",
        lightBorder: "#E2E8F0",
        darkSurface: "#1F2937",
        darkBorder: "#374151",
        error: {
          DEFAULT: "#EF4444",
          foreground: "#450A0A",
        },
        text: {
          primary: "#081134",
          light: "#F9FAFB",
          mutedLight: "#475569",
          mutedDark: "#94A3B8",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          from: "hsl(var(--primary-gradient-from))",
          to: "hsl(var(--primary-gradient-to))",
        },
        "primary-dark": {
          from: "hsl(var(--primary-dark-from))",
          to: "hsl(var(--primary-dark-to))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--border))",
        ring: "hsl(var(--primary-gradient-to))",
        background: "hsl(var(--background))",
        panel: "hsl(var(--panel))",
        "panel-subtle": "hsl(var(--panel-subtle))",
        foreground: "hsl(var(--text-primary))",
        textPrimary: "hsl(var(--text-primary))",
        textSecondary: "hsl(var(--text-secondary))",
        textMuted: "hsl(var(--text-muted))",
        iconPrimary: "hsl(var(--icon-primary))",
        iconSecondary: "hsl(var(--icon-secondary))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--panel))",
          foreground: "hsl(var(--text-primary))",
        },
        card: {
          DEFAULT: "hsl(var(--panel))",
          foreground: "hsl(var(--text-primary))",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#450A0A",
        },
        success: {
          DEFAULT: "#22C55E",
          foreground: "#052E16",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#451A03",
        },
        categories: CATEGORY_COLOR_MAP,
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(90deg, #007CF0 0%, #22C55E 100%)",
        "gradient-card-light":
          "linear-gradient(180deg, rgba(0,124,240,0.03) 0%, rgba(34,197,94,0.04) 100%)",
        "gradient-card-dark":
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.03) 100%)",
        "gradient-hero": "linear-gradient(135deg, rgba(11, 25, 67, 0.6) 0%, rgba(34, 197, 94, 0.24) 100%)",
      },
      boxShadow: {
        focusBlue: "0 0 0 2px rgba(0,124,240,0.5)",
        focusGreen: "0 0 0 2px rgba(34,197,94,0.55)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        DEFAULT: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        card: "0.75rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      textColor: {
        "gradient-primary": "transparent",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
