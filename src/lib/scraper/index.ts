import { fetchPage, fallbackPageContext } from "@/lib/scraper/fetch-page";
import { summarizeProduct, type ProductSummary } from "@/lib/scraper/summarize";
import type { PageContext } from "@/lib/scraper/extract";

export type ScrapeResult = {
  page: PageContext;
  product: ProductSummary;
};

export async function scrapeAndSummarize(url: string): Promise<ScrapeResult> {
  let page: PageContext;

  try {
    page = await fetchPage(url);
  } catch {
    page = fallbackPageContext(url);
  }

  const product = await summarizeProduct(page);
  return { page, product };
}

export { fetchPage, fallbackPageContext } from "@/lib/scraper/fetch-page";
export { summarizeProduct } from "@/lib/scraper/summarize";
export { extractPageContext } from "@/lib/scraper/extract";
export type { PageContext } from "@/lib/scraper/extract";
export type { ProductSummary } from "@/lib/scraper/summarize";
