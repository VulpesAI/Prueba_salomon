import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { email, redirectTo } = (await request.json()) as {
      email?: string;
      redirectTo?: string;
    };

    if (!email) {
      return NextResponse.json({ error: "Email es requerido" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset password with Supabase", error);
    return NextResponse.json({ error: "No pudimos enviar el correo" }, { status: 500 });
  }
}
