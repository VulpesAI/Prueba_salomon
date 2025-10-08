import { Features } from "@/components/home/Features"
import { Hero } from "@/components/home/Hero"
import { HowItWorks } from "@/components/home/HowItWorks"
import { fetchHomepage } from "@/lib/adapters/homepage.client"

export default async function HomePage() {
  try {
    const data = await fetchHomepage()
    const { hero, features, howItWorks } = data

    return (
      <main className="min-h-screen bg-background">
        <Hero
          title={hero.title}
          subtitle={hero.subtitle}
          ctaLabel={hero.ctaLabel}
          ctaHref={hero.ctaHref}
        />
        <Features items={features} />
        {howItWorks?.enabled && howItWorks.steps?.length ? <HowItWorks steps={howItWorks.steps} /> : null}
      </main>
    )
  } catch {
    return (
      <main>
        <div className="mx-auto max-w-3xl p-6 text-negative">
          No se pudo cargar la página de inicio.
        </div>
      </main>
    )
  }
}
