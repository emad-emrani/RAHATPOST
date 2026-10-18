/**
 * Branded fallback image for news items without a photo: headline (Arabic/Hebrew shaped by resvg's
 * text engine), section label and the رهط بوست logo, rendered SVG → PNG.
 */
import logoSvg from "../../../public/favicon.svg?raw";

type ResvgCtor = typeof import("@resvg/resvg-js").Resvg;
let ResvgClass: ResvgCtor | null = null;
let fonts: Buffer[] | null = null;
let fontFiles: string[] = [];

async function init() {
  if (!ResvgClass) ResvgClass = (await import("@resvg/resvg-js")).Resvg;
  if (!fonts) {
    const f = await import("./fonts/fonts.b64");
    fonts = [Buffer.from(f.KUFI_BOLD, "base64"), Buffer.from(f.HEBREW_BOLD, "base64")];
    // Also on disk: some runtimes ignore in-memory font buffers.
    try {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const dir = `${tmpdir()}/rp-fonts`;
      await mkdir(dir, { recursive: true });
      fontFiles = [`${dir}/kufi-bold.ttf`, `${dir}/hebrew-bold.ttf`];
      await Promise.all(fontFiles.map((p, i) => writeFile(p, fonts![i])));
    } catch (error) {
      console.error("[news-image] font files", error);
      fontFiles = [];
    }
  }
  return ResvgClass;
}

export const SECTION_STYLE: Record<string, { label: string; bg: string; accent: string }> = {
  news: { label: "أخبار رهط والنقب", bg: "#f2c94c", accent: "#1f1a10" },
  israel: { label: "أخبار إسرائيل", bg: "#1e3a5f", accent: "#f2c94c" },
  tech: { label: "أخبار تقنية", bg: "#14532d", accent: "#f2c94c" },
  sports: { label: "رياضة", bg: "#9a1b1b", accent: "#f2c94c" },
  staff: { label: "رهط بوست", bg: "#f2c94c", accent: "#1f1a10" },
  reader: { label: "من القراء", bg: "#7c2d12", accent: "#f2c94c" },
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const FAMILY = "'Noto Kufi Arabic', 'Noto Sans Hebrew'";

function opts() {
  return {
    font: { ...(fontFiles.length ? { fontFiles } : { fontBuffers: fonts! }), loadSystemFonts: false, defaultFontFamily: "Noto Kufi Arabic" },
    fitTo: { mode: "original" as const },
  };
}

/** Width of a text run in px, via resvg's own layout (so shaping is accounted for). */
function measure(R: ResvgCtor, text: string, size: number): { x: number; w: number } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="200"><text x="2000" y="150" font-family="${FAMILY}" font-weight="700" font-size="${size}">${esc(text)}</text></svg>`;
  const b = new R(svg, opts()).getBBox();
  return b ? { x: b.x - 2000, w: b.width } : { x: 0, w: text.length * size * 0.55 };
}

function wrap(R: ResvgCtor, text: string, size: number, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(R, next, size).w > maxW) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = next;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  else if (cur && lines.length === maxLines) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")} …`;
  return lines;
}

export async function renderNewsCard(input: { title: string; section: string; source?: string; w?: number; h?: number }): Promise<Buffer> {
  const R = await init();
  const W = input.w ?? 1200;
  const H = input.h ?? 630;
  const st = SECTION_STYLE[input.section] ?? SECTION_STYLE.news;
  const dark = st.bg !== "#f2c94c";
  const ink = dark ? "#ffffff" : "#1f1a10";
  const pad = 64;
  const right = W - pad;
  const title = input.title.replace(/\s+/g, " ").trim().slice(0, 220) || "رهط بوست";
  let size = 64;
  let lines = wrap(R, title, size, W - pad * 2, 4);
  if (lines.length >= 4) {
    size = 54;
    lines = wrap(R, title, size, W - pad * 2, 4);
  }
  const lh = Math.round(size * 1.55);
  const block = lines.length * lh;
  const top = Math.max(170, (H - block) / 2 + 20);
  // Right-align each line using its measured box (works for RTL and LTR runs alike).
  const textEls = lines
    .map((line, i) => {
      const m = measure(R, line, size);
      const x = right - m.w - m.x;
      return `<text x="${x.toFixed(1)}" y="${(top + i * lh + size).toFixed(1)}" font-family="${FAMILY}" font-weight="700" font-size="${size}" fill="${ink}">${esc(line)}</text>`;
    })
    .join("");
  const labelSize = 30;
  const lm = measure(R, st.label, labelSize);
  const chipW = lm.w + 48;
  const brand = "رهط بوست";
  const bm = measure(R, brand, 34);
  const src = input.source ? input.source.slice(0, 40) : "";
  const sm = src ? measure(R, src, 26) : { x: 0, w: 0 };
  const logo = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${st.bg}"/>
<circle cx="${pad}" cy="${H + 40}" r="260" fill="${ink}" opacity="0.06"/>
<circle cx="${W - 40}" cy="-60" r="200" fill="${ink}" opacity="0.06"/>
<rect x="${right - chipW}" y="${pad}" width="${chipW}" height="56" rx="28" fill="${st.accent}"/>
<text x="${(right - 24 - lm.w - lm.x).toFixed(1)}" y="${pad + 40}" font-family="${FAMILY}" font-weight="700" font-size="${labelSize}" fill="${dark ? "#1f1a10" : "#ffffff"}">${esc(st.label)}</text>
${textEls}
<rect x="0" y="${H - 96}" width="${W}" height="96" fill="#000" opacity="0.08"/>
<image x="${pad}" y="${H - 80}" width="64" height="64" xlink:href="${logo}"/>
<text x="${pad + 80 - bm.x}" y="${H - 34}" font-family="${FAMILY}" font-weight="700" font-size="34" fill="${ink}">${brand}</text>
${src ? `<text x="${(right - sm.w - sm.x).toFixed(1)}" y="${H - 36}" font-family="${FAMILY}" font-weight="700" font-size="26" fill="${ink}" opacity="0.8">${esc(src)}</text>` : ""}
</svg>`;
  return new R(svg, opts()).render().asPng();
}

/** Diagnostics for /api/news-image?debug=1 (no secrets). */
export async function cardDebug() {
  const R = await init();
  return { fonts: fonts?.map((b) => b.length), fontFiles, bbox: new R(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="10" y="60" font-family="${FAMILY}" font-size="40">رهط</text></svg>`, opts()).getBBox() ?? null };
}
