import OpenAI from "openai";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { audio_base64, mime = "audio/webm", language = "es" } = await req.json();
  const bytes = Buffer.from(audio_base64, "base64");
  const file = new File([bytes], `audio.${mime.split("/")[1] ?? "webm"}`, { type: mime });
  const transcription = await client.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language,
  });

  const text =
    typeof transcription === "string"
      ? transcription
      : typeof transcription === "object" && transcription !== null && "text" in transcription
        ? (transcription as { text?: unknown }).text ?? ""
        : "";

  return Response.json({
    text: typeof text === "string" ? text : JSON.stringify(text),
    language,
    provider: "openai",
  });
}
