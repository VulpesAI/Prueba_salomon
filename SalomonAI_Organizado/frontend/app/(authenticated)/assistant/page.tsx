"use client";

import { FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRoundTrip } from "@/components/VoiceRoundTrip";
import { streamChatSSE } from "@/lib/chatStream";
import { useChatSync } from "@/lib/hooks";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_MESSAGE = {
  role: "system" as const,
  content:
    "Eres SalomónAI, un asesor financiero especializado en optimizar decisiones con datos reales.",
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatSync = useChatSync();

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setError(null);
    setDraft("");
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: Message = { role: "user", content: text };
    const conversationHistory = [...messages, userMessage];
    setMessages((current) => [...current, userMessage, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      await streamChatSSE(
        { messages: [SYSTEM_MESSAGE, ...conversationHistory] },
        (delta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                role: "assistant",
                content: `${last.content}${delta}`,
              };
            }
            return next;
          });
        },
        controller.signal,
      );
    } catch (streamError) {
      console.warn("Fallo SSE, usando fallback", streamError);
      try {
        const response = await chatSync.mutateAsync({
          messages: [SYSTEM_MESSAGE, ...conversationHistory],
        });
        setMessages((prev) => {
          const next = [...prev];
          if (next[next.length - 1]?.role === "assistant") {
            next[next.length - 1] = { role: "assistant", content: response.reply };
          }
          return next;
        });
      } catch (fallbackError) {
        setError((fallbackError as Error).message);
        setMessages((prev) => prev.filter((_, index) => index < prev.length - 1));
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const cancelStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Asistente financiero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[60vh] overflow-y-auto rounded-md border p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inicia una conversación para recibir recomendaciones basadas en tus datos reales.
              </p>
            ) : (
              <ul className="space-y-3">
                {messages.map((message, index) => (
                  <li
                    key={`${message.role}-${index}`}
                    className={message.role === "user" ? "text-right" : "text-left"}
                  >
                    <span
                      className={
                        message.role === "user"
                          ? "inline-block max-w-[80%] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                          : "inline-block max-w-[80%] rounded-md bg-muted px-3 py-2 text-sm"
                      }
                    >
                      {message.content}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <form onSubmit={handleSend} className="space-y-2">
            <Textarea
              placeholder="Escribe tu pregunta aquí"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={isStreaming}>
                Enviar
              </Button>
              <Button type="button" variant="outline" onClick={cancelStreaming} disabled={!isStreaming}>
                Detener
              </Button>
              <VoiceRoundTrip />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
