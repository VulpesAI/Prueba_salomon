"use client";

import { useQuery } from "@tanstack/react-query";

import { ENV } from "@/env";

export type Kpis = {
  incomeCLP: number;
  expensesCLP: number;
  netCLP: number;
  incomeDelta: number;
  expensesDelta: number;
  netDelta: number;
};

export type FluxPoint = {
  date: string;
  amount: number;
  type: "hist" | "proj";
  model_type?: string;
  calculated_at?: string;
};

export type CategoryItem = {
  name: string;
  amount: number;
  percent: number;
};

export type Insight = {
  text: string;
};

export type OverviewData = {
  kpis: Kpis;
  flux: FluxPoint[];
  categories: CategoryItem[];
  insights: Insight[];
};

type Range = "7" | "30" | "90";

async function fetchOverview(range: Range): Promise<OverviewData> {
  const baseUrl = ENV.NEXT_PUBLIC_API_BASE;
  if (baseUrl) {
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/dashboard/overview?range=${range}`, {
        cache: "no-store",
      });
      if (response.ok) {
        return (await response.json()) as OverviewData;
      }
    } catch (error) {
      console.warn("Fallo al obtener overview desde API, usando mocks", error);
    }
  }

  return import(`../mocks/overview-${range}.json`).then((module) => module.default as OverviewData);
}

export function useDashboardOverview(range: Range) {
  return useQuery({
    queryKey: ["overview", range],
    queryFn: () => fetchOverview(range),
    staleTime: 60_000,
  });
}
