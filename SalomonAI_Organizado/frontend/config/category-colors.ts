import rawCategoryColorMap from "./category-colors.json" assert { type: "json" }

type CategoryColorDefinition = typeof rawCategoryColorMap

export type CategoryColorKey = keyof CategoryColorDefinition

export const CATEGORY_COLOR_MAP: CategoryColorDefinition = rawCategoryColorMap

export const CATEGORY_COLOR_ENTRIES = Object.entries(
  CATEGORY_COLOR_MAP
) as [CategoryColorKey, string][]

export const CATEGORY_COLOR_VALUES = CATEGORY_COLOR_ENTRIES.map(([, color]) => color)

const CATEGORY_COLOR_ALIASES: Record<string, CategoryColorKey> = {
  vivienda: "vivienda",
  arriendo: "vivienda",
  hipoteca: "vivienda",
  renta: "vivienda",
  alimentacion: "alimentacion",
  alimentos: "alimentacion",
  supermercado: "alimentacion",
  compras: "alimentacion",
  restaurantes: "alimentacion",
  comida: "alimentacion",
  transporte: "transporte",
  movilidad: "transporte",
  transportepublico: "transporte",
  servicios: "servicios",
  serviciosdelhogar: "servicios",
  luz: "servicios",
  agua: "servicios",
  internet: "servicios",
  suscripciones: "suscripciones",
  streaming: "suscripciones",
  plataformas: "suscripciones",
  salud: "salud",
  segurosalud: "salud",
  seguros: "servicios",
  medicina: "salud",
  ingresos: "ingresos",
  salario: "ingresos",
  sueldo: "ingresos",
  honorarios: "ingresos",
  educacion: "educacion",
  estudios: "educacion",
  cursos: "educacion",
  entretenimiento: "entretenimiento",
  ocio: "entretenimiento",
  recreacion: "entretenimiento",
  cultura: "entretenimiento",
  ahorro: "ahorro",
  inversiones: "ahorro",
}

const normalizeCategoryKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")

export const resolveCategoryColorKey = (
  value: string | null | undefined
): CategoryColorKey | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = normalizeCategoryKey(value)

  if (!normalized) {
    return undefined
  }

  if (normalized in CATEGORY_COLOR_MAP) {
    return normalized as CategoryColorKey
  }

  return CATEGORY_COLOR_ALIASES[normalized]
}

export const getCategoryColor = (value: string | null | undefined) => {
  const key = resolveCategoryColorKey(value)

  if (!key) {
    return undefined
  }

  return CATEGORY_COLOR_MAP[key]
}

export const getCategoryColorByIndex = (index: number) => {
  if (CATEGORY_COLOR_VALUES.length === 0) {
    return undefined
  }

  const normalizedIndex = index % CATEGORY_COLOR_VALUES.length
  return CATEGORY_COLOR_VALUES[normalizedIndex]
}
