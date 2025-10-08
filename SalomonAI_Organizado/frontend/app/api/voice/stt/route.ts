import type { SttResponse } from '@/lib/store/chatTypes';

export async function POST() {
  const body: SttResponse = {
    transcript: 'transcripción simulada desde audio',
  };
  return Response.json(body, { status: 200 });
}
