export type TrackPreview = {
  url: string;
  source: "itunes" | "deezer";
  matchedTitle: string;
  matchedArtist: string;
};

function buildQuery(title: string, artist: string): string {
  const cleanArtist =
    artist && artist.toLowerCase() !== "original sound" ? artist : "";
  return [title, cleanArtist].filter(Boolean).join(" ").trim();
}

type ItunesResponse = {
  results: Array<{
    trackName?: string;
    artistName?: string;
    previewUrl?: string;
  }>;
};

function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsToken(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return haystack.includes(needle);
}

function scoreHit(
  targetTitle: string,
  targetArtist: string,
  hitTitle: string,
  hitArtist: string,
): number {
  const tTitle = normalize(targetTitle);
  const tArtist = normalize(targetArtist);
  const hTitle = normalize(hitTitle);
  const hArtist = normalize(hitArtist);

  let score = 0;
  if (containsToken(hTitle, tTitle)) score += 6;
  if (containsToken(tTitle, hTitle)) score += 2;
  if (tArtist && containsToken(hArtist, tArtist)) score += 5;
  if (tArtist && containsToken(tArtist, hArtist)) score += 1;

  const titleTokens = tTitle.split(" ").filter(Boolean);
  const hitTokens = new Set(hTitle.split(" ").filter(Boolean));
  const overlap = titleTokens.filter((w) => hitTokens.has(w)).length;
  score += overlap;

  return score;
}

async function fromItunes(title: string, artist: string): Promise<TrackPreview | null> {
  const query = buildQuery(title, artist);
  const params = new URLSearchParams({
    term: query,
    entity: "song",
    limit: "10",
  });
  const res = await fetch(`https://itunes.apple.com/search?${params}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as ItunesResponse;
  let best:
    | {
        trackName?: string;
        artistName?: string;
        previewUrl?: string;
        score: number;
      }
    | undefined;
  for (const hit of json.results ?? []) {
    if (!hit.previewUrl || !hit.trackName) continue;
    const score = scoreHit(
      title,
      artist,
      hit.trackName ?? "",
      hit.artistName ?? "",
    );
    if (!best || score > best.score) best = { ...hit, score };
  }
  if (!best?.previewUrl || best.score < 5) return null;

  return {
    url: best.previewUrl,
    source: "itunes",
    matchedTitle: best.trackName ?? query,
    matchedArtist: best.artistName ?? "",
  };
}

type DeezerResponse = {
  data: Array<{
    title?: string;
    preview?: string;
    artist?: { name?: string };
  }>;
};

async function fromDeezer(query: string): Promise<TrackPreview | null> {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
    { signal: AbortSignal.timeout(12_000) },
  );
  if (!res.ok) return null;

  const json = (await res.json()) as DeezerResponse;
  const hit = json.data?.[0];
  if (!hit?.preview) return null;

  return {
    url: hit.preview,
    source: "deezer",
    matchedTitle: hit.title ?? query,
    matchedArtist: hit.artist?.name ?? "",
  };
}

export async function fetchTrackPreview(
  title: string,
  artist: string,
): Promise<TrackPreview | null> {
  const query = buildQuery(title, artist);
  if (!query) return null;

  try {
    const itunes = await fromItunes(title, artist);
    if (itunes) return itunes;
  } catch {}

  try {
    return await fromDeezer(query);
  } catch {
    return null;
  }
}
