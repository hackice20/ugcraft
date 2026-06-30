import { z } from "zod";
import { AUDIO_VIBES, type AudioVibe } from "@/lib/vibes";

const vibeSchema = z.enum(AUDIO_VIBES as unknown as [AudioVibe, ...AudioVibe[]]);

export const orchestratorOutputSchema = z
  .object({
    productName: z.string().min(1).max(120),
    productSummary: z.string().min(1).max(500),
    audioTitle: z.string().min(1).max(120),
    audioArtist: z.string().min(1).max(120),
    audioVibe: vibeSchema,
    audioReason: z.string().min(1).max(300),
    audioTrimStartMs: z.number().int().min(0).max(300_000),
    audioTrimEndMs: z.number().int().min(1_000).max(310_000),
    gifEmotion: z.string().min(2).max(40),
    gifSearchQuery: z.string().min(2).max(120),
    gifReason: z.string().min(1).max(300),
    textOverlay: z.string().min(1).max(80),
    backgroundSearchQuery: z.string().min(1).max(120),
    vibe: vibeSchema,
  })
  .refine((d) => d.vibe === d.audioVibe, {
    message: "vibe must match audioVibe",
    path: ["vibe"],
  })
  .refine((d) => d.audioTrimEndMs > d.audioTrimStartMs, {
    message: "audioTrimEndMs must be greater than audioTrimStartMs",
    path: ["audioTrimEndMs"],
  })
  .refine((d) => d.audioTrimEndMs - d.audioTrimStartMs <= 15_000, {
    message: "audio clip should be 5-15 seconds",
    path: ["audioTrimEndMs"],
  });

export type OrchestratorOutput = z.infer<typeof orchestratorOutputSchema>;

export function parseOrchestratorOutput(raw: unknown): OrchestratorOutput {
  return orchestratorOutputSchema.parse(raw);
}
