import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function streamTokens(text: string, controller: ReadableStreamDefaultController<string>) {
  const tokens = text.split(/(\s+)/);
  let index = 0;

  const send = () => {
    if (index >= tokens.length) {
      controller.enqueue(
        `event: message_end\ndata: ${JSON.stringify({ message_id: crypto.randomUUID() })}\n\n`
      );
      controller.close();
      return;
    }

    const event = { type: 'token', value: tokens[index] };
    index += 1;
    controller.enqueue(`event: token\ndata: ${JSON.stringify(event)}\n\n`);
    setTimeout(send, 50);
  };

  send();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('q') ?? 'Hola, ¿en qué te ayudo?';
  const responseText = `Claro. Sobre “${prompt}”, aquí va una respuesta simulada por tokens con SSE para probar el typing…`;

  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue('event: ping\ndata: {}\n\n');
      streamTokens(responseText, controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
