import { access, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { Resvg } from "@resvg/resvg-js";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

const OUT_W = 1080;
const OUT_H = 1920;
const FPS = 30;

const FONT_SIZE = 78;
const LINE_HEIGHT = 96;
const STROKE_WIDTH = 14;
const TEXT_PAD_Y = 36;
const TEXT_TOP_RATIO = 0.62;

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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render the overlay text to a transparent PNG with the bundled font.
 * Avoids ffmpeg's drawtext filter, which is not available in ffmpeg-static.
 */
async function renderTextPng(text: string, fontPath: string): Promise<string> {
  const lines = wrapText(text).split("\n");
  const height = lines.length * LINE_HEIGHT + TEXT_PAD_Y * 2;
  const cx = OUT_W / 2;

  const tspans = lines
    .map((line, i) => {
      const y = TEXT_PAD_Y + FONT_SIZE + i * LINE_HEIGHT;
      return (
        `<text x="${cx}" y="${y}" text-anchor="middle" ` +
        `font-family="Anton" font-size="${FONT_SIZE}" ` +
        `fill="#ffffff" stroke="#000000" stroke-width="${STROKE_WIDTH}" ` +
        `stroke-linejoin="round" paint-order="stroke">` +
        `${escapeXml(line)}</text>`
      );
    })
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${height}" ` +
    `viewBox="0 0 ${OUT_W} ${height}">${tspans}</svg>`;

  const resvg = new Resvg(svg, {
    background: "rgba(0,0,0,0)",
    font: {
      fontFiles: [fontPath],
      loadSystemFonts: false,
      defaultFontFamily: "Anton",
    },
  });

  const png = resvg.render().asPng();
  const pngPath = path.join(tmpdir(), `ugcraft-text-${randomUUID()}.png`);
  await writeFile(pngPath, png);
  return pngPath;
}

export type ComposeResult = {
  buffer: Buffer;
};

export async function composeReel(input: ComposeInput): Promise<ComposeResult> {
  const duration = Math.min(Math.max(input.durationSec, 5), 10);
  const outPath = path.join(tmpdir(), `ugcraft-out-${randomUUID()}.mp4`);

  const fontPath = getFontPath();
  try {
    await access(fontPath);
  } catch {
    throw new Error(
      `Overlay font missing at ${fontPath} — ensure assets/fonts is bundled with the function`,
    );
  }

  const textPngPath = await renderTextPng(input.textOverlay, fontPath);
  const textTop = Math.round(OUT_H * TEXT_TOP_RATIO);

  const command = ffmpeg();

  // Input 0: background video (loop in case the clip is shorter than duration)
  command.input(input.backgroundPath).inputOptions(["-stream_loop", "-1"]);

  // Input 1: GIF (loop forever; trimmed by output duration)
  command.input(input.gifPath).inputOptions(["-ignore_loop", "0"]);

  // Input 2: text overlay PNG (loop the still image)
  command.input(textPngPath).inputOptions(["-loop", "1"]);

  const hasAudio = Boolean(input.audioPath);
  // Input 3 (optional): audio
  if (hasAudio) {
    command
      .input(input.audioPath as string)
      .inputOptions(["-ss", String(input.audioStartSec ?? 0)]);
  }

  const filterGraph = [
    `[0:v]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,` +
      `crop=${OUT_W}:${OUT_H},setsar=1,fps=${FPS}[bg]`,
    `[1:v]scale=720:-1[gif]`,
    `[bg][gif]overlay=(W-w)/2:(H-h)/2-120:shortest=0[ov]`,
    `[ov][2:v]overlay=(W-w)/2:${textTop}:shortest=0[outv]`,
  ].join(";");

  const outputOptions = [
    "-filter_complex",
    filterGraph,
    "-map",
    "[outv]",
    ...(hasAudio ? ["-map", "3:a"] : []),
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
      .outputOptions(outputOptions)
      .on("error", (err) => reject(new Error(`FFmpeg failed: ${err.message}`)))
      .on("end", () => resolve())
      .save(outPath);
  });

  const buffer = await readFile(outPath);

  await Promise.allSettled([
    rm(outPath, { force: true }),
    rm(textPngPath, { force: true }),
  ]);

  return { buffer };
}
