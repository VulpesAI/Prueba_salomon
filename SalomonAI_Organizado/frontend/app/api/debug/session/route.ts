import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return NextResponse.json({ user: data.user ? { id: data.user.id, email: data.user.email } : null });
}
