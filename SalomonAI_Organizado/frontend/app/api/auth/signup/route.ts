import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { email, password, displayName } = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to sign up with Supabase", error);
    return NextResponse.json({ error: "No pudimos crear la cuenta" }, { status: 500 });
  }
}
