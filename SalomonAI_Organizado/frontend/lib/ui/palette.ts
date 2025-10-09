export const CATEGORY_COLORS: Record<string, string> = {
  Supermercado: "#38bdf8", // sky-400
  Arriendo: "#22c55e", // green-500
  Transporte: "#a855f7", // purple-500
  Entretenimiento: "#f97316", // orange-500
  Educación: "#ef4444", // red-500
  Servicios: "#facc15", // yellow-400
};

const DEFAULT_COLOR = "#94a3b8"; // slate-400 fallback

export function getCategoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? DEFAULT_COLOR;
}
