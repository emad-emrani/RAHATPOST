/**
 * Server-side checks for uploaded photos (pure, no Node APIs): sniff the real format from the
 * bytes (JPEG or still WebP only), read the pixel size, and strip metadata (EXIF / XMP / comments,
 * which can carry GPS location) without re-encoding. The browser already re-encodes through a
 * canvas, which drops EXIF; this is the server's own guarantee.
 */

export type CheckedImage = {
  bytes: Uint8Array;
  contentType: "image/jpeg" | "image/webp";
  ext: "jpg" | "webp";
  width: number;
  height: number;
};

export class ImageCheckError extends Error {}

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32le = (b: Uint8Array, i: number) =>
  (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function checkJpeg(b: Uint8Array): CheckedImage {
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  let width = 0;
  let height = 0;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new ImageCheckError("bad jpeg marker");
    let m = b[i + 1];
    while (m === 0xff) {
      i += 1;
      m = b[i + 1];
    }
    if (m === 0xd9) {
      keep.push(b.subarray(i, i + 2));
      break;
    }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      keep.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > b.length) throw new ImageCheckError("truncated jpeg");
    const len = u16be(b, i + 2);
    if (len < 2 || i + 2 + len > b.length) throw new ImageCheckError("bad jpeg segment");
    const seg = b.subarray(i, i + 2 + len);
    if (m === 0xda) {
      // Start of scan: the rest is image data (+ EOI). Keep it as is.
      keep.push(b.subarray(i));
      break;
    }
    if (SOF.has(m)) {
      height = u16be(b, i + 5);
      width = u16be(b, i + 7);
    }
    const isIcc = m === 0xe2 && ascii(b, i + 4, 11) === "ICC_PROFILE";
    // Drop APP1..APP15 (EXIF, XMP, maker notes…) except the ICC colour profile, and comments.
    const drop = (m >= 0xe1 && m <= 0xef && !isIcc) || m === 0xfe;
    if (!drop) keep.push(seg);
    i += 2 + len;
  }
  if (!width || !height) throw new ImageCheckError("jpeg without size");
  return { bytes: concat(keep), contentType: "image/jpeg", ext: "jpg", width, height };
}

function checkWebp(b: Uint8Array): CheckedImage {
  if (b.length < 20 || ascii(b, 8, 4) !== "WEBP") throw new ImageCheckError("bad webp");
  const chunks: Uint8Array[] = [];
  let width = 0;
  let height = 0;
  let i = 12;
  while (i + 8 <= b.length) {
    const tag = ascii(b, i, 4);
    const size = u32le(b, i + 4);
    const end = i + 8 + size + (size & 1);
    if (i + 8 + size > b.length) throw new ImageCheckError("truncated webp");
    const data = b.subarray(i + 8, i + 8 + size);
    if (tag === "ANIM" || tag === "ANMF") throw new ImageCheckError("animated webp");
    if (tag === "VP8X") {
      if (data[0] & 0x02) throw new ImageCheckError("animated webp");
      const chunk = b.slice(i, Math.min(end, b.length));
      chunk[8] &= ~(0x08 | 0x04); // clear EXIF + XMP flags
      chunks.push(chunk);
      width = u24le(data, 4) + 1;
      height = u24le(data, 7) + 1;
    } else if (tag === "EXIF" || tag === "XMP ") {
      // metadata: drop
    } else {
      if (tag === "VP8 " && !width) {
        width = u16le(data, 6) & 0x3fff;
        height = u16le(data, 8) & 0x3fff;
      } else if (tag === "VP8L" && !width) {
        if (data[0] !== 0x2f) throw new ImageCheckError("bad vp8l");
        const bits = u32le(data, 1);
        width = (bits & 0x3fff) + 1;
        height = ((bits >> 14) & 0x3fff) + 1;
      }
      chunks.push(b.subarray(i, Math.min(end, b.length)));
    }
    i = end;
  }
  if (!width || !height) throw new ImageCheckError("webp without size");
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(b.subarray(0, 4), 0);
  const riffSize = body.length + 4;
  header.set([riffSize & 255, (riffSize >> 8) & 255, (riffSize >> 16) & 255, riffSize >>> 24], 4);
  header.set(b.subarray(8, 12), 8);
  return { bytes: concat([header, body]), contentType: "image/webp", ext: "webp", width, height };
}

export function checkImage(bytes: Uint8Array): CheckedImage {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return checkJpeg(bytes);
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP")
    return checkWebp(bytes);
  throw new ImageCheckError("unsupported image type");
}
