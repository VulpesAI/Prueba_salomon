import { NextResponse } from 'next/server';

const COOKIE = 'salomon_settings';

function readCookie(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match[1])); } catch { return null; }
}

function writeCookie(dto: unknown) {
  const serialized = encodeURIComponent(JSON.stringify(dto));
  return `${COOKIE}=${serialized}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}

const DEFAULTS = {
  voice: 'alloy',
  theme: 'dark',
  updatedAt: new Date().toISOString()
};

export async function GET(request: Request) {
  const existing = readCookie(request);
  const dto = existing ?? DEFAULTS;
  const res = NextResponse.json(dto, { status: 200 });
  res.headers.set('Set-Cookie', writeCookie(dto));
  return res;
}

export async function PUT(request: Request) {
  const body = await request.json();
  const dto = {
    voice: body?.voice ?? 'alloy',
    theme: body?.theme ?? 'dark',
    updatedAt: new Date().toISOString()
  };
  const res = NextResponse.json(dto, { status: 200 });
  res.headers.set('Set-Cookie', writeCookie(dto));
  return res;
}
