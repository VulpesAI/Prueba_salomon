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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

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

export interface ExportedPdfDocument {
  filename: string
  html: string
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
): Promise<ExportedPdfDocument> {
  await maybeSimulateLatency()

  const generatedAt = new Date().toISOString()
  const filename = buildFilename("estado-demo", range, "pdf")
  const transactionsRows = statement.transactions
    .map((transaction) => {
      const date = escapeHtml(formatDate(transaction.date))
      const description = escapeHtml(transaction.description)
      const category = escapeHtml(transaction.category ?? "Sin categoría")
      const amount = escapeHtml(formatAmount(transaction.amount))

      return `
        <tr>
          <td>${date}</td>
          <td>${description}</td>
          <td>${category}</td>
          <td class="amount">${amount}</td>
        </tr>
      `
    })
    .join("")

  const transactionsTableBody =
    transactionsRows ||
    `
        <tr>
          <td colspan="4" class="empty">No se registran movimientos en el periodo seleccionado.</td>
        </tr>
      `

  const totalsRows = [
    { label: "Balance", value: formatAmount(statement.totals.balance) },
    { label: "Ingresos", value: formatAmount(statement.totals.income) },
    { label: "Gastos", value: formatAmount(statement.totals.expenses) },
  ]
    .map(
      (total) => `
        <div class="summary-item">
          <p class="summary-label">${escapeHtml(total.label)}</p>
          <p class="summary-value">${escapeHtml(total.value)}</p>
        </div>
      `
    )
    .join("")

  const html = `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(filename)}</title>
      <style>
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          margin: 0;
          padding: 2.5rem;
          background: #f8fafc;
          color: #0f172a;
        }

        header {
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 1.5rem;
          margin-bottom: 1.5rem;
        }

        h1 {
          margin: 0;
          font-size: 1.75rem;
        }

        .meta {
          margin-top: 0.5rem;
          color: #475569;
          font-size: 0.9rem;
        }

        .grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          margin-bottom: 1.5rem;
        }

        .panel {
          padding: 1rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
        }

        .panel h2 {
          margin: 0 0 0.5rem;
          font-size: 1rem;
          color: #1e293b;
        }

        .summary {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          margin-bottom: 2rem;
        }

        .summary-item {
          padding: 1rem;
          background: #e2e8f0;
          border-radius: 0.75rem;
        }

        .summary-label {
          margin: 0;
          font-size: 0.85rem;
          color: #475569;
        }

        .summary-value {
          margin: 0.5rem 0 0;
          font-weight: 600;
          font-size: 1.1rem;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: #ffffff;
          border-radius: 0.75rem;
          overflow: hidden;
        }

        thead {
          background: #0f172a;
          color: #ffffff;
        }

        th,
        td {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.95rem;
        }

        tbody tr:nth-child(even) {
          background: #f1f5f9;
        }

        .amount {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .empty {
          text-align: center;
          padding: 2rem 1rem;
          color: #64748b;
          font-style: italic;
        }

        footer {
          margin-top: 2.5rem;
          font-size: 0.8rem;
          color: #475569;
        }

        @media print {
          body {
            background: #ffffff;
            padding: 1.5rem;
          }

          .panel,
          .summary-item {
            break-inside: avoid;
          }

          table {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <header>
        <h1>SalomónAI — Extracto Demo</h1>
        <p class="meta">Generado el ${escapeHtml(formatDate(range.start))} — ${escapeHtml(formatDate(range.end))}</p>
      </header>

      <section class="grid">
        <div class="panel">
          <h2>Titular</h2>
          <p>${escapeHtml(personalData.fullName)}</p>
          <p>${escapeHtml(personalData.documentId)}</p>
        </div>
        <div class="panel">
          <h2>Contacto</h2>
          <p>${escapeHtml(personalData.email)}</p>
          <p>${escapeHtml(personalData.institution)}</p>
        </div>
        <div class="panel">
          <h2>Cuenta</h2>
          <p>${escapeHtml(personalData.accountNumber)}</p>
          <p>${escapeHtml(`${range.start} al ${range.end}`)}</p>
        </div>
      </section>

      <section class="summary">
        ${totalsRows}
      </section>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Categoría</th>
            <th class="amount">Monto (CLP)</th>
          </tr>
        </thead>
        <tbody>
          ${transactionsTableBody}
        </tbody>
      </table>

      <footer>
        Documento generado automáticamente para uso interno de la demo de SalomónAI. ${escapeHtml(
          `Emitido: ${generatedAt}`
        )}
      </footer>

      <script>
        document.addEventListener("DOMContentLoaded", () => {
          document.title = ${JSON.stringify(filename)}
          window.focus()
          setTimeout(() => {
            window.print()
          }, 300)
        })
        window.addEventListener("afterprint", () => {
          window.close()
        })
      </script>
    </body>
  </html>`

  return {
    filename,
    html,
  }
}
