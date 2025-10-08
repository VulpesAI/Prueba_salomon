import OpenAI from "openai";

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
  const { messages, model = "gpt-4o-mini", temperature = 0.2 } = await req.json();
  const client = getClient();
  const response = await client.chat.completions.create({
    model,
    temperature,
    messages,
  });

  const reply = response.choices[0]?.message?.content ?? "";
  return Response.json({ reply });
}
