export const CATEGORY_COLORS: Record<string, string> = {
  Supermercado: "var(--chart-accent-1)",
  Arriendo: "var(--chart-accent-2)",
  Transporte: "var(--chart-accent-3)",
  Entretenimiento: "var(--chart-accent-4)",
  Educación: "var(--chart-accent-5)",
  Servicios: "var(--chart-accent-6)",
};

const FALLBACK_PALETTE = [
  "var(--chart-accent-1)",
  "var(--chart-accent-2)",
  "var(--chart-accent-3)",
  "var(--chart-accent-4)",
  "var(--chart-accent-5)",
  "var(--chart-accent-6)",
];

export function getCategoryColor(name: string, index = 0): string {
  if (CATEGORY_COLORS[name]) {
    return CATEGORY_COLORS[name];
  }

  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}
