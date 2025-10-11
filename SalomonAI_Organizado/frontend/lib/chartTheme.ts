const withHsl = (value: string, fallback: string) => {
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (/^(hsl|rgb|#)/i.test(trimmed)) return trimmed
  return `hsl(${trimmed})`
}

const FALLBACK = {
  ACCENT: "hsl(var(--accent))",
  TEXT: "hsl(var(--foreground))",
  MUTED: "hsl(var(--muted-foreground))",
  CARD: "hsl(var(--card))",
  BORDER: "hsl(var(--border))",
  SUCCESS: "hsl(var(--success))",
}

export type ChartVars = typeof FALLBACK

export const getChartVars = (): ChartVars => {
  if (typeof window === "undefined") {
    return FALLBACK
  }

  const css = getComputedStyle(document.documentElement)

  return {
    ACCENT: css.getPropertyValue("--accent").trim() || FALLBACK.ACCENT,
    TEXT: withHsl(css.getPropertyValue("--foreground"), FALLBACK.TEXT),
    MUTED: withHsl(css.getPropertyValue("--muted-foreground"), FALLBACK.MUTED),
    CARD: withHsl(css.getPropertyValue("--card"), FALLBACK.CARD),
    BORDER: withHsl(css.getPropertyValue("--border"), FALLBACK.BORDER),
    SUCCESS: css.getPropertyValue("--success").trim() || FALLBACK.SUCCESS,
  }
}
