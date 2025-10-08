import OpenAI from "openai";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { text, voice = "alloy", format = "mp3", language = "es-CL" } = await req.json();
  const result = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    format,
    language,
  });

  const audio = Buffer.from(await result.arrayBuffer());

  return Response.json({
    mime: `audio/${format}`,
    audio_base64: audio.toString("base64"),
    provider: "openai",
  });
}
