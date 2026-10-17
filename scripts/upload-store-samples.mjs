#!/usr/bin/env node
/**
 * Build step: make sure the «مثال» sample product images (scripts/store-samples/<key>.jpg,
 * generated originals, no brand logos) exist in the private Blob store under media/<key>.
 * Only uploads images still referenced by a sample product; skips without DATABASE_URL or Blob.
 */
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const db = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
if (!db || !process.env.BLOB_READ_WRITE_TOKEN) {
  console.log("[store-samples] no DATABASE_URL or Blob token — skipping.");
  process.exit(0);
}
const dir = join(dirname(fileURLToPath(import.meta.url)), "store-samples");
const client = new pg.Client({ connectionString: db });
try {
  await client.connect();
  const { rows } = await client.query(
    "select image_key from store_products where is_sample and image_key is not null",
  );
  const files = new Set(await readdir(dir));
  const { put, head } = await import("@vercel/blob");
  for (const { image_key: key } of rows) {
    if (!files.has(key)) continue;
    try {
      await head(`media/${key}`);
      continue; // already there
    } catch {
      /* not found → upload */
    }
    await put(`media/${key}`, await readFile(join(dir, key)), {
      access: "private",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    console.log(`[store-samples] uploaded ${key}`);
  }
} catch (error) {
  console.error("[store-samples] failed (non-fatal)", error);
} finally {
  await client.end().catch(() => {});
}
