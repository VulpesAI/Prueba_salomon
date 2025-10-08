const DAY_MS = 24 * 60 * 60 * 1000;

function createSeries(horizon: number) {
  const length = Math.max(1, Math.min(Number.isFinite(horizon) ? horizon : 30, 30));
  const today = new Date();

  return Array.from({ length }, (_, index) => {
    const date = new Date(today.getTime() + index * DAY_MS);
    const value = 1000 + index * 25;
    return {
      date: date.toISOString().slice(0, 10),
      value: Math.round(value * 100) / 100,
    };
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const horizon = Number(url.searchParams.get("horizon") ?? "30");
  const userId = url.pathname.split("/").pop() ?? "";
  const series = createSeries(horizon);

  return Response.json({
    model_type: "fallback-linear",
    calculated_at: new Date().toISOString(),
    series,
    user_id: userId,
  });
}
