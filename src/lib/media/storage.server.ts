/**
 * Photo bytes: the private Vercel Blob store (BLOB_READ_WRITE_TOKEN) under media/<key>.
 * Local runs without a token use a temp folder instead (never on Vercel).
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localDir = () => join(tmpdir(), "rahatpost-media");
const pathname = (key: string) => `media/${key}`;

function assertConfigured() {
  if (!blobEnabled() && process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN is not set");
}

export async function putMedia(key: string, bytes: Uint8Array, contentType: string) {
  assertConfigured();
  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    await put(pathname(key), Buffer.from(bytes), {
      access: "private",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    return;
  }
  await mkdir(localDir(), { recursive: true });
  await writeFile(join(localDir(), key), bytes);
}

export async function getMedia(
  key: string,
): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array; size?: number } | null> {
  assertConfigured();
  if (blobEnabled()) {
    const { get } = await import("@vercel/blob");
    try {
      const res = await get(pathname(key), { access: "private" });
      if (!res || res.statusCode !== 200) return null;
      return { body: res.stream, size: res.blob.size };
    } catch (error) {
      if (error instanceof Error && /not.?found/i.test(error.name + error.message)) return null;
      throw error;
    }
  }
  try {
    const bytes = new Uint8Array(await readFile(join(localDir(), key)));
    return { body: bytes, size: bytes.length };
  } catch {
    return null;
  }
}

export async function deleteMediaFiles(keys: string[]) {
  if (keys.length === 0) return;
  assertConfigured();
  if (blobEnabled()) {
    const { del } = await import("@vercel/blob");
    await del(keys.map(pathname));
    return;
  }
  await Promise.all(keys.map((k) => rm(join(localDir(), k), { force: true })));
}
