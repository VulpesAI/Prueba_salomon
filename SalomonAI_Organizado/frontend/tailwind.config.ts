import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const palette = {
  primary: {
    DEFAULT: "#743DFF",
    foreground: "#F5F7FF",
    from: "#743DFF",
    to: "#007CF0",
  },
  secondary: {
    DEFAULT: "#081134",
    foreground: "#F5F7FF",
  },
  neutral: {
    light: {
      background: "#F5F7FF",
      surface: "#FFFFFF",
      subtle: "#F1F5F9",
      muted: "#E2E8F0",
      "muted-foreground": "#475569",
      border: "#CBD5E1",
      foreground: "#081134",
    },
    dark: {
      background: "#0B1943",
      surface: "#1F2937",
      subtle: "#1F2937",
      muted: "#374151",
      "muted-foreground": "#E2E8F0",
      border: "#374151",
      foreground: "#F9FAFB",
    },
  },
  success: {
    DEFAULT: "#22C55E",
    foreground: "#052E16",
  },
  warning: {
    DEFAULT: "#F59E0B",
    foreground: "#451A03",
  },
  error: {
    DEFAULT: "#EF4444",
    foreground: "#450A0A",
  },
  categories: {
    vivienda: "#4F46E5",
    alimentacion: "#F97316",
    transporte: "#22D3EE",
    servicios: "#0EA5E9",
    suscripciones: "#8B5CF6",
    salud: "#F43F5E",
    ingresos: "#22C55E",
    educacion: "#FBBF24",
    entretenimiento: "#EC4899",
    ahorro: "#14B8A6",
  },
} as const;

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
        ...palette,
        border: palette.neutral.light.border,
        input: palette.neutral.light.border,
        ring: palette.primary.to,
        background: palette.neutral.light.background,
        foreground: palette.neutral.light.foreground,
        muted: {
          DEFAULT: palette.neutral.light.muted,
          foreground: palette.neutral.light["muted-foreground"],
        },
        accent: {
          DEFAULT: palette.primary.DEFAULT,
          foreground: palette.primary.foreground,
        },
        popover: {
          DEFAULT: palette.neutral.light.surface,
          foreground: palette.neutral.light.foreground,
        },
        card: {
          DEFAULT: palette.neutral.light.surface,
          foreground: palette.neutral.light.foreground,
        },
        destructive: {
          DEFAULT: palette.error.DEFAULT,
          foreground: palette.error.foreground,
        },
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #743DFF 0%, #007CF0 100%)",
        "gradient-hero": "linear-gradient(135deg, rgba(8, 17, 52, 0.08) 0%, rgba(116, 61, 255, 0.08) 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        DEFAULT: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
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
