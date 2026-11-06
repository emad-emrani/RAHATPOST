/**
 * Branded fallback image for news items without a photo: headline (Arabic/Hebrew/English shaped by resvg's
 * text engine with deterministic RTL/LTR directional run layout), section label and the رهط بوست logo, rendered SVG → PNG.
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
    const lat = await import("./fonts/latin.b64");
    fonts = [
      Buffer.from(f.KUFI_BOLD, "base64"),
      Buffer.from(f.HEBREW_BOLD, "base64"),
      Buffer.from(lat.LATIN_BOLD, "base64"),
    ];
    // Write to versioned tmp directory so warm serverless instances always load all 3 fonts
    try {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const dir = `${tmpdir()}/rp-fonts-v4`;
      await mkdir(dir, { recursive: true });
      fontFiles = [`${dir}/kufi-bold.ttf`, `${dir}/hebrew-bold.ttf`, `${dir}/latin-bold.ttf`];
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

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const FAMILY_RTL = "'Noto Kufi Arabic', 'Noto Sans Hebrew', 'Noto Sans'";
const FAMILY_LTR = "'Noto Sans', 'Noto Kufi Arabic', 'Noto Sans Hebrew'";

function opts() {
  return {
    font: {
      ...(fontFiles.length ? { fontFiles } : { fontBuffers: fonts! }),
      loadSystemFonts: false,
      defaultFontFamily: "Noto Kufi Arabic",
    },
    fitTo: { mode: "original" as const },
  };
}

const hasRtlChar = (s: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF]/.test(s);
const isLatinToken = (w: string) => !hasRtlChar(w) && /[A-Za-z]/.test(w);

/**
 * Group consecutive Latin/English words (e.g. "HUAWEI OSTA O1 Pro") into a single compound token
 * (up to 28 chars) so multi-word English product/brand names stay intact on the same line.
 */
function tokenizeHeadline(text: string): string[] {
  const raw = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of raw) {
    if (
      out.length > 0 &&
      isLatinToken(w) &&
      !hasRtlChar(out[out.length - 1]) &&
      /[A-Za-z0-9]/.test(out[out.length - 1]) &&
      out[out.length - 1].length + 1 + w.length <= 28
    ) {
      out[out.length - 1] = `${out[out.length - 1]} ${w}`;
    } else {
      out.push(w);
    }
  }
  return out;
}

/**
 * Split a line of text into consecutive single-direction runs (pure RTL Arabic/Hebrew vs pure LTR English/Numbers)
 * in logical reading order. Each run is rendered as its own <text> element positioned from right to left so
 * resvg/usvg never scrambles mixed Arabic + English run order.
 */
function splitLineIntoRuns(line: string): { text: string; dir: "rtl" | "ltr" }[] {
  const words = line.split(/\s+/).filter(Boolean);
  const runs: { text: string; dir: "rtl" | "ltr" }[] = [];
  for (const w of words) {
    const dir: "rtl" | "ltr" = hasRtlChar(w) ? "rtl" : "ltr";
    if (runs.length > 0 && runs[runs.length - 1].dir === dir) {
      runs[runs.length - 1].text += ` ${w}`;
    } else {
      runs.push({ text: w, dir });
    }
  }
  return runs;
}

/** Width of a single-direction text run in px, via resvg's own layout. */
function measureRun(R: ResvgCtor, text: string, size: number, dir: "rtl" | "ltr" = "rtl"): { x: number; w: number } {
  const fam = dir === "ltr" ? FAMILY_LTR : FAMILY_RTL;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="200"><text x="2000" y="150" font-family="${fam}" font-weight="700" font-size="${size}">${esc(text)}</text></svg>`;
  const b = new R(svg, opts()).getBBox();
  return b ? { x: b.x - 2000, w: b.width } : { x: 0, w: text.length * size * 0.55 };
}

/** Total width of a potentially mixed RTL/LTR line when laid out as directional runs. */
function measureLineWidth(R: ResvgCtor, line: string, size: number): number {
  const runs = splitLineIntoRuns(line);
  if (!runs.length) return 0;
  const gap = Math.round(size * 0.28);
  let total = 0;
  for (let i = 0; i < runs.length; i++) {
    total += measureRun(R, runs[i].text, size, runs[i].dir).w;
    if (i > 0) total += gap;
  }
  return total;
}

function wrap(R: ResvgCtor, text: string, size: number, maxW: number, maxLines: number): string[] {
  const words = tokenizeHeadline(text);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measureLineWidth(R, next, size) > maxW) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = next;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  else if (cur && lines.length === maxLines)
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")} …`;
  return lines;
}

