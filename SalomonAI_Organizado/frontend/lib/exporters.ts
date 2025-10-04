"use client"

import { formatDate } from "./intl"
import type { NormalizedStatement } from "./statements/parser"

const demoFlag = process.env.NEXT_PUBLIC_DEMO_MODE?.toLowerCase()
const isDemoEnvironment =
  demoFlag === "true" ||
  demoFlag === "1" ||
  demoFlag === "yes" ||
  demoFlag === "y"

const DEMO_MIN_LATENCY = 120
const DEMO_MAX_LATENCY = 260

const currencyCodeFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  currencyDisplay: "code",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const maybeSimulateLatency = async () => {
  if (!isDemoEnvironment) {
    return
  }

  const jitter = Math.floor(Math.random() * (DEMO_MAX_LATENCY - DEMO_MIN_LATENCY))
  await wait(DEMO_MIN_LATENCY + jitter)
}

const formatAmount = (value: number) => {
  const formatted = currencyCodeFormatter.format(value).replace(/\u00a0/g, " ")

  if (formatted.startsWith("CLP-")) {
    return `-CLP ${formatted.slice(4)}`
  }

  return formatted
}

export type ExportFormat = "csv" | "json" | "pdf"

export interface DemoPersonalData {
  fullName: string
  email: string
  documentId: string
  institution: string
  accountNumber: string
}

export const DEMO_PERSONAL_DATA: DemoPersonalData = {
  fullName: "Isidora Riquelme",
  email: "demo-finanzas@salomon.ai",
  documentId: "18.765.432-1",
  institution: "Banco Demo SalomónAI",
  accountNumber: "000123456789",
}

export interface StatementDateRange {
  start: string
  end: string
}

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`

const buildRangeFromStatement = (statement: NormalizedStatement): StatementDateRange => {
  if (statement.transactions.length === 0) {
    const today = new Date().toISOString().slice(0, 10)
    return { start: today, end: today }
  }

  const sorted = statement.transactions
    .map((transaction) => transaction.date)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  return {
    start: sorted[0]!,
    end: sorted[sorted.length - 1]!,
  }
}

const buildFilename = (prefix: string, range: StatementDateRange, extension: string) =>
  `${prefix}-${range.start}-al-${range.end}.${extension}`

export interface ExportedFile {
  filename: string
  mimeType: string
  content: string
}

export const getStatementDateRange = (statement: NormalizedStatement): StatementDateRange =>
  buildRangeFromStatement(statement)

export async function exportStatementAsCsv(
  statement: NormalizedStatement,
  personalData: DemoPersonalData = DEMO_PERSONAL_DATA,
  range: StatementDateRange = buildRangeFromStatement(statement)
): Promise<ExportedFile> {
  await maybeSimulateLatency()

  const rows: string[][] = [
    ["Nombre", personalData.fullName],
    ["Correo", personalData.email],
    ["Documento", personalData.documentId],
    ["Institución", personalData.institution],
    ["Cuenta", personalData.accountNumber],
    ["Periodo", `${range.start} a ${range.end}`],
    [],
    ["Fecha", "Descripción", "Categoría", "Monto (CLP)"],
  ]

  for (const transaction of statement.transactions) {
    rows.push([
      formatDate(transaction.date, { year: "numeric" }),
      transaction.description,
      transaction.category ?? "Sin categoría",
      formatAmount(transaction.amount),
    ])
  }

  const content = rows
    .map((row) => row.map((value) => escapeCsvValue(String(value ?? ""))).join(","))
    .join("\n")

  return {
    filename: buildFilename("estado-demo", range, "csv"),
    mimeType: "text/csv",
    content,
  }
}

export async function exportStatementAsJson(
  statement: NormalizedStatement,
  personalData: DemoPersonalData = DEMO_PERSONAL_DATA,
  range: StatementDateRange = buildRangeFromStatement(statement)
): Promise<ExportedFile> {
  await maybeSimulateLatency()

  const content = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      currency: "CLP",
      owner: personalData,
      period: range,
      totals: {
        balance: formatAmount(statement.totals.balance),
        income: formatAmount(statement.totals.income),
        expenses: formatAmount(statement.totals.expenses),
      },
      transactions: statement.transactions.map((transaction) => ({
        ...transaction,
        formattedAmount: formatAmount(transaction.amount),
        currency: "CLP",
      })),
    },
    null,
    2
  )

  return {
    filename: buildFilename("estado-demo", range, "json"),
    mimeType: "application/json",
    content,
  }
}

export async function exportStatementAsPdf(
  statement: NormalizedStatement,
  personalData: DemoPersonalData = DEMO_PERSONAL_DATA,
  range: StatementDateRange = buildRangeFromStatement(statement)
): Promise<ExportedFile> {
  await maybeSimulateLatency()

  const lines: string[] = [
    "SalomónAI — Extracto Demo",
    `Titular: ${personalData.fullName} (${personalData.documentId})`,
    `Correo: ${personalData.email}`,
    `Cuenta: ${personalData.accountNumber} — ${personalData.institution}`,
    `Periodo: ${formatDate(range.start, { year: "numeric" })} - ${formatDate(range.end, { year: "numeric" })}`,
    "",
    "Totales:",
    `• Balance: ${formatAmount(statement.totals.balance)}`,
    `• Ingresos: ${formatAmount(statement.totals.income)}`,
    `• Gastos: ${formatAmount(statement.totals.expenses)}`,
    "",
    "Movimientos:",
  ]

  for (const transaction of statement.transactions) {
    lines.push(
      `${transaction.date} | ${transaction.description} | ${transaction.category ?? "Sin categoría"} | ${formatAmount(transaction.amount)}`
    )
  }

  lines.push("", "Documento generado para uso interno de la demo.")

  return {
    filename: buildFilename("estado-demo", range, "pdf"),
    mimeType: "application/pdf",
    content: lines.join("\n"),
  }
}
