import { getOpenAIClient, CHAT_MODEL } from "@/lib/chat/openai";
import { buildOrchestratorSystemPrompt } from "@/lib/prompts/load-system-prompt";
import {
  parseOrchestratorOutput,
  type OrchestratorOutput,
} from "@/lib/orchestrator/schema";
import type { UGCBrief } from "@/lib/types";
import type { ProductSummary } from "@/lib/scraper/summarize";

function buildUserPrompt(
  product: ProductSummary,
  url: string,
  userBrief?: string,
): string {
  const lines = [
    userBrief ? `User brief: ${userBrief}` : "",
    `Product URL: ${url}`,
    `Product name: ${product.productName}`,
    `Category: ${product.category}`,
    `Summary: ${product.summary}`,
    "",
    "Create the UGC Reel JSON brief for this product.",
  ];
  return lines.filter(Boolean).join("\n");
}

export function toUGCBrief(output: OrchestratorOutput): UGCBrief {
  return {
    productName: output.productName,
    productSummary: output.productSummary,
    audioVibe: output.audioVibe,
    audioTitle: output.audioTitle,
    audioArtist: output.audioArtist,
    audioReason: output.audioReason,
    audioTrimStartMs: output.audioTrimStartMs,
    audioTrimEndMs: output.audioTrimEndMs,
    textOverlay: output.textOverlay,
    gifEmotion: output.gifEmotion,
    gifSearchQuery: output.gifSearchQuery,
    gifReason: output.gifReason,
    backgroundSearchQuery: output.backgroundSearchQuery,
    vibe: output.vibe,
  };
}

export async function runOrchestrator(
  product: ProductSummary,
  url: string,
  userBrief?: string,
): Promise<UGCBrief> {
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.95,
    max_tokens: 650,
    messages: [
      { role: "system", content: buildOrchestratorSystemPrompt() },
      { role: "user", content: buildUserPrompt(product, url, userBrief) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty orchestrator response");

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("Orchestrator returned invalid JSON");
  }

  return toUGCBrief(parseOrchestratorOutput(raw));
}
