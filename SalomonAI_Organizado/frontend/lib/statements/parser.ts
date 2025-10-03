import Papa from "papaparse"

export interface NormalizedTransaction {
  /** Fecha del movimiento en formato ISO 8601 (YYYY-MM-DD) */
  date: string
  /** Descripción del movimiento tal como aparece en la cartola */
  description: string
  /** Monto del movimiento en pesos chilenos. Valores negativos representan egresos. */
  amount: number
  /** Categoría inferida o provista por la cartola. */
  category?: string
  /** Información adicional sin procesar que pueda acompañar al registro. */
  metadata?: Record<string, unknown>
}

export interface NormalizedStatement {
  transactions: NormalizedTransaction[]
  totals: {
    /** Balance neto calculado a partir de todos los movimientos */
    balance: number
    /** Suma de todos los ingresos (montos positivos) */
    income: number
    /** Suma absoluta de todos los gastos (montos negativos) */
    expenses: number
  }
  incomeByCategory: Record<string, number>
  expenseByCategory: Record<string, number>
}

export interface StatementFileInput {
  buffer: Buffer
  filename: string
  mimetype?: string
}

const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/csv",
  "text/plain",
])

const PDF_MIME_TYPES = new Set(["application/pdf"])

const CATEGORY_FALLBACK = "Sin categoría"

/**
 * Punto de entrada principal: recibe archivos en bruto y entrega un resumen normalizado
 * listo para reutilizarse desde el frontend.
 */
export async function parseStatementFiles(files: StatementFileInput[]): Promise<NormalizedStatement> {
  const transactions: NormalizedTransaction[] = []

  for (const file of files) {
    const extension = file.filename.split(".").pop()?.toLowerCase() ?? ""

    if (extension === "csv" || CSV_MIME_TYPES.has(file.mimetype ?? "")) {
      transactions.push(...parseCsvTransactions(file.buffer))
      continue
    }

    if (extension === "pdf" || PDF_MIME_TYPES.has(file.mimetype ?? "")) {
      const pdfTransactions = await parsePdfTransactions(file.buffer)
      transactions.push(...pdfTransactions)
      continue
    }

    throw new Error(`Formato no soportado para el archivo ${file.filename}`)
  }

  return buildNormalizedStatement(transactions)
}

function parseCsvTransactions(buffer: Buffer): NormalizedTransaction[] {
  const csvContent = buffer.toString("utf-8")
  const { data, errors, meta } = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  })

  if (errors.length > 0) {
    throw new Error(`No se pudo procesar el CSV: ${errors[0].message}`)
  }

  const dateHeader = findHeader(meta.fields, ["fecha", "date", "fecha transaccion"])
  const amountHeader = findHeader(meta.fields, ["monto", "amount", "cargo", "abono"])
  const descriptionHeader = findHeader(meta.fields, ["descripcion", "description", "detalle"])
  const categoryHeader = findHeader(meta.fields, ["categoria", "category"])

  if (!dateHeader || !amountHeader || !descriptionHeader) {
    throw new Error("El CSV no contiene las columnas necesarias (fecha, monto, descripción)")
  }

  return data
    .map((row) => normalizeTransaction({
      date: row[dateHeader] ?? "",
      description: row[descriptionHeader] ?? "",
      amount: row[amountHeader] ?? "0",
      category: categoryHeader ? row[categoryHeader] : undefined,
      metadata: row,
    }))
    .filter((tx): tx is NormalizedTransaction => Boolean(tx))
}

type PdfParse = (dataBuffer: Buffer) => Promise<{ text: string }>

let cachedPdfParser: PdfParse | null = null

async function getPdfParser(): Promise<PdfParse> {
  if (cachedPdfParser) return cachedPdfParser

  const pdfParseModule = await import("pdf-parse")
  const parser = (pdfParseModule.default ?? pdfParseModule) as PdfParse
  cachedPdfParser = parser
  return parser
}

async function parsePdfTransactions(buffer: Buffer): Promise<NormalizedTransaction[]> {
  const pdfParser = await getPdfParser()
  const pdfData = await pdfParser(buffer)
  const text = pdfData.text

  return extractTransactionsFromPdfText(text)
}

function extractTransactionsFromPdfText(text: string): NormalizedTransaction[] {
  const transactions: NormalizedTransaction[] = []
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const lineRegex = /^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?[0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?| -?[0-9]+)(?:\s+(.+))?$/

  for (const line of lines) {
    const match = line.match(lineRegex)
    if (!match) continue

    const [, date, description, amountRaw, categoryRaw] = match
    const amount = parseAmount(amountRaw)

    if (Number.isNaN(amount)) continue

    transactions.push({
      date,
      description: description.trim(),
      amount,
      category: categoryRaw?.trim() || undefined,
    })
  }

  return transactions
}

function normalizeTransaction(input: {
  date: string
  description: string
  amount: string | number
  category?: string
  metadata?: Record<string, unknown>
}): NormalizedTransaction | null {
  const date = normalizeDate(input.date)
  const amount = typeof input.amount === "number" ? input.amount : parseAmount(input.amount)
  const description = input.description?.trim()

  if (!date || !description || Number.isNaN(amount)) {
    return null
  }

  return {
    date,
    description,
    amount,
    category: input.category?.trim() || undefined,
    metadata: input.metadata,
  }
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null

  const normalized = raw.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  const parts = normalized.split(/[\/]/)
  if (parts.length === 3) {
    const [part1, part2, part3] = parts.map((part) => part.padStart(2, "0"))
    // Intentamos detectar formato DD/MM/YYYY o YYYY/MM/DD
    if (part3.length === 4) {
      return `${part3}-${part2}-${part1}`
    }
    if (part1.length === 4) {
      return `${part1}-${part2}-${part3}`
    }
  }

  const date = new Date(normalized)
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }

  return null
}

function parseAmount(raw: string): number {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")

  return Number.parseFloat(cleaned)
}

function findHeader(fields: string[] | undefined, candidates: string[]): string | undefined {
  if (!fields) return undefined

  const lowerCaseFields = fields.map((field) => field.toLowerCase())
  for (const candidate of candidates) {
    const index = lowerCaseFields.indexOf(candidate)
    if (index !== -1) {
      return fields[index]
    }
  }
  return undefined
}

function buildNormalizedStatement(transactions: NormalizedTransaction[]): NormalizedStatement {
  const sortedTransactions = [...transactions].sort((a, b) => (a.date > b.date ? 1 : -1))

  let income = 0
  let expenses = 0
  const incomeByCategory: Record<string, number> = {}
  const expenseByCategory: Record<string, number> = {}

  for (const transaction of sortedTransactions) {
    const category = transaction.category ?? CATEGORY_FALLBACK

    if (transaction.amount >= 0) {
      income += transaction.amount
      incomeByCategory[category] = (incomeByCategory[category] ?? 0) + transaction.amount
    } else {
      const absoluteAmount = Math.abs(transaction.amount)
      expenses += absoluteAmount
      expenseByCategory[category] = (expenseByCategory[category] ?? 0) + absoluteAmount
    }
  }

  const balance = income - expenses

  return {
    transactions: sortedTransactions,
    totals: {
      balance,
      income,
      expenses,
    },
    incomeByCategory,
    expenseByCategory,
  }
}

export { buildNormalizedStatement, extractTransactionsFromPdfText }
