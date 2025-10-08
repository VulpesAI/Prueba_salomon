import { ChatResponse, SendPayload } from '@/lib/store/chatTypes';

export async function sendChatMessage(payload: SendPayload): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('No se pudo enviar el mensaje.');
  }

  const data = (await response.json()) as ChatResponse;
  return data;
}
