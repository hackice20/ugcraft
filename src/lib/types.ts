import type { AudioVibe } from "@/lib/vibes";

export type UGCBrief = {
  productName: string;
  productSummary: string;
  audioVibe: AudioVibe;
  audioTitle: string;
  audioArtist: string;
  audioReason: string;
  audioTrimStartMs: number;
  audioTrimEndMs: number;
  textOverlay: string;
  gifEmotion: string;
  gifSearchQuery: string;
  gifReason: string;
  backgroundSearchQuery: string;
  vibe: AudioVibe;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  videoUrl?: string;
  pending?: boolean;
  progress?: number;
};
