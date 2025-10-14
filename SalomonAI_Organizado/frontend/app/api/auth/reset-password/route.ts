import { NextResponse } from "next/server"

import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const { email, redirectTo } = (await request.json()) as {
      email?: string
      redirectTo?: string
    }

    if (!email) {
      return NextResponse.json(
        { error: "El correo es requerido" },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to request Supabase password reset", error)
    return NextResponse.json(
      { error: "No pudimos enviar el correo de recuperación" },
      { status: 500 }
    )
  }
}
