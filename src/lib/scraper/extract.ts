import * as cheerio from "cheerio";

export type PageContext = {
  url: string;
  title: string;
  description: string;
  ogImage?: string;
  bodyText: string;
};

const MAX_BODY_CHARS = 4_000;

function meta($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const sel of selectors) {
    const val = $(sel).attr("content")?.trim() ?? $(sel).text()?.trim();
    if (val) return val;
  }
  return "";
}

export function extractPageContext(url: string, html: string): PageContext {
  const $ = cheerio.load(html);

  $("script, style, nav, footer, noscript").remove();

  const title =
    meta($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    $("title").first().text().trim() ||
    new URL(url).hostname;

  const description =
    meta($, [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ]) || "";

  const ogImage = meta($, [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  ]);

  const h1 = $("h1").first().text().trim();
  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 40)
    .slice(0, 6)
    .join("\n");

  const bodyText = [h1, paragraphs].filter(Boolean).join("\n\n").slice(0, MAX_BODY_CHARS);

  return { url, title, description, ogImage: ogImage || undefined, bodyText };
}
