import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session: data.session ?? null });
  } catch (error) {
    console.error("Failed to retrieve Supabase session", error);
    return NextResponse.json({ error: "Unable to retrieve session" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to sign in with Supabase", error);
    return NextResponse.json({ error: "No pudimos iniciar sesión" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to sign out from Supabase", error);
    return NextResponse.json({ error: "No pudimos cerrar sesión" }, { status: 500 });
  }
}
