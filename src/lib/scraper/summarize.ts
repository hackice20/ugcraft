import { getOpenAIClient, CHAT_MODEL } from "@/lib/chat/openai";
import type { PageContext } from "@/lib/scraper/extract";

export type ProductSummary = {
  summary: string;
  productName: string;
  category: string;
};

type PromptSummary = ProductSummary & {
  website?: string;
};

export async function summarizeProduct(
  page: PageContext,
): Promise<ProductSummary> {
  const openai = getOpenAIClient();

  const context = [
    `URL: ${page.url}`,
    `Title: ${page.title}`,
    page.description ? `Meta description: ${page.description}` : "",
    page.bodyText ? `Page content:\n${page.bodyText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content:
          "Summarize this product/company for a UGC video brief. Return JSON: " +
          '{ "productName": string, "category": string (e.g. fitness, fintech, beauty), "summary": string (2-3 sentences, what they do + vibe) }',
      },
      { role: "user", content: context },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty summary from OpenAI");

  const parsed = JSON.parse(raw) as ProductSummary;
  return {
    productName: parsed.productName || page.title,
    category: parsed.category || "general",
    summary: parsed.summary || page.description || page.title,
  };
}

/**
 * Fallback when the user doesn't provide a URL, e.g.:
 * "make a reel for spotify" / "create ugc for notion ai"
 */
export async function summarizeProductFromPrompt(
  prompt: string,
): Promise<PromptSummary> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 260,
    messages: [
      {
        role: "system",
        content:
          "Infer the intended company/product from the user's text and return JSON: " +
          '{ "productName": string, "category": string, "summary": string, "website": string|null }. ' +
          "The summary should be 2 short sentences describing what it does and the vibe. " +
          "If no confident company is present, still infer a likely product concept from the text.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty summary from OpenAI");

  const parsed = JSON.parse(raw) as PromptSummary;
  return {
    productName: parsed.productName || "Product",
    category: parsed.category || "general",
    summary: parsed.summary || prompt,
    website: parsed.website || undefined,
  };
}
