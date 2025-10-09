"use client";

import { useCallback, useEffect, useState } from "react";

import { getInsights } from "@/lib/insights/adapter";
import type { InsightDTO, InsightRange } from "@/lib/insights/types";

export type UseInsightsResult = {
  data: InsightDTO | null;
  error: string | null;
  loading: boolean;
  range: InsightRange;
  lastUpdated: string | null;
  refresh: (nextRange?: InsightRange) => Promise<void>;
};

const DEFAULT_RANGE: InsightRange = "30d";

export function useInsights(initialRange: InsightRange = DEFAULT_RANGE): UseInsightsResult {
  const [range, setRange] = useState<InsightRange>(initialRange);
  const [data, setData] = useState<InsightDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async (targetRange: InsightRange) => {
    setLoading(true);
    try {
      const result = await getInsights(targetRange);
      setData(result);
      setLastUpdated(result.updatedAt ?? null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible cargar los insights.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const refresh = useCallback(
    async (nextRange?: InsightRange) => {
      if (nextRange && nextRange !== range) {
        setLoading(true);
        setData(null);
        setLastUpdated(null);
        setRange(nextRange);
        setError(null);
        return;
      }
      await load(range);
    },
    [load, range],
  );

  return {
    data,
    error,
    loading,
    range,
    lastUpdated,
    refresh,
  };
}
