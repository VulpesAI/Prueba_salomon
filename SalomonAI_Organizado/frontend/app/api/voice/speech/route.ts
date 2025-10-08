import OpenAI from "openai";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!cachedClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

export async function POST(req: Request) {
  const { text, voice = "alloy", format = "mp3" } = await req.json();
  const client = getClient();
  const result = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    response_format: format,
  });

  const audio = Buffer.from(await result.arrayBuffer());

  return Response.json({
    mime: `audio/${format}`,
    audio_base64: audio.toString("base64"),
    provider: "openai",
  });
}
