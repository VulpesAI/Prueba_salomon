import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { messages, model = "gpt-4o-mini", temperature = 0.2 } = await req.json();
  const response = await client.chat.completions.create({
    model,
    temperature,
    messages,
  });

  const reply = response.choices[0]?.message?.content ?? "";
  return Response.json({ reply });
}
