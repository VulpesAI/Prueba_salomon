import { Card } from "@/components/ui/card"
import { Section } from "./Section"

type Step = {
  order: number
  title: string
  description: string
}

interface HowItWorksProps {
  steps: Step[]
}

export function HowItWorks({ steps }: HowItWorksProps) {
  const ordered = [...steps].sort((a, b) => a.order - b.order)

  return (
    <Section aria-label="Cómo funciona">
      <h2 className="mb-6 text-[24px] font-semibold text-text">Cómo funciona</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {ordered.map((step) => (
          <Card key={step.order}>
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white"
              >
                {step.order}
              </span>
              <div>
                <h3 className="text-[18px] font-medium text-text">{step.title}</h3>
                <p className="text-[14px] text-text-muted">{step.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  )
}
