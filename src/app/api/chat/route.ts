import type OpenAI from "openai";
import { getChatSystemPrompt } from "@/lib/prompts/load-system-prompt";
import { getOpenAIClient, CHAT_MODEL } from "@/lib/chat/openai";
import {
  parseIntent,
  intentHeaderValue,
  type ChatIntent,
} from "@/lib/chat/intent";

export const runtime = "nodejs";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildMessages(
  history: IncomingMessage[],
  intent: ChatIntent,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const systemParts = [getChatSystemPrompt()];

  if (intent.type === "video_request") {
    systemParts.push(
      `\nThe user just shared a product URL: ${intent.url}\n` +
        `Acknowledge you're cooking their UGC reel. Keep it short and hyped. ` +
        `Video generation pipeline will handle the rest.`,
    );
  }

  return [
    { role: "system", content: systemParts.join("\n") },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
}

export async function POST(req: Request) {
  let body: { messages?: IncomingMessage[] };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages;
  if (!messages?.length) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return Response.json(
      { error: "Last message must be from user" },
      { status: 400 },
    );
  }

  const intent = parseIntent(last.content);

  let openai;
  try {
    openai = getOpenAIClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI not configured";
    return Response.json({ error: msg }, { status: 500 });
  }

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: buildMessages(messages, intent),
    stream: true,
    temperature: 0.8,
    max_tokens: 300,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-UGCraft-Intent": intentHeaderValue(intent),
  };

  if (intent.type === "video_request") {
    headers["X-UGCraft-Url"] = intent.url;
  }

  return new Response(stream, { headers });
}
