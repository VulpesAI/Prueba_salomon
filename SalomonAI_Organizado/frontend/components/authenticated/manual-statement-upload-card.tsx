"use client"

import { type ChangeEvent, useMemo, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ManualStatementUploadCard() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setSelectedFiles(files)
  }

  const fileSummary = useMemo(() => {
    if (selectedFiles.length === 0) {
      return "Ningún archivo seleccionado aún."
    }

    return `${selectedFiles.length} archivo${selectedFiles.length > 1 ? "s" : ""} listo${
      selectedFiles.length > 1 ? "s" : ""
    } para analizar.`
  }, [selectedFiles])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga de cartolas bancarias</CardTitle>
        <CardDescription>
          Sube manualmente archivos PDF o CSV para analizarlos y conciliar movimientos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            multiple
            accept=".pdf,.csv"
            onChange={handleFileChange}
            aria-label="Seleccionar cartolas bancarias en formato PDF o CSV"
          />
          <p className="mt-2 text-sm text-muted-foreground">{fileSummary}</p>
        </div>
        {selectedFiles.length > 0 && (
          <ul className="space-y-2 text-sm">
            {selectedFiles.map((file) => (
              <li key={file.name} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button type="button" disabled={selectedFiles.length === 0} onClick={() => {}}>
          Iniciar análisis
        </Button>
      </CardFooter>
    </Card>
  )
}
