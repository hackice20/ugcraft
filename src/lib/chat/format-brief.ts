import type { UGCBrief } from "@/lib/types";

export function formatBriefForChat(brief: UGCBrief): string {
  return [
    "brief locked in:",
    "",
    `${brief.productName} — ${brief.productSummary}`,
    "",
    `audio: ${brief.audioTitle} — ${brief.audioArtist} (${brief.audioVibe})`,
    `gif: ${brief.gifSearchQuery} [${brief.gifEmotion}]`,
    `text: "${brief.textOverlay}"`,
    `bg: ${brief.backgroundSearchQuery}`,
    "",
    "video render is next — hang tight.",
  ].join("\n");
}
