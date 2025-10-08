const CLP_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(value: number): string {
  return CLP_FORMATTER.format(value);
}

export function formatPercent(delta: number): string {
  return `${Math.abs(delta).toFixed(1)}%`;
}
