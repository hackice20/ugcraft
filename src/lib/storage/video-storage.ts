import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export type VideoStorageMode = "local" | "blob";

/**
 * local â†’ writes to public/output/ (served at /output/*.mp4)
 * blob  â†’ Vercel Blob (requires BLOB_READ_WRITE_TOKEN)
 *
 * Defaults to "local" when unset — safe for npm run dev.
 */
export function getVideoStorageMode(): VideoStorageMode {
  const mode = process.env.VIDEO_STORAGE_MODE?.toLowerCase();
  if (mode === "blob") return "blob";
  return "local";
}

export function getLocalOutputDir(): string {
  return path.join(process.cwd(), "public", "output");
}

export type SavedVideo = {
  url: string;
  filename: string;
  mode: VideoStorageMode;
};

function buildFilename(custom?: string): string {
  if (custom) return custom.endsWith(".mp4") ? custom : `${custom}.mp4`;
  return `ugc-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`;
}

export async function saveVideo(
  buffer: Buffer,
  filename?: string,
): Promise<SavedVideo> {
  const name = buildFilename(filename);
  const mode = getVideoStorageMode();

  if (mode === "blob") {
    return saveToBlob(buffer, name);
  }
  return saveToLocal(buffer, name);
}

async function saveToLocal(
  buffer: Buffer,
  filename: string,
): Promise<SavedVideo> {
  const outputDir = getLocalOutputDir();
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, filename), buffer);

  return {
    url: `/output/${filename}`,
    filename,
    mode: "local",
  };
}

async function saveToBlob(
  buffer: Buffer,
  filename: string,
): Promise<SavedVideo> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required when VIDEO_STORAGE_MODE=blob",
    );
  }

  const { put } = await import("@vercel/blob");
  const blob = await put(`videos/${filename}`, buffer, {
    access: "public",
    token,
    contentType: "video/mp4",
  });

  return {
    url: blob.url,
    filename,
    mode: "blob",
  };
}
