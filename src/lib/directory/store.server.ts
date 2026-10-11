import { randomUUID } from "node:crypto";
import type { BusinessSubmission, SubmissionStatus } from "./types";

/**
 * Submissions live in a private Vercel Blob store (one JSON file each) plus an
 * index of approved entries that the public directory reads. Without a Blob token
 * (local preview) an in-memory store is used instead.
 */
const PREFIX = "submissions/";
const APPROVED = "directory/approved.json";
const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const memory = new Map<string, string>();

async function blob() {
  return import("@vercel/blob");
}

async function write(pathname: string, value: unknown) {
  const body = JSON.stringify(value);
  if (!hasBlob) {
    if (process.env.VERCEL) throw new Error("storage not configured");
    memory.set(pathname, body);
    return;
  }
  const { put } = await blob();
  await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function read<T>(pathname: string): Promise<T | null> {
  if (!hasBlob) {
    if (process.env.VERCEL) throw new Error("storage not configured");
    const v = memory.get(pathname);
    return v ? (JSON.parse(v) as T) : null;
  }
  const { get } = await blob();
  const res = await get(pathname, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) return null;
  return JSON.parse(await new Response(res.stream).text()) as T;
}

async function remove(pathname: string) {
  if (!hasBlob) {
    memory.delete(pathname);
    return;
  }
  const { del } = await blob();
  await del(pathname);
}

async function listPaths(): Promise<string[]> {
  if (!hasBlob) {
    if (process.env.VERCEL) throw new Error("storage not configured");
    return [...memory.keys()].filter((k) => k.startsWith(PREFIX));
  }
  const { list } = await blob();
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    out.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export async function listSubmissions(): Promise<BusinessSubmission[]> {
  const paths = await listPaths();
  const items = await Promise.all(paths.map((p) => read<BusinessSubmission>(p).catch(() => null)));
  return items
    .filter((x): x is BusinessSubmission => Boolean(x))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function countPending(): Promise<number> {
  return (await listSubmissions()).filter((s) => s.status === "pending").length;
}

export async function createSubmission(input: Omit<BusinessSubmission, "id" | "status" | "createdAt">) {
  const submission: BusinessSubmission = {
    ...input,
    id: randomUUID().replaceAll("-", "").slice(0, 16),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await write(`${PREFIX}${submission.id}.json`, submission);
  return submission;
}

let approvedCache: { at: number; items: BusinessSubmission[] } | null = null;

export async function getApproved(): Promise<BusinessSubmission[]> {
  if (approvedCache && Date.now() - approvedCache.at < 60_000) return approvedCache.items;
  const items = (await read<BusinessSubmission[]>(APPROVED)) ?? [];
  approvedCache = { at: Date.now(), items };
  return items;
}

async function rebuildApproved() {
  const approved = (await listSubmissions()).filter((s) => s.status === "approved");
  await write(APPROVED, approved);
  approvedCache = { at: Date.now(), items: approved };
}

export async function decide(id: string, action: SubmissionStatus | "delete") {
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Error("bad id");
  const path = `${PREFIX}${id}.json`;
  if (action === "delete") {
    await remove(path);
  } else {
    const current = await read<BusinessSubmission>(path);
    if (!current) throw new Error("not found");
    await write(path, { ...current, status: action, decidedAt: new Date().toISOString() });
  }
  await rebuildApproved();
}
