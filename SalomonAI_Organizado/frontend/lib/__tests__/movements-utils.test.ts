import { describe, expect, it } from "vitest"

import { formatCLP } from "@/lib/utils/currency"
import { formatShortDate } from "@/lib/utils/date"

describe("formatCLP", () => {
  it("formatea valores enteros a CLP sin decimales", () => {
    expect(formatCLP(1234567)).toBe("$1.234.567")
  })
})

describe("formatShortDate", () => {
  it("retorna fecha corta en es-CL en minúsculas", () => {
    expect(formatShortDate("2025-10-07T12:00:00Z")).toBe("7 oct 2025")
  })

  it("retorna el valor original si la fecha es inválida", () => {
    expect(formatShortDate("fecha")).toBe("fecha")
  })
})
