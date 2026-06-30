import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";

export async function downloadToFile(url: string, ext: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }

  const dest = path.join(tmpdir(), `ugcraft-${randomUUID()}${ext}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buffer);
  return dest;
}
