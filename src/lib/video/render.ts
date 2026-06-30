import { rm } from "fs/promises";
import { fetchTrackPreview } from "@/lib/audio/preview-fetch";
import { resolveGif } from "@/lib/gif/resolver";
import { fetchPexelsBackground } from "@/lib/pexels";
import { saveVideo, type SavedVideo } from "@/lib/storage";
import { composeReel } from "@/lib/video/compose";
import { downloadToFile } from "@/lib/video/download";
import type { UGCBrief } from "@/lib/types";

export type RenderedReel = {
  video: SavedVideo;
  usedAudio: boolean;
  audioSource: "itunes" | "deezer" | "none";
  audioTitle: string;
  gifLabel: string;
  gifSearchQuery: string;
  gifUrl: string;
  backgroundQuery: string;
};

type PreparedAudio = {
  filePath: string;
  startSec: number;
  durationSec: number;
  source: "itunes" | "deezer";
  title: string;
  cleanupPath?: string;
};

async function prepareAudio(brief: UGCBrief): Promise<PreparedAudio | null> {
  const briefDuration = Math.min(
    Math.max((brief.audioTrimEndMs - brief.audioTrimStartMs) / 1000, 5),
    10,
  );

  const preview = await fetchTrackPreview(brief.audioTitle, brief.audioArtist);
  if (!preview) return null;

  const ext = preview.url.includes(".mp3") ? ".mp3" : ".m4a";
  const tempPath = await downloadToFile(preview.url, ext);

  return {
    filePath: tempPath,
    startSec: 0,
    durationSec: Math.min(briefDuration, 28),
    source: preview.source,
    title: `${preview.matchedTitle}${preview.matchedArtist ? " — " + preview.matchedArtist : ""}`,
    cleanupPath: tempPath,
  };
}

export async function renderReel(brief: UGCBrief): Promise<RenderedReel> {
  const giphyKey = process.env.GIPHY_API_KEY;
  if (!giphyKey) throw new Error("GIPHY_API_KEY is not set");

  const [gif, bg, audio] = await Promise.all([
    resolveGif(giphyKey, brief.gifSearchQuery, brief.gifEmotion),
    fetchPexelsBackground(brief.backgroundSearchQuery),
    prepareAudio(brief),
  ]);

  if (!gif) {
    throw new Error(`Could not resolve GIF for "${brief.gifSearchQuery}"`);
  }

  const [bgPath, gifPath] = await Promise.all([
    downloadToFile(bg.url, ".mp4"),
    downloadToFile(gif.url, ".gif"),
  ]);

  const durationSec = audio?.durationSec ?? 8;

  try {
    const { buffer } = await composeReel({
      backgroundPath: bgPath,
      gifPath,
      audioPath: audio?.filePath,
      audioStartSec: audio?.startSec ?? 0,
      textOverlay: brief.textOverlay,
      durationSec,
    });

    const video = await saveVideo(buffer);

    return {
      video,
      usedAudio: Boolean(audio),
      audioSource: audio?.source ?? "none",
      audioTitle: audio?.title ?? `${brief.audioTitle} — ${brief.audioArtist}`,
      gifLabel: gif.label,
      gifSearchQuery: gif.searchQuery,
      gifUrl: gif.url,
      backgroundQuery: brief.backgroundSearchQuery,
    };
  } finally {
    await Promise.allSettled([
      rm(bgPath, { force: true }),
      rm(gifPath, { force: true }),
      ...(audio?.cleanupPath ? [rm(audio.cleanupPath, { force: true })] : []),
    ]);
  }
}
