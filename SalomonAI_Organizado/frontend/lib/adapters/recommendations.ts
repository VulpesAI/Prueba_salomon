import {
  FeedbackPayload,
  FeedbackResponse,
  Recommendation,
  RecommendationsResponse,
} from "@/types/recommendations";

const recommendations: Recommendation[] = [
  {
    id: "recom-001",
    title: "Renegocia tu crédito de consumo",
    description:
      "Detectamos que pagas una tasa superior al promedio del mercado. Cotiza una refinanciación para bajar tus dividendos.",
    priority: "HIGH",
    score: 96,
    evidence: [
      { label: "Tasa actual", value: "34,2%" },
      { label: "Ahorro estimado", value: "$85.000 mensuales" },
    ],
    created_at: "2024-10-05T12:00:00.000Z",
    updated_at: "2024-12-12T09:15:00.000Z",
  },
  {
    id: "recom-002",
    title: "Contrata un seguro de salud complementario",
    description:
      "Tus gastos médicos superaron el 25% de tus ingresos en los últimos 6 meses. Un seguro te permitiría cubrir excedentes.",
    priority: "HIGH",
    score: 88,
    evidence: [
      { label: "Gasto en salud", value: "$1.200.000 en 6 meses" },
      { label: "Cobertura sugerida", value: "$45.000 mensual" },
    ],
    created_at: "2024-09-17T12:00:00.000Z",
    updated_at: "2024-12-10T16:42:00.000Z",
  },
  {
    id: "recom-003",
    title: "Automatiza un ahorro para tu fondo de emergencia",
    description:
      "Aún no alcanzas el equivalente a tres meses de gastos fijos. Programa un ahorro automático.",
    priority: "MEDIUM",
    score: 64,
    evidence: [{ label: "Cobertura actual", value: "1,4 meses" }],
    created_at: "2024-08-01T12:00:00.000Z",
    updated_at: "2024-12-01T08:30:00.000Z",
  },
  {
    id: "recom-004",
    title: "Analiza tus suscripciones recurrentes",
    description:
      "Pagas 9 servicios que no usas hace más de 3 meses. Considera cancelarlos para liberar flujo de caja.",
    priority: "MEDIUM",
    score: 59,
    evidence: [
      { label: "Servicios inactivos", value: "9 suscripciones" },
      { label: "Gasto potencial", value: "$42.500 mensual" },
    ],
    created_at: "2024-07-22T12:00:00.000Z",
    updated_at: "2024-11-21T10:05:00.000Z",
  },
  {
    id: "recom-005",
    title: "Aprovecha beneficios de restaurantes",
    description:
      "Tu tarjeta acumula cashback en comercios asociados. Activa la promoción para recuperar gastos en salidas.",
    priority: "LOW",
    score: 37,
    evidence: [{ label: "Gasto en restaurantes", value: "25% del total" }],
    created_at: "2024-06-11T12:00:00.000Z",
    updated_at: "2024-10-02T18:00:00.000Z",
  },
];

function priorityOrder(priority: Recommendation["priority"]): number {
  switch (priority) {
    case "HIGH":
      return 0;
    case "MEDIUM":
      return 1;
    default:
      return 2;
  }
}

function sortRecommendations(items: Recommendation[]): Recommendation[] {
  return items.sort((a, b) => {
    const pr = priorityOrder(a.priority) - priorityOrder(b.priority);
    if (pr !== 0) return pr;
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  const items = recommendations.map((item) => ({ ...item, evidence: item.evidence?.map((e) => ({ ...e })) }));
  return { items: sortRecommendations(items) };
}

export async function postFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  const idx = recommendations.findIndex((item) => item.id === payload.recommendation_id);

  if (idx !== -1) {
    const current = recommendations[idx];
    const nextScore = current.score + payload.score;
    const updated: Recommendation = {
      ...current,
      score: nextScore,
      updated_at: new Date().toISOString(),
    };

    recommendations[idx] = updated;

    return {
      status: "ok",
      updated: { recommendation_id: payload.recommendation_id, score: nextScore },
    };
  }

  return { status: "ok" };
}
