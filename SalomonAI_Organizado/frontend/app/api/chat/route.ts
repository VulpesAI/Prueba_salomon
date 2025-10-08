import { NextRequest } from 'next/server';

import type { ChatResponse } from '@/lib/store/chatTypes';

export async function POST(request: NextRequest) {
  const { input, user_id: userId } = (await request.json()) as { input: string; user_id: string };
  const now = new Date().toISOString();
  const message = {
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    content: `Entendido, ${userId}. Me dijiste: “${input}”. Aquí tienes una respuesta completa (no-stream).`,
    created_at: now,
  };
  const body: ChatResponse = {
    conversation_id: 'conv-demo-1',
    message,
  };
  return Response.json(body, { status: 200 });
}
