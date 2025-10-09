import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.name || !body?.email || !body?.subject || !body?.message) {
    return NextResponse.json(
      { ok: false, error: "Campos incompletos" },
      { status: 400 }
    );
  }

  // TODO: enviar email / registrar en CRM
  return NextResponse.json({ ok: true });
}
