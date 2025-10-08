import { getRecommendations } from "@/lib/adapters/recommendations";

export async function GET() {
  const data = await getRecommendations();
  return Response.json(data, { status: 200 });
}
