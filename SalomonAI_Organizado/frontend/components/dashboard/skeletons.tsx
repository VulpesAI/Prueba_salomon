import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"

export function KpiSkeleton() {
  return (
    <Card className="border-app-border-subtle bg-app-card-subtle">
      <CardContent className="space-y-4 pt-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card className="border-app-border-subtle bg-app-card-subtle">
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </CardContent>
    </Card>
  )
}

export function DonutSkeleton() {
  return (
    <Card className="border-app-border-subtle bg-app-card-subtle">
      <CardContent className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-app-border-subtle bg-app-surface-subtle p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function InsightsSkeleton() {
  return (
    <Card className="border-app-border-subtle bg-app-card-subtle">
      <CardContent className="space-y-3 pt-6">
        <Skeleton className="h-6 w-36" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-2xl" />
        ))}
      </CardContent>
    </Card>
  )
}

interface ErrorStateProps {
  onRetry: () => void
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      title="No pudimos cargar los datos"
      description="Revisa tu conexión e inténtalo nuevamente."
      action={
        <Button onClick={onRetry} variant="primary">
          Reintentar
        </Button>
      }
      className="bg-app-card-subtle"
    />
  )
}
