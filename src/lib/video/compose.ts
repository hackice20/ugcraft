import { readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

const OUT_W = 1080;
const OUT_H = 1920;
const FPS = 30;

export type ComposeInput = {
  backgroundPath: string;
  gifPath: string;
  /** Optional — skipped if missing so render still works without audio */
  audioPath?: string;
  audioStartSec?: number;
  textOverlay: string;
  durationSec: number;
};

/** Anton bold, bundled in /assets/fonts */
function getFontPath(): string {
  return path.join(process.cwd(), "assets", "fonts", "Anton-Regular.ttf");
}

/**
 * FFmpeg filter strings choke on Windows paths (drive colon + backslashes).
 * Convert C:\a\b -> C\:/a/b
 */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/** Wrap overlay copy to ~16 chars/line so big text fits the 1080 frame */
function wrapText(text: string, maxChars = 16): string {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
}

export type ComposeResult = {
  buffer: Buffer;
};

export async function composeReel(input: ComposeInput): Promise<ComposeResult> {
  const duration = Math.min(Math.max(input.durationSec, 5), 10);
  const outPath = path.join(tmpdir(), `ugcraft-out-${randomUUID()}.mp4`);
  const textFilePath = path.join(tmpdir(), `ugcraft-text-${randomUUID()}.txt`);

  await writeFile(textFilePath, wrapText(input.textOverlay), "utf8");

  const fontArg = escapeFilterPath(getFontPath());
  const textArg = escapeFilterPath(textFilePath);

  const command = ffmpeg();

  // Input 0: background video (loop in case the clip is shorter than duration)
  command.input(input.backgroundPath).inputOptions(["-stream_loop", "-1"]);

  // Input 1: GIF (loop forever; trimmed by output duration)
  command.input(input.gifPath).inputOptions(["-ignore_loop", "0"]);

  const hasAudio = Boolean(input.audioPath);
  if (hasAudio) {
    command
      .input(input.audioPath as string)
      .inputOptions(["-ss", String(input.audioStartSec ?? 0)]);
  }

  const filters: string[] = [
    `[0:v]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,` +
      `crop=${OUT_W}:${OUT_H},setsar=1,fps=${FPS}[bg]`,
    `[1:v]scale=720:-1[gif]`,
    `[bg][gif]overlay=(W-w)/2:(H-h)/2-120:shortest=0[ov]`,
    `[ov]drawtext=fontfile='${fontArg}':textfile='${textArg}':` +
      `fontsize=78:fontcolor=white:borderw=10:bordercolor=black@0.9:` +
      `line_spacing=12:x=(w-text_w)/2:y=h*0.70[outv]`,
  ];

  const outputOptions = [
    "-map",
    "[outv]",
    ...(hasAudio ? ["-map", "2:a"] : []),
    "-t",
    String(duration),
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    ...(hasAudio
      ? ["-c:a", "aac", "-b:a", "128k", "-shortest"]
      : ["-an"]),
    "-movflags",
    "+faststart",
  ];

  await new Promise<void>((resolve, reject) => {
    command
      .complexFilter(filters)
      .outputOptions(outputOptions)
      .on("error", (err) => reject(new Error(`FFmpeg failed: ${err.message}`)))
      .on("end", () => resolve())
      .save(outPath);
  });

  const buffer = await readFile(outPath);

  await Promise.allSettled([
    rm(outPath, { force: true }),
    rm(textFilePath, { force: true }),
  ]);

  return { buffer };
}
