export default function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3" role="status" aria-live="polite">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-2xl" aria-hidden>
        📄
      </div>
      <div className="text-lg font-semibold">Aún no tienes movimientos</div>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Sube tu cartola para comenzar a visualizar tus ingresos y gastos en un solo lugar.
      </p>
      <a href="/cartolas/subir" className="btn-primary inline-flex items-center justify-center" aria-label="Subir cartola">
        Subir cartola
      </a>
    </div>
  )
}
