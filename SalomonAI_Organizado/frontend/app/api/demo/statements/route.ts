import { NextResponse } from "next/server"

import { parseStatementFiles, type NormalizedStatement } from "@/lib/statements/parser"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const entries = formData.getAll("files")

    if (entries.length === 0) {
      return NextResponse.json({ error: "No se adjuntaron archivos" }, { status: 400 })
    }

    const buffers = await Promise.all(
      entries.map(async (entry, index) => {
        if (!(entry instanceof File)) {
          throw new Error(`Entrada ${index + 1} inválida: se esperaba un archivo`)
        }

        const arrayBuffer = await entry.arrayBuffer()
        return {
          buffer: Buffer.from(arrayBuffer),
          filename: entry.name,
          mimetype: entry.type,
        }
      })
    )

    const statement: NormalizedStatement = await parseStatementFiles(buffers)

    return NextResponse.json({ statement })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al procesar los archivos subidos"

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
