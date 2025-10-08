interface Props {
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

export default function FooterLoader({ hasNextPage, isFetchingNextPage }: Props) {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground" aria-live="polite">
      {isFetchingNextPage ? "Cargando más…" : hasNextPage ? "" : "No hay más"}
    </div>
  )
}
