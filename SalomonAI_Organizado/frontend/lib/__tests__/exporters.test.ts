import { describe, expect, it, beforeEach } from "vitest"

import { CHILE_DEMO_STATEMENT } from "../../context/demo-statement.fixture"
import {
  DEMO_PERSONAL_DATA,
  exportStatementAsCsv,
  exportStatementAsJson,
  exportStatementAsPdf,
  getStatementDateRange,
} from "../exporters"

const normalizeWhitespace = (value: string) => value.replace(/\u00a0/g, " ")

describe("demo statement exporters", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false"
  })

  it("obtains the range from the demo statement", () => {
    const range = getStatementDateRange(CHILE_DEMO_STATEMENT)
    expect(range.start).toBe("2024-05-04")
    expect(range.end).toBe("2024-08-25")
  })

  it("generates CSV content with headers and CLP amounts", async () => {
    const result = await exportStatementAsCsv(CHILE_DEMO_STATEMENT, DEMO_PERSONAL_DATA)

    expect(result.mimeType).toBe("text/csv")
    expect(result.filename.endsWith(".csv")).toBe(true)

    const content = normalizeWhitespace(result.content)
    expect(content).toContain("Monto (CLP)")
    expect(content).toMatch(/CLP ?1\.800\.000/)
  })

  it("generates JSON content with formatted totals and currency", async () => {
    const result = await exportStatementAsJson(CHILE_DEMO_STATEMENT, DEMO_PERSONAL_DATA)
    expect(result.mimeType).toBe("application/json")

    const parsed = JSON.parse(result.content)
    expect(parsed.currency).toBe("CLP")
    expect(parsed.totals.income).toMatch(/CLP/)
    expect(parsed.transactions[0].formattedAmount).toMatch(/CLP/)
  })

  it("generates printable PDF text with CLP amounts", async () => {
    const result = await exportStatementAsPdf(CHILE_DEMO_STATEMENT, DEMO_PERSONAL_DATA)

    expect(result.mimeType).toBe("application/pdf")
    const content = normalizeWhitespace(result.content)
    expect(content).toContain("SalomónAI — Extracto Demo")
    expect(content).toMatch(/CLP ?1\.800\.000/)
  })
})
