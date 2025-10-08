import { MovementsPage, MovementsQuery, Movement, MovementType } from "@/types/movements"

const DAY_IN_MS = 24 * 60 * 60 * 1000

interface CategorySpec {
  slug: string
  label: string
  type: MovementType
  merchants: string[]
  minAmount: number
  maxAmount: number
}

const CATEGORY_SPECS: CategorySpec[] = [
  {
    slug: "supermercado",
    label: "Supermercado",
    type: "EXPENSE",
    merchants: ["Jumbo", "Líder", "Unimarc", "Santa Isabel"],
    minAmount: 18000,
    maxAmount: 120000,
  },
  {
    slug: "restaurantes",
    label: "Restaurantes",
    type: "EXPENSE",
    merchants: ["La Mesa Feliz", "Bistró Andino", "Casa Ñam", "Sushi Express"],
    minAmount: 12000,
    maxAmount: 85000,
  },
  {
    slug: "transporte",
    label: "Transporte",
    type: "EXPENSE",
    merchants: ["Cabify", "Uber", "Metro de Santiago", "Red Metropolitana"],
    minAmount: 800,
    maxAmount: 15000,
  },
  {
    slug: "servicios",
    label: "Servicios",
    type: "EXPENSE",
    merchants: ["Enel", "Aguas Andinas", "VTR", "Movistar"],
    minAmount: 9000,
    maxAmount: 95000,
  },
  {
    slug: "educacion",
    label: "Educación",
    type: "EXPENSE",
    merchants: ["Udemy", "Duoc UC", "Colegio Araucaria", "Cursos Talento"],
    minAmount: 15000,
    maxAmount: 180000,
  },
  {
    slug: "salud",
    label: "Salud",
    type: "EXPENSE",
    merchants: ["Clínica Integra", "Farmacias Salcobrand", "Cruz Verde", "Bupa"],
    minAmount: 6000,
    maxAmount: 220000,
  },
  {
    slug: "entretenimiento",
    label: "Entretenimiento",
    type: "EXPENSE",
    merchants: ["Cinemark", "Spotify", "Cine Hoyts", "Xbox Store"],
    minAmount: 4990,
    maxAmount: 65000,
  },
  {
    slug: "salario",
    label: "Salario",
    type: "INCOME",
    merchants: ["Empresa Aurora", "TechLabs", "Consultora Prisma"],
    minAmount: 850000,
    maxAmount: 2200000,
  },
  {
    slug: "freelance",
    label: "Freelance",
    type: "INCOME",
    merchants: ["Cliente Andes", "Cliente Patagonia", "Cliente Pacífico"],
    minAmount: 120000,
    maxAmount: 680000,
  },
  {
    slug: "inversiones",
    label: "Inversiones",
    type: "INCOME",
    merchants: ["Corredora Sur", "Fondos Andinos", "Dividendos Capital"],
    minAmount: 45000,
    maxAmount: 350000,
  },
]

export const MOVEMENT_CATEGORY_OPTIONS = CATEGORY_SPECS.map((spec) => ({
  value: spec.slug,
  label: spec.label,
}))

interface CursorPayload {
  occurred_at: string
  id: string
}

const dataset: Movement[] = generateDataset()

function mulberry32(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let result = Math.imul(t ^ (t >>> 15), 1 | t)
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function generateDataset(): Movement[] {
  const random = mulberry32(20251007)
  const items: Movement[] = []
  let currentTimestamp = Date.parse("2025-10-15T12:00:00Z")

  for (let index = 0; index < 180; index += 1) {
    if (index > 0) {
      const step = 1 + Math.floor(random() * 3)
      currentTimestamp -= step * DAY_IN_MS
    }

    const spec = CATEGORY_SPECS[index % CATEGORY_SPECS.length]
    const merchant = spec.merchants[Math.floor(random() * spec.merchants.length)]
    const amountRange = spec.maxAmount - spec.minAmount
    const rawAmount = spec.minAmount + Math.round(random() * amountRange)
    const roundedAmount = Math.round(rawAmount / 100) * 100

    const occurredAt = new Date(currentTimestamp - Math.floor(random() * DAY_IN_MS / 2))

    items.push({
      id: createMovementId(index, occurredAt),
      occurred_at: occurredAt.toISOString(),
      merchant,
      category: spec.slug,
      amount: roundedAmount,
      currency: "CLP",
      type: spec.type,
    })
  }

  return items.sort((a, b) => {
    const dateDiff = Date.parse(b.occurred_at) - Date.parse(a.occurred_at)
    if (dateDiff !== 0) {
      return dateDiff
    }
    return a.id < b.id ? 1 : -1
  })
}

function createMovementId(index: number, date: Date) {
  const base = date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 12)
  return `mv-${base}-${index.toString().padStart(4, "0")}`
}

function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64")
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const raw = Buffer.from(cursor, "base64").toString("utf-8")
    const parsed = JSON.parse(raw) as CursorPayload
    if (typeof parsed.id === "string" && typeof parsed.occurred_at === "string") {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function applyFilters(data: Movement[], query: MovementsQuery) {
  const fromTime = query.from ? Date.parse(`${query.from}T00:00:00Z`) : null
  const toTime = query.to ? Date.parse(`${query.to}T23:59:59Z`) : null
  const category = query.category?.toLowerCase()
  const search = query.q?.trim().toLowerCase()

  return data.filter((movement) => {
    const occurredAt = Date.parse(movement.occurred_at)

    if (fromTime && occurredAt < fromTime) {
      return false
    }

    if (toTime && occurredAt > toTime) {
      return false
    }

    if (category && movement.category.toLowerCase() !== category) {
      return false
    }

    if (search) {
      const haystack = `${movement.merchant} ${movement.category}`.toLowerCase()
      if (!haystack.includes(search)) {
        return false
      }
    }

    return true
  })
}

export async function getPage(query: MovementsQuery): Promise<MovementsPage> {
  const limit =
    typeof query.limit === "number" && Number.isFinite(query.limit) && query.limit > 0
      ? query.limit
      : 30

  const filtered = applyFilters(dataset, query)
  const sorted = filtered.sort((a, b) => {
    const dateDiff = Date.parse(b.occurred_at) - Date.parse(a.occurred_at)
    if (dateDiff !== 0) {
      return dateDiff
    }
    return a.id < b.id ? 1 : -1
  })

  let startIndex = 0
  if (query.cursor) {
    const payload = decodeCursor(query.cursor)
    if (payload) {
      const index = sorted.findIndex(
        (item) => item.id === payload.id && item.occurred_at === payload.occurred_at
      )
      if (index >= 0) {
        startIndex = index + 1
      }
    }
  }

  const items = sorted.slice(startIndex, startIndex + limit)
  const lastItem = items.at(-1) ?? null

  return {
    items,
    totalMatched: sorted.length,
    nextCursor:
      lastItem && startIndex + limit < sorted.length
        ? encodeCursor({ id: lastItem.id, occurred_at: lastItem.occurred_at })
        : null,
  }
}

export function getCategoryLabel(category: string) {
  const spec = CATEGORY_SPECS.find((item) => item.slug === category)
  return spec?.label ?? category
}
