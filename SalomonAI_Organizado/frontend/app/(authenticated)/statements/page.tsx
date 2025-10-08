"use client"

import StatementUploader from "@/components/StatementUploader"
import { StatementHistory } from "@/components/authenticated/statements/statement-history"
import { useStatements } from "@/hooks/use-statements"

export default function StatementsPage() {
  const { statements, isLoading, refetch } = useStatements()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cartolas bancarias</h1>
        <p className="text-muted-foreground">
          Revisa el estado de tus cartolas subidas y accede al detalle de transacciones para
          clasificarlas rápidamente.
        </p>
      </header>

      <StatementUploader />

      <StatementHistory statements={statements} isLoading={isLoading} onRefresh={refetch} />
    </div>
  )
}
