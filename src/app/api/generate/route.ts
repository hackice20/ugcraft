import { scrapeAndSummarize } from "@/lib/scraper";
import { summarizeProductFromPrompt } from "@/lib/scraper/summarize";
import { runOrchestrator } from "@/lib/orchestrator";
import { renderReel } from "@/lib/video/render";
import type { UGCBrief } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { url?: string; prompt?: string };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  const prompt = body.prompt?.trim();
  if (!url && !prompt) {
    return Response.json(
      { error: "url or prompt is required" },
      { status: 400 },
    );
  }

  try {
    let effectiveUrl = url;
    let product;
    let page: { title: string; description: string | null };

    if (url) {
      try {
        new URL(url);
      } catch {
        return Response.json({ error: "Invalid URL" }, { status: 400 });
      }
      const scraped = await scrapeAndSummarize(url);
      page = { title: scraped.page.title, description: scraped.page.description };
      product = scraped.product;
    } else {
      const inferred = await summarizeProductFromPrompt(prompt as string);
      const slug = inferred.productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      effectiveUrl = inferred.website || `https://${slug || "brand"}.com`;
      page = {
        title: inferred.productName,
        description: inferred.summary,
      };
      product = {
        productName: inferred.productName,
        category: inferred.category,
        summary: inferred.summary,
      };
    }

    const brief: UGCBrief = await runOrchestrator(
      product,
      effectiveUrl as string,
      prompt ?? undefined,
    );

    const rendered = await renderReel(brief);

    return Response.json({
      url: effectiveUrl,
      mode: url ? "url" : "prompt",
      page: { title: page.title, description: page.description },
      product,
      brief,
      video: {
        url: rendered.video.url,
        mode: rendered.video.mode,
        usedAudio: rendered.usedAudio,
        audioSource: rendered.audioSource,
        audioTitle: rendered.audioTitle,
        gifLabel: rendered.gifLabel,
        gifSearchQuery: rendered.gifSearchQuery,
        gifUrl: rendered.gifUrl,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
