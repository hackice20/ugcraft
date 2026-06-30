import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export type VideoStorageMode = "local" | "r2";

/**
 * local → writes to public/output/ (served at /output/*.mp4)
 * r2    → Cloudflare R2 (S3-compatible, works locally + production)
 *
 * Defaults to "local" when unset — safe for npm run dev.
 */
export function getVideoStorageMode(): VideoStorageMode {
  const mode = process.env.VIDEO_STORAGE_MODE?.toLowerCase();
  if (mode === "r2") return "r2";
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

  if (mode === "r2") {
    return saveToR2(buffer, name);
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

async function saveToR2(
  buffer: Buffer,
  filename: string,
): Promise<SavedVideo> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are required when VIDEO_STORAGE_MODE=r2",
    );
  }

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const key = `videos/${filename}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "video/mp4",
    }),
  );

  // R2 public URL format (requires public bucket or custom domain)
  const publicUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : `https://pub-${accountId}.r2.dev/${key}`;

  return {
    url: publicUrl,
    filename,
    mode: "r2",
  };
}
