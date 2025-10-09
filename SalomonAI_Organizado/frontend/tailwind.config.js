const categoryColors = require("./config/category-colors.json")

const palette = {
  primary: {
    DEFAULT: "#007CF0",
    foreground: "#F5F7FF",
    from: "#007CF0",
    to: "#22C55E",
  },
  "primary-dark": {
    from: "#005A9C",
    to: "#1C9E4A",
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
  categories: categoryColors,
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
        border: "var(--border)",
        input: "var(--border)",
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
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        "accent-muted": "var(--accent-muted)",
        popover: {
          DEFAULT: "hsl(var(--panel))",
          foreground: "hsl(var(--text-primary))",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--text)",
        },
        destructive: {
          DEFAULT: palette.error.DEFAULT,
          foreground: palette.error.foreground,
        },
        success: {
          DEFAULT: palette.success.DEFAULT,
          foreground: palette.success.foreground,
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: palette.warning.foreground,
        },
        error: {
          DEFAULT: palette.error.DEFAULT,
          foreground: palette.error.foreground,
        },
        bg: "var(--bg)",
        "bg-muted": "var(--bg-muted)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        positive: "var(--positive)",
        negative: "var(--negative)",
        skeleton: "var(--skeleton)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #007CF0 0%, #22C55E 100%)",
        "gradient-hero": "linear-gradient(135deg, rgba(11, 25, 67, 0.6) 0%, rgba(34, 197, 94, 0.24) 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius)",
        "2xl": "calc(var(--radius) + 4px)",
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
    },
  },
  plugins: [require("@tailwindcss/forms"), require("tailwindcss-animate")],
}
