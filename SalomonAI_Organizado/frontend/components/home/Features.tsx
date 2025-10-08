import { Card } from "@/components/ui/card"
import { Section } from "./Section"

type Feature = {
  id: string
  title: string
  description: string
  icon?: string
}

interface FeaturesProps {
  items: Feature[]
}

export function Features({ items }: FeaturesProps) {
  return (
    <Section aria-label="Características">
      <h2 className="mb-6 text-[24px] font-semibold text-text">Características</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((feature) => (
          <Card key={feature.id} className="h-full">
            <div className="flex flex-col gap-2">
              <h3 className="text-[18px] font-medium text-text">{feature.title}</h3>
              <p className="text-[14px] text-text-muted">{feature.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  )
}
