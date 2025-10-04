const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
}

const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
}

const normalizeDate = (value: string | Date) =>
  typeof value === "string" ? new Date(value) : value

export const formatCurrency = (value: number) => currencyFormatter.format(value)

export const formatCurrencyAbsolute = (value: number) =>
  currencyFormatter.format(Math.abs(value))

export const formatDate = (
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat("es-CL", { ...defaultDateOptions, ...options }).format(normalizeDate(value))

export const formatDateTime = (
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat("es-CL", { ...defaultDateTimeOptions, ...options }).format(normalizeDate(value))

export const formatRelativeDate = (value: string | Date) => {
  const target = normalizeDate(value)
  const now = new Date()
  const diffInMs = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)
  const diffInDays = Math.round(diffInMs / 86_400_000)

  if (diffInDays === 0) {
    return "Hoy"
  }

  if (diffInDays === 1) {
    return "Mañana"
  }

  if (diffInDays === -1) {
    return "Ayer"
  }

  if (diffInDays > 1) {
    return `En ${diffInDays} días`
  }

  return `Hace ${Math.abs(diffInDays)} días`
}
