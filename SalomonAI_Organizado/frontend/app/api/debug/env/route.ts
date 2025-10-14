import { NextResponse } from "next/server";

export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return NextResponse.json({ serverSeesEnv: hasUrl && hasAnon });
}
