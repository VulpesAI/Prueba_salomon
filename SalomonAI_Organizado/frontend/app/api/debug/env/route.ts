import { NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    serverSees: Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY),
    urlLen: ENV.SUPABASE_URL?.length ?? 0,
    anonKeyLen: ENV.SUPABASE_ANON_KEY?.length ?? 0,
  });
}
