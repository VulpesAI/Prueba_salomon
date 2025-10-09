import type { InsightDTO, InsightHistory, InsightRange } from "@/lib/insights/types";

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const CATEGORY_SHARES: Array<{ category: string; share: number }> = [
  { category: "Supermercado", share: 0.24 },
  { category: "Arriendo", share: 0.21 },
  { category: "Transporte", share: 0.16 },
  { category: "Servicios", share: 0.14 },
  { category: "Entretenimiento", share: 0.13 },
  { category: "Educación", share: 0.12 },
];

const BASE_INCOME = 2_450_000;
const BASE_EXPENSES = 1_820_000;

function getRangeFactor(range: InsightRange): number {
  const now = new Date();
  switch (range) {
    case "today":
      return 1 / 30;
    case "7d":
      return 7 / 30;
    case "30d":
      return 1;
    case "ytd":
      return Math.max(1, now.getMonth() + 1);
    default:
      return 1;
  }
}

function generateDailyHistory(days: number): InsightHistory[] {
  const now = new Date();
  const base = {
    checking: 1_240_000,
    savings: 540_000,
    credit: 210_000,
    investment: 960_000,
  };

  const history: InsightHistory[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const pointDate = new Date(now);
    pointDate.setDate(now.getDate() - index);
    const progress = (days - index) / days;
    const oscillation = Math.sin(progress * Math.PI * 1.5);

    history.push({
      x: pointDate.toISOString(),
      checking: Math.round(base.checking + oscillation * 55_000 + progress * 18_000),
      savings: Math.round(base.savings + oscillation * 32_000 + progress * 25_000),
      credit: Math.round(base.credit - oscillation * 18_000 - progress * 12_000),
      investment: Math.round(base.investment + oscillation * 44_000 + progress * 28_000),
    });
  }
  return history;
}

function generateYearToDateHistory(): InsightHistory[] {
  const now = new Date();
  const months = now.getMonth() + 1;
  const base = {
    checking: 1_150_000,
    savings: 500_000,
    credit: 260_000,
    investment: 900_000,
  };

  const history: InsightHistory[] = [];
  for (let month = 0; month < months; month += 1) {
    const date = new Date(Date.UTC(now.getFullYear(), month, 1));
    const progress = (month + 1) / months;
    const oscillation = Math.cos(progress * Math.PI * 1.2);

    history.push({
      x: date.toISOString(),
      checking: Math.round(base.checking + progress * 45_000 + oscillation * 35_000),
      savings: Math.round(base.savings + progress * 65_000 + oscillation * 28_000),
      credit: Math.round(base.credit - progress * 22_000 - oscillation * 18_000),
      investment: Math.round(base.investment + progress * 85_000 + oscillation * 40_000),
    });
  }

  return history;
}

function buildRecommendations(range: InsightRange, expenses: number, net: number) {
  const monthlyProjection =
    range === "ytd" ? Math.round(net / Math.max(1, new Date().getMonth() + 1)) : net;
  const restaurantSavings = Math.round(expenses * 0.1);
  const renegotiationTarget = Math.round(expenses * 0.08);

  return [
    {
      title: "Reduce restaurantes con IA",
      body: `Si bajas tus salidas a restaurantes un 10% ahorrarás ${CLP.format(restaurantSavings)} al mes. Puedo recordártelo con resúmenes semanales adaptados a tus hábitos.`,
      icon: "dining",
    },
    {
      title: "Renegocia tu arriendo",
      body: `Tus gastos fijos subieron 8% este trimestre. Negociar el arriendo podría liberar ${CLP.format(renegotiationTarget)} para tu próximo objetivo de ahorro.`,
      icon: "growth",
    },
    {
      title: "Automatiza tu ahorro",
      body: `Activa un traspaso automático de ${CLP.format(Math.max(monthlyProjection, 180_000))} y deja que Salomón AI lo refuerce con la voz que configuraste en preferencias.`,
      icon: "piggy",
    },
  ];
}

export function getDemoInsights(range: InsightRange): InsightDTO {
  const factor = getRangeFactor(range);
  const income = Math.round(BASE_INCOME * factor);
  const expenses = Math.round(BASE_EXPENSES * factor);
  const net = income - expenses;

  const kpis: InsightDTO["kpis"] = [
    { label: "Ingresos", amount: income, delta: 0.08, kind: "ingresos" },
    { label: "Gastos", amount: expenses, delta: -0.05, kind: "gastos" },
    { label: "Flujo neto", amount: net, delta: 0.04, kind: "neto" },
  ];

  const topCategories = CATEGORY_SHARES.map(({ category, share }) => ({
    category,
    amount: Math.round(expenses * share),
    pct: share,
  }));

  const history =
    range === "ytd"
      ? generateYearToDateHistory()
      : generateDailyHistory(range === "today" ? 1 : range === "7d" ? 7 : 30);

  const recommendations = buildRecommendations(range, expenses, net);

  return {
    kpis,
    topCategories,
    history,
    recommendations,
    updatedAt: new Date().toISOString(),
  };
}
