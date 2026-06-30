import type { AudioVibe } from "@/lib/vibes";
import {
  buildOrchestratorSystemPrompt,
  getChatSystemPrompt,
} from "@/lib/prompts/load-system-prompt";

export { buildOrchestratorSystemPrompt, getChatSystemPrompt };

export const ORCHESTRATOR_SYSTEM_PROMPT = buildOrchestratorSystemPrompt();
export const CHAT_SYSTEM_PROMPT = getChatSystemPrompt();

export type OrchestratorOutput = {
  productName: string;
  productSummary: string;
  audioTitle: string;
  audioArtist: string;
  audioVibe: AudioVibe;
  audioReason: string;
  audioTrimStartMs: number;
  audioTrimEndMs: number;
  gifEmotion: string;
  gifSearchQuery: string;
  gifReason: string;
  textOverlay: string;
  backgroundSearchQuery: string;
  vibe: AudioVibe;
};
