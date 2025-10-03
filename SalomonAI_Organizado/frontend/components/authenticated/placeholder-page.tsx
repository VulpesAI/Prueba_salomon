import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type PlaceholderSection = {
  title: string
  description: string
  skeletons?: number
  layout?: "grid" | "list"
}

type PlaceholderPageProps = {
  title: string
  description: string
  sections: PlaceholderSection[]
}

const getContainerClasses = (layout: PlaceholderSection["layout"]) => {
  if (layout === "list") {
    return "space-y-3"
  }

  return "grid gap-4 sm:grid-cols-2"
}

export function PlaceholderPage({
  title,
  description,
  sections,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={getContainerClasses(section.layout)}>
              {Array.from({ length: section.skeletons ?? 3 }).map((_, index) => (
                <Skeleton
                  key={`${section.title}-${index}`}
                  className={section.layout === "list" ? "h-12 w-full rounded-lg" : "h-24 w-full rounded-lg"}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
