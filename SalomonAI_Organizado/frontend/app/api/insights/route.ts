import { NextResponse, type NextRequest } from "next/server";

import { getDemoInsights } from "@/lib/insights/demo";
import { InsightRangeSchema, InsightSchema } from "@/lib/insights/schema";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "30d";
  const parsedRange = InsightRangeSchema.safeParse(rangeParam);
  const range = parsedRange.success ? parsedRange.data : "30d";

  const payload = InsightSchema.parse(getDemoInsights(range));
  return NextResponse.json(payload, { status: 200 });
}
