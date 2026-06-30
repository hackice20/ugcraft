import {
  emotionSearchQueries,
  scoreEmotionTitle,
} from "@/lib/gif/emotion-search";

export type GiphyGif = {
  id: string;
  url: string;
  width: number;
  height: number;
  title: string;
};

export type ResolvedGif = {
  searchQuery: string;
  label: string;
  giphyId: string;
  url: string;
  width: number;
  height: number;
};

type GiphySearchResponse = {
  data: Array<{
    id: string;
    title: string;
    images: {
      downsized: { url: string; width: string; height: string };
      fixed_height: { url: string; width: string; height: string };
    };
  }>;
};

const GIPHY_SEARCH = "https://api.giphy.com/v1/gifs/search";

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "gif",
  "meme",
  "reaction",
]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function scoreQueryMatch(title: string, query: string): number {
  const hay = ` ${title.toLowerCase()} `;
  const tokens = tokenize(query);
  return tokens.reduce((sum, tok) => (hay.includes(` ${tok} `) ? sum + 2 : sum), 0);
}

function toGiphyGif(
  item: GiphySearchResponse["data"][number],
  img: { url: string; width: string; height: string },
): GiphyGif {
  return {
    id: item.id,
    url: img.url,
    width: parseInt(img.width, 10) || 480,
    height: parseInt(img.height, 10) || 480,
    title: item.title,
  };
}

function buildQueries(gifSearchQuery: string, gifEmotion: string): string[] {
  const base = gifSearchQuery.trim();
  const emotionQueries = emotionSearchQueries(gifEmotion, base);
  return [...new Set([base, `${gifEmotion} ${base}`, ...emotionQueries])];
}

export async function resolveGif(
  apiKey: string,
  gifSearchQuery: string,
  gifEmotion: string,
): Promise<ResolvedGif | null> {
  const queries = buildQueries(gifSearchQuery, gifEmotion);
  const seen = new Set<string>();
  const scored: { gif: GiphyGif; score: number }[] = [];

  for (const query of queries) {
    const params = new URLSearchParams({
      api_key: apiKey,
      q: query,
      limit: "25",
      rating: "pg-13",
      lang: "en",
    });

    const res = await fetch(`${GIPHY_SEARCH}?${params}`);
    if (!res.ok) continue;

    const json = (await res.json()) as GiphySearchResponse;
    for (const item of json.data ?? []) {
      const img = item.images.downsized?.url
        ? item.images.downsized
        : item.images.fixed_height;
      if (!img?.url || seen.has(item.id)) continue;
      seen.add(item.id);

      const title = item.title ?? "";
      const score =
        scoreEmotionTitle(title, gifEmotion) * 4 +
        scoreQueryMatch(title, gifSearchQuery) * 3 +
        scoreQueryMatch(title, query);

      scored.push({ gif: toGiphyGif(item, img), score });
    }
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  const pick = scored[0].gif;

  return {
    searchQuery: gifSearchQuery,
    label: pick.title || gifSearchQuery,
    giphyId: pick.id,
    url: pick.url,
    width: pick.width,
    height: pick.height,
  };
}
