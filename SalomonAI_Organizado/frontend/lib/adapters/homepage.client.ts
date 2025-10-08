export type HomePageDTO = {
  hero: {
    title: string
    subtitle: string
    ctaLabel: string
    ctaHref: string
  }
  features: Array<{
    id: string
    title: string
    description: string
    icon?: string
  }>
  howItWorks?: {
    enabled: boolean
    steps: Array<{
      order: number
      title: string
      description: string
    }>
  }
}

export async function fetchHomepage(): Promise<HomePageDTO> {
  const res = await fetch("/api/homepage", { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to load homepage content")
  }
  return res.json()
}
