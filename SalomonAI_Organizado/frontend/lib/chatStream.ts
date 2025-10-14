import { API_BASE, apiUrl, authHeader } from "@/lib/api";

type Message = { role: "system" | "user" | "assistant"; content: string };

type StreamPayload = {
  messages: Message[];
  model?: string;
  temperature?: number;
};

type ChatEvent =
  | { type: "delta"; text?: string }
  | { type: "intent"; name: string; score: number }
  | { type: "insight"; kind: string; payload: unknown }
  | { type: "done" }
  | Record<string, unknown>;

const timeoutMs = Number(process.env.NEXT_PUBLIC_SSE_TIMEOUT_MS ?? "60000");

export async function streamSSE(
  payload: StreamPayload,
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
) {
  const controller = new AbortController();

  if (signal?.aborted) {
    controller.abort(signal.reason);
  } else if (signal) {
    signal.addEventListener(
      "abort",
      () => {
        controller.abort(signal.reason);
      },
      { once: true },
    );
  }

  const timer = setTimeout(() => {
    controller.abort(new DOMException("SSE timeout", "TimeoutError"));
  }, timeoutMs);

  try {
    const res = await fetch(apiUrl('/conversation/stream-sse'), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error("sse_failed");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const flushBuffer = (chunk: string) => {
      const lines = chunk.split("\n");
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");

      if (!data) return false;

      try {
        const parsed = JSON.parse(data) as ChatEvent;
        onEvent(parsed);
        return parsed?.type === "done";
      } catch (error) {
        console.warn("SSE event parse error", error, data);
      }

      return false;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          const shouldStop = flushBuffer(buffer.trim());
          buffer = "";
          if (shouldStop) {
            break;
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);
        const shouldStop = flushBuffer(raw);
        if (shouldStop) {
          return;
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function streamChatSSE(
  payload: StreamPayload,
  onToken: (token: string) => void,
  signal?: AbortSignal,
) {
  await streamSSE(
    payload,
    (event) => {
      if (event?.type === "delta" && typeof event.text === "string") {
        onToken(event.text);
      }
    },
    signal,
  );
}

export function streamChatWS(
  onToken: (token: string) => void,
  onOpen?: () => void,
  onClose?: () => void,
) {
  const httpBase =
    API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
  const url = httpBase.replace(/^http/, "ws") + "/conversation/stream";
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
