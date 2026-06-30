import { extractPageContext, type PageContext } from "@/lib/scraper/extract";

const USER_AGENT =
  "Mozilla/5.0 (compatible; UGCraft/1.0; +https://ugcraft.app)";

const FETCH_TIMEOUT_MS = 15_000;

export async function fetchPage(url: string): Promise<PageContext> {
  const normalized = new URL(url).toString();

  const res = await fetch(normalized, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Could not fetch ${normalized} (${res.status})`);
  }

  const html = await res.text();
  return extractPageContext(normalized, html);
}

export function fallbackPageContext(url: string): PageContext {
  const parsed = new URL(url);
  return {
    url: parsed.toString(),
    title: parsed.hostname.replace(/^www\./, ""),
    description: "",
    bodyText: `Product website: ${parsed.hostname}`,
  };
}
