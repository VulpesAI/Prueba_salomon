import type { Config } from "tailwindcss";
import tailwindcssForms from "@tailwindcss/forms";
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
          },
          app: {
            DEFAULT: "var(--text)",
            bg: "var(--bg)",
            surface: "var(--surface)",
            "surface-subtle": "var(--surface-subtle)",
            card: "var(--card-surface)",
          "card-subtle": "var(--card-subtle)",
          border: "var(--border-color)",
          "border-subtle": "var(--border-subtle)",
          text: "var(--text)",
          dim: "var(--text-muted)",
          accent: "var(--accent)",
          "accent-contrast": "var(--accent-contrast)",
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)",
        },
        surface: {
          dark: "#1F2937",
        },
        border: {
          DEFAULT: "hsl(var(--border) / <alpha-value>)",
          light: "#E2E8F0",
          dark: "#123A68",
        },
        error: {
          DEFAULT: "#EF4444",
          foreground: "#450A0A",
        },
        textpal: {
          light: "#081134",
          mutedL: "#475569",
          dark: "#F5F7FF",
          mutedD: "#94A3B8",
          inverse: "#F9FAFB",
        },
        lightBg: "#F5F7FF",
        lightBorder: "#E2E8F0",
        darkSurface: "#1F2937",
        darkBorder: "#123A68",
        text: {
          primary: "#081134",
          light: "#F9FAFB",
          mutedLight: "#475569",
          mutedDark: "#94A3B8",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          from: "hsl(var(--primary-from))",
          to: "hsl(var(--primary-to))",
        },
        "primary-dark": {
          from: "hsl(var(--primary-dark-from))",
          to: "hsl(var(--primary-dark-to))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--primary-to) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        panel: "hsl(var(--panel) / <alpha-value>)",
        "panel-subtle": "hsl(var(--panel-subtle) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        textPrimary: "hsl(var(--text-primary))",
        textSecondary: "hsl(var(--text-secondary))",
        textMuted: "hsl(var(--text-muted))",
        iconPrimary: "hsl(var(--icon-primary))",
        iconSecondary: "hsl(var(--icon-secondary))",
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
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
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
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
        "primary-from": "hsl(var(--primary-from) / <alpha-value>)",
        "primary-to": "hsl(var(--primary-to) / <alpha-value>)",
        "primary-dark-from": "hsl(var(--primary-dark-from) / <alpha-value>)",
        "primary-dark-to": "hsl(var(--primary-dark-to) / <alpha-value>)",
      },
      gradientColorStops: {
        "primary-from": "hsl(var(--primary-from))",
        "primary-via": "hsl(var(--primary-via))",
        "primary-to": "hsl(var(--primary-to))",
        "primary-dark-from": "hsl(var(--primary-dark-from))",
        "primary-dark-to": "hsl(var(--primary-dark-to))",
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(90deg, hsl(var(--primary-from)) 0%, hsl(var(--primary-via)) 50%, hsl(var(--primary-to)) 100%)",
        "gradient-card-light":
          "linear-gradient(180deg, rgba(0,124,240,0.03) 0%, rgba(6,182,212,0.04) 100%)",
        "gradient-card-dark":
          "linear-gradient(180deg, rgba(18,58,104,0.35) 0%, rgba(42,58,85,0.15) 100%)",
        "section-light":
          "linear-gradient(180deg, #F5F7FF 0%, #E6F3FF 45%, #E9FFF4 100%)",
        "section-dark":
          "linear-gradient(180deg, #0B1943 0%, #123A68 50%, #06B6D4 100%)",
        "gradient-hero": "linear-gradient(135deg, rgba(11, 25, 67, 0.85) 0%, rgba(6, 182, 212, 0.35) 100%)",
      },
      boxShadow: {
        focusBlue: "0 0 0 2px rgba(0,124,240,0.5)",
        focusGreen: "0 0 0 2px rgba(6,182,212,0.55)",
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
  plugins: [tailwindcssForms, tailwindcssAnimate],
} satisfies Config;

export default config;
