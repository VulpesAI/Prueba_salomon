import { authHeader } from "@/lib/api";

type Message = { role: string; content: string };

type StreamInput = {
  messages: Message[];
};

export async function streamChatSSE(
  input: StreamInput,
  onToken: (token: string) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/conversation/stream-sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error("SSE connection failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const chunk of parts) {
      if (chunk.startsWith("data:")) {
        const data = chunk.slice(5).trim();
        if (data === "[DONE]") {
          return;
        }
        onToken(data);
      }
    }
  }
}

export function streamChatWS(
  onToken: (token: string) => void,
  onOpen?: () => void,
  onClose?: () => void,
) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const url = base.replace(/^http/, "ws") + "/conversation/stream";
  const socket = new WebSocket(url);

  socket.onopen = () => onOpen?.();
  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data as string);
      if (payload?.type === "delta" && typeof payload.text === "string") {
        onToken(payload.text);
      }
    } catch (error) {
      console.warn("Mensaje WS inválido", error);
    }
  };
  socket.onclose = () => onClose?.();

  return {
    send: (payload: Message) => socket.send(JSON.stringify(payload)),
    close: () => socket.close(),
  };
}
