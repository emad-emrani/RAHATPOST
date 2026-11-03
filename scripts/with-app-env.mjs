#!/usr/bin/env node
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { constants as osConstants } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, inflateRawSync } from "node:zlib";

function extractZipBufferInNode(buf, destDir) {
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return 0;
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  let ptr = cdOffset;
  let count = 0;
  for (let i = 0; i < totalEntries; i++) {
    if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const fileName = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");
    ptr += 46 + nameLen + extraLen + commentLen;
    if (!fileName || fileName.endsWith("/") || fileName.includes("..")) continue;
    if (localHeaderOffset + 30 > buf.length || buf.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;
    const lNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const lExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
    const compData = buf.subarray(dataStart, dataStart + compSize);
    const fileData = method === 0 ? compData : method === 8 ? inflateRawSync(compData) : null;
    if (!fileData) continue;
    const outPath = join(destDir, fileName);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, fileData);
    count++;
  }
  return count;
}

function extractTarGzBufferInNode(gzBuf, destRoot) {
  const tarBuf = gunzipSync(gzBuf);
  let offset = 0;
  let count = 0;
  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);
    if (header[0] === 0) {
      offset += 512;
      continue;
    }
    const nameRaw = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefixRaw = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    const fullName = (prefixRaw ? `${prefixRaw}/${nameRaw}` : nameRaw).replace(/^\.\//, "");
    const sizeOctal = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeOctal || "0", 8) || 0;
    const typeFlag = String.fromCharCode(header[156]);
    offset += 512;
    if ((typeFlag === "0" || typeFlag === "\0") && fullName && !fullName.includes("..") && !fullName.endsWith("with-app-env.mjs")) {
      const fileData = tarBuf.subarray(offset, offset + size);
      const outPath = join(destRoot, fullName);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, fileData);
      count++;
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return count;
}

function autoUnpackUploadedZips(root) {
  try {
    // 0. If unpack-zips.yml was uploaded to repo root, move it into .github/workflows/unpack-zips.yml
    const rootWf = join(root, "unpack-zips.yml");
    const wfPath = join(root, ".github/workflows/unpack-zips.yml");
    if (existsSync(rootWf)) {
      mkdirSync(dirname(wfPath), { recursive: true });
      copyFileSync(rootWf, wfPath);
      try { unlinkSync(rootWf); } catch {}
    }

    // 1. Extract embedded b64_gz_data from .github/workflows/unpack-zips.yml if present
    if (existsSync(wfPath)) {
      const wfText = readFileSync(wfPath, "utf8");
      const m = wfText.match(/b64_gz_data\s*=\s*"""([\s\S]*?)"""/);
      if (m && m[1] && m[1].trim().length > 20) {
        const rawGz = Buffer.from(m[1].replace(/\s+/g, ""), "base64");
        const c = extractTarGzBufferInNode(rawGz, root);
        console.log(`[auto-unpack] Extracted ${c} files from unpack-zips.yml during build`);
      }
    }

    // 2. If index.tsx was uploaded to repo root, copy it into src/routes/index.tsx
    const rootIdx = join(root, "index.tsx");
    if (existsSync(rootIdx)) {
      const destIdx = join(root, "src/routes/index.tsx");
      mkdirSync(dirname(destIdx), { recursive: true });
      copyFileSync(rootIdx, destIdx);
      console.log("[auto-unpack] Applied root index.tsx -> src/routes/index.tsx");
    }

    // 3. Extract any uploaded .zip files in the repository (overrides b64_gz_data)
    const dirsToScan = [root, join(root, "src"), join(root, "src/routes"), join(root, "mobile")];
    for (const d of dirsToScan) {
      if (!existsSync(d)) continue;
      for (const name of readdirSync(d)) {
        if (!name.toLowerCase().endsWith(".zip")) continue;
        const fullZip = join(d, name);
        const lower = name.toLowerCase();
        if (lower.includes("routes")) {
          const n = extractZipBufferInNode(readFileSync(fullZip), join(root, "src/routes"));
          console.log(`[auto-unpack] Extracted ${n} files from ${name} into src/routes/`);
        } else if (lower.includes("mobile") || lower.includes("admob") || lower.includes("rahatpost") || lower.includes("update")) {
          const n = extractZipBufferInNode(readFileSync(fullZip), root);
          console.log(`[auto-unpack] Extracted ${n} files from ${name} into root`);
        }
      }
    }
  } catch (e) {
    console.warn("[auto-unpack] warning:", e?.message || e);
  }
}

export const APP_ENV_REL_PATH = ".grok/app-env.json";
const VITE_PREFIX = "VITE_";

export function parseAppEnv(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {};
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const env = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!key.startsWith(VITE_PREFIX)) continue;
    if (typeof value !== "string") continue;
    env[key] = value;
  }
  return env;
}

export function readAppEnv(root) {
  try {
    return parseAppEnv(readFileSync(join(root, APP_ENV_REL_PATH), "utf8"));
  } catch {
    return {};
  }
}

export function mergeAppEnv(appEnv, processEnv) {
  return { ...appEnv, ...processEnv };
}

export function exitStatusFromChild(code, signal) {
  if (signal) {
    const signo = osConstants.signals[signal];
    return 128 + (typeof signo === "number" ? signo : 1);
  }
  return code ?? 1;
}

export function projectRoot() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

export function isMainModule(moduleUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

function main(argv) {
  const [command, ...args] = argv;
  if (!command) {
    console.error("usage: node scripts/with-app-env.mjs <command> [args…]");
    process.exit(2);
  }
  autoUnpackUploadedZips(projectRoot());
  const env = mergeAppEnv(readAppEnv(projectRoot()), process.env);
  const child = spawn(command, args, { stdio: "inherit", env });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (err) => {
    console.error(`[with-app-env] failed to run ${command}:`, err?.message || err);
    process.exit(127);
  });
  child.on("exit", (code, signal) => {
    process.exit(exitStatusFromChild(code, signal));
  });
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}
