import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, type EmptyStateAction } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"

export type FeaturePreviewSection = {
  title: string
  description: string
  skeletons?: number
  layout?: "grid" | "list"
  variant?: "card" | "table" | "chart"
}

type FeaturePreviewProps = {
  icon: import("lucide-react").LucideIcon
  title: string
  description: string
  cta?: EmptyStateAction
  sections: FeaturePreviewSection[]
}

const getContainerClasses = (layout: FeaturePreviewSection["layout"]) => {
  if (layout === "list") {
    return "space-y-3"
  }

  return "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
}

const renderSkeletons = (section: FeaturePreviewSection) => {
  const total = section.skeletons ?? 3

  if (section.variant === "table") {
    return (
      <div className="space-y-3">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={`${section.title}-table-${index}`}
            className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <Skeleton className="h-5 w-full rounded-md" />
            <Skeleton className="h-5 w-full rounded-md" />
            <Skeleton className="h-5 w-full rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  if (section.variant === "chart") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: total }).map((_, index) => (
          <Skeleton
            key={`${section.title}-chart-${index}`}
            className="h-40 w-full rounded-xl bg-gradient-to-br from-muted/60 via-muted to-muted"
          />
        ))}
      </div>
    )
  }

  return (
    <div className={getContainerClasses(section.layout)}>
      {Array.from({ length: total }).map((_, index) => (
        <Skeleton
          key={`${section.title}-card-${index}`}
          className={section.layout === "list" ? "h-16 w-full rounded-xl" : "h-28 w-full rounded-xl"}
        />
      ))}
    </div>
  )
}

export function FeaturePreview({ icon, title, description, cta, sections }: FeaturePreviewProps) {
  return (
    <div className="space-y-8">
      <EmptyState icon={icon} title={title} description={description} cta={cta} align="start" />
      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title} className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>{renderSkeletons(section)}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
