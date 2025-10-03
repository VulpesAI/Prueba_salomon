import { describe, expect, it } from "vitest"

import { parseStatementFiles } from "./parser"

describe("parseStatementFiles", () => {
  it("normaliza transacciones desde un CSV básico", async () => {
    const csv = `fecha,descripcion,monto,categoria
2024-01-01,Salario,1500000,Ingresos
2024-01-05,Supermercado,-45000,Alimentación
`

    const result = await parseStatementFiles([
      {
        buffer: Buffer.from(csv, "utf-8"),
        filename: "enero.csv",
        mimetype: "text/csv",
      },
    ])

    expect(result.transactions).toHaveLength(2)
    expect(result.totals.income).toBe(1500000)
    expect(result.totals.expenses).toBe(45000)
    expect(result.totals.balance).toBe(1455000)
    expect(result.expenseByCategory["Alimentación"]).toBe(45000)
  })
})
