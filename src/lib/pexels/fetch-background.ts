export type PexelsVideoFile = {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
};

export type PexelsVideo = {
  id: number;
  url: string;
  width: number;
  height: number;
  video_files: PexelsVideoFile[];
};

type PexelsSearchResponse = {
  videos: PexelsVideo[];
};

const PEXELS_SEARCH = "https://api.pexels.com/videos/search";

function pickBestFile(files: PexelsVideoFile[]): PexelsVideoFile | null {
  const mp4s = files.filter((f) => f.file_type === "video/mp4");
  if (!mp4s.length) return null;

  const portrait = mp4s.filter((f) => f.height >= f.width);
  const pool = portrait.length ? portrait : mp4s;

  const score = (f: PexelsVideoFile) => {
    const portraitBonus = f.height > f.width ? 1_000 : 0;
    const hdBonus = f.quality === "hd" ? 500 : 0;
    const size = f.width * f.height;
    return portraitBonus + hdBonus + size;
  };

  return pool.sort((a, b) => score(b) - score(a))[0];
}

export async function fetchPexelsBackground(
  query: string,
): Promise<{ url: string; pageUrl: string }> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("PEXELS_API_KEY is not set");
  }

  const params = new URLSearchParams({
    query,
    per_page: "8",
    orientation: "portrait",
  });

  const res = await fetch(`${PEXELS_SEARCH}?${params}`, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Pexels search failed (${res.status})`);
  }

  const json = (await res.json()) as PexelsSearchResponse;
  if (!json.videos?.length) {
    throw new Error(`No Pexels videos for query: ${query}`);
  }

  for (const video of json.videos) {
    const file = pickBestFile(video.video_files);
    if (file) {
      return { url: file.link, pageUrl: video.url };
    }
  }

  throw new Error(`No usable MP4 files for query: ${query}`);
}
