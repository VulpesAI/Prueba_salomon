"use client";

import { InsightSchema, InsightRangeSchema } from "@/lib/insights/schema";
import type { InsightDTO, InsightRange } from "@/lib/insights/types";
import { getDemoInsights } from "@/lib/insights/demo";

const USE_LOCAL_ADAPTER = true;
const CACHE_KEY_PREFIX = "salomon.insights";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedEntry = {
  range: InsightRange;
  payload: InsightDTO;
  savedAt: number;
};

function getCacheKey(range: InsightRange) {
  return `${CACHE_KEY_PREFIX}:${range}`;
}

function loadCache(range: InsightRange): InsightDTO | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getCacheKey(range));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed || typeof parsed.savedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null;
    }
    const result = InsightSchema.safeParse(parsed.payload);
    return result.success ? result.data : null;
  } catch (error) {
    console.warn("No se pudo leer la caché de insights", error);
    return null;
  }
}

function saveCache(range: InsightRange, data: InsightDTO) {
  if (typeof window === "undefined") {
    return;
  }
  const entry: CachedEntry = {
    range,
    payload: data,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(getCacheKey(range), JSON.stringify(entry));
  } catch (error) {
    console.warn("No se pudo guardar la caché de insights", error);
  }
}

async function fetchRemoteInsights(range: InsightRange): Promise<InsightDTO> {
  const url = new URL("/api/insights", window.location.origin);
  url.searchParams.set("range", range);
  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error("No se pudieron obtener los insights desde el servidor");
  }
  const json = await response.json();
  const parsed = InsightSchema.parse(json);
  saveCache(range, parsed);
  return parsed;
}

export async function getInsights(range: InsightRange = "30d"): Promise<InsightDTO> {
  const normalizedRange = InsightRangeSchema.parse(range);

  if (USE_LOCAL_ADAPTER) {
    const demo = InsightSchema.parse(getDemoInsights(normalizedRange));
    saveCache(normalizedRange, demo);
    return demo;
  }

  try {
    const remote = await fetchRemoteInsights(normalizedRange);
    return remote;
  } catch (error) {
    console.error("Fallo la carga remota de insights", error);
    const cached = loadCache(normalizedRange);
    if (cached) {
      return cached;
    }
    const fallback = InsightSchema.parse(getDemoInsights(normalizedRange));
    saveCache(normalizedRange, fallback);
    return fallback;
  }
}