export async function renderNewsCard(input: {
  title: string;
  section: string;
  source?: string;
  w?: number;
  h?: number;
}): Promise<Buffer> {
  const R = await init();
  const W = input.w ?? 1200;
  const H = input.h ?? 630;
  const st = SECTION_STYLE[input.section] ?? SECTION_STYLE.news;
  const dark = st.bg !== "#f2c94c";
  const ink = dark ? "#ffffff" : "#1f1a10";
  const pad = 64;
  const right = W - pad;
  const title = input.title.replace(/\s+/g, " ").trim().slice(0, 220) || "رهط بوست";
  let size = 62;
  let lines = wrap(R, title, size, W - pad * 2, 4);
  if (lines.length >= 4) {
    size = 52;
    lines = wrap(R, title, size, W - pad * 2, 4);
  }
  const lh = Math.round(size * 1.55);
  const block = lines.length * lh;
  const top = Math.max(170, (H - block) / 2 + 20);
  const runGap = Math.round(size * 0.28);

  // Lay out each line's directional runs from right to left so Arabic and English never collide or reverse.
  const textEls = lines
    .map((line, i) => {
      const y = (top + i * lh + size).toFixed(1);
      const runs = splitLineIntoRuns(line);
      let cursorRight = right;
      return runs
        .map((r) => {
          const fam = r.dir === "ltr" ? FAMILY_LTR : FAMILY_RTL;
          const m = measureRun(R, r.text, size, r.dir);
          const x = cursorRight - m.w - m.x;
          cursorRight -= m.w + runGap;
          return `<text x="${x.toFixed(1)}" y="${y}" font-family="${fam}" font-weight="700" font-size="${size}" fill="${ink}">${esc(r.text)}</text>`;
        })
        .join("");
    })
    .join("");

  const labelSize = 30;
  const lm = measureRun(R, st.label, labelSize, "rtl");
  const chipW = lm.w + 48;
  const brand = "رهط بوست";
  const bm = measureRun(R, brand, 34, "rtl");
  const src = input.source ? input.source.slice(0, 40) : "";
  const sm = src ? measureRun(R, src, 26, hasRtlChar(src) ? "rtl" : "ltr") : { x: 0, w: 0 };
  const logo = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${st.bg}"/>
<circle cx="${pad}" cy="${H + 40}" r="260" fill="${ink}" opacity="0.06"/>
<circle cx="${W - 40}" cy="-60" r="200" fill="${ink}" opacity="0.06"/>
<rect x="${right - chipW}" y="${pad}" width="${chipW}" height="56" rx="28" fill="${st.accent}"/>
<text x="${(right - 24 - lm.w - lm.x).toFixed(1)}" y="${pad + 40}" font-family="${FAMILY_RTL}" font-weight="700" font-size="${labelSize}" fill="${dark ? "#1f1a10" : "#ffffff"}">${esc(st.label)}</text>
${textEls}
<rect x="0" y="${H - 96}" width="${W}" height="96" fill="#000" opacity="0.08"/>
<image x="${pad}" y="${H - 80}" width="64" height="64" xlink:href="${logo}"/>
<text x="${pad + 80 - bm.x}" y="${H - 34}" font-family="${FAMILY_RTL}" font-weight="700" font-size="34" fill="${ink}">${brand}</text>
${src ? `<text x="${(right - sm.w - sm.x).toFixed(1)}" y="${H - 36}" font-family="${hasRtlChar(src) ? FAMILY_RTL : FAMILY_LTR}" font-weight="700" font-size="26" fill="${ink}" opacity="0.8">${esc(src)}</text>` : ""}
</svg>`;
  return new R(svg, opts()).render().asPng();
}

/** Diagnostics for /api/news-image?debug=1 (no secrets). */
export async function cardDebug() {
  const R = await init();
  return {
    fonts: fonts?.map((b) => b.length),
    fontFiles,
    bbox:
      new R(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="10" y="60" font-family="${FAMILY_LTR}" font-size="40">HUAWEI</text></svg>`,
        opts(),
      ).getBBox() ?? null,
  };
}
