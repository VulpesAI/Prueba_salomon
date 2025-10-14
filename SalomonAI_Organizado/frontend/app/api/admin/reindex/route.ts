import { NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export const runtime = "nodejs";

export async function POST() {
  if (!ENV.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }
  // Aquí va lógica admin que requiera service role o SB_SECRET_KEY.
  // Nunca exportes estos valores al cliente.
  return NextResponse.json({ ok: true });
}
