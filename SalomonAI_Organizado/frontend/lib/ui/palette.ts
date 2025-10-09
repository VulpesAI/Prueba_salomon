export const CATEGORY_COLORS: Record<string, string> = {
  Supermercado: "#06B6D4",
  Arriendo: "#007CF0",
  Transporte: "#3B82F6",
  Entretenimiento: "#F59E0B",
  Educación: "#22C55E",
  Servicios: "#123A68",
};

const DEFAULT_COLOR = "#94A3B8";

export function getCategoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? DEFAULT_COLOR;
}
