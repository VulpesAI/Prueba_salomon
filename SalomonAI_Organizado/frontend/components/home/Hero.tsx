"use client"

import { Button } from "@/components/ui/button"
import { Section } from "./Section"

type HeroProps = {
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}

export function Hero({ title, subtitle, ctaLabel, ctaHref }: HeroProps) {
  return (
    <Section className="text-center">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[32px] font-semibold text-text md:text-[40px]">{title}</h1>
        <p className="mt-3 text-[18px] text-text-muted md:text-[20px]" aria-label="Subtítulo">
          {subtitle}
        </p>
        <div className="mt-6 flex items-center justify-center">
          <Button asChild aria-label={ctaLabel}>
            <a href={ctaHref}>{ctaLabel}</a>
          </Button>
        </div>
      </div>
    </Section>
  )
}
