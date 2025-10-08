"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRoundTrip } from "@/components/VoiceRoundTrip";
import { Badge } from "@/components/ui/badge";
import { streamSSE } from "@/lib/chatStream";

const SYSTEM_MESSAGE = {
  role: "system" as const,
  content: "Eres SalomónAI (es-CL), un asesor financiero concreto y accionable.",
};

const RETRY_DELAY_MS = 600;

type ConversationMessage = { role: "user" | "assistant"; content: string };

type IntentSignal = { name: string; score: number } | null;

type InsightSignal = { id: string; kind: string; payload: unknown };

export default function AssistantPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [intent, setIntent] = useState<IntentSignal>(null);
  const [insights, setInsights] = useState<InsightSignal[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isStreaming) return;

    setDraft("");
    setError(null);
    setIntent(null);

    const userMessage: ConversationMessage = { role: "user", content: text };
    const history = [...messages, userMessage];

    setMessages([...history, { role: "assistant", content: "" }]);

    await startStreaming(history);
  };

  const startStreaming = async (history: ConversationMessage[], attempt = 0): Promise<void> => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    if (attempt > 0) {
      setMessages((prev) => {
        if (prev[prev.length - 1]?.role !== "assistant") return prev;
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "" };
        return next;
      });
    }

    try {
      await streamSSE(
        {
          messages: [SYSTEM_MESSAGE, ...history],
        },
        (event) => {
          switch (event?.type) {
            case "delta": {
              if (typeof event.text !== "string" || event.text.length === 0) return;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (!last || last.role !== "assistant") {
                  return prev;
                }
                next[next.length - 1] = {
                  role: "assistant",
                  content: `${last.content}${event.text}`,
                };
                return next;
              });
              break;
            }
            case "intent": {
              if (typeof event.name === "string" && typeof event.score === "number") {
                setIntent({ name: event.name, score: event.score });
              }
              break;
            }
            case "insight": {
              if (typeof event.kind !== "string") return;
              const id = `${event.kind}-${JSON.stringify(event.payload ?? {})}`;
              setInsights((prev) => {
                if (prev.some((insight) => insight.id === id)) {
                  return prev;
                }
                return [...prev, { id, kind: event.kind, payload: event.payload }];
              });
              break;
            }
            case "done": {
              setIsStreaming(false);
              break;
            }
            default:
              break;
          }
        },
        controller.signal,
      );
    } catch (streamError) {
      if (controller.signal.aborted) {
        return;
      }

      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return startStreaming(history, attempt + 1);
      }

      console.error("SSE streaming failed", streamError);
      setError("No pudimos completar el streaming. Intenta nuevamente.");
      setMessages((prev) => prev.slice(0, prev.length - 1));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  const cancelStreaming = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Asistente financiero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {intent ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Intento detectado:</span>
              <Badge variant="secondary">{intent.name}</Badge>
              <span>{Math.round(intent.score * 100)}%</span>
            </div>
          ) : null}

          {insights.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Insights:</span>
              {insights.map((insight) => (
                <Badge key={insight.id} variant="outline">#{insight.kind}</Badge>
              ))}
            </div>
          ) : null}

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
              <Button type="submit" disabled={isStreaming || draft.trim().length === 0}>
                {isStreaming ? "Enviando…" : "Enviar"}
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
