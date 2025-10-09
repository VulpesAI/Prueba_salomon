const CLP_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function formatCurrencyCLP(value: number): string {
  return CLP_FORMATTER.format(value)
}

export function formatPercentDelta(delta: number): string {
  const prefix = delta > 0 ? "+" : delta < 0 ? "-" : ""
  return `${prefix}${Math.abs(delta).toFixed(1)}%`
}

export function formatDateCL(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return DATE_FORMATTER.format(date)
}
