import { NextRequest } from "next/server";
import { postFeedback } from "@/lib/adapters/recommendations";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const res = await postFeedback(payload);
  return Response.json(res, { status: 200 });
}
