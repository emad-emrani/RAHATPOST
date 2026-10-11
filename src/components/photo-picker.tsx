import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MAX_MEDIA_BYTES, mediaUrl, type MediaKind } from "@/lib/media/types";

const MAX_SIDE = 1600;

/**
 * Resize + re-encode in the browser (max 1600 px, WebP ~80%, JPEG where WebP encoding isn't
 * supported). Drawing through a canvas drops EXIF/GPS; orientation is applied first.
 */
async function compress(file: File): Promise<Blob> {
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older Safari: fall back to an <img> element (it applies EXIF orientation itself).
    bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("decode"));
      };
      img.src = url;
    });
  }
  const w0 = bitmap.width;
  const h0 = bitmap.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w0 * scale));
  canvas.height = Math.max(1, Math.round(h0 * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff"; // transparent PNGs → white, not black, in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if ("close" in bitmap) bitmap.close();
  const encode = (type: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
  for (const q of [0.8, 0.7, 0.6, 0.5]) {
    let blob = await encode("image/webp", q);
    if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", q + 0.02);
    if (blob && blob.size <= MAX_MEDIA_BYTES) return blob;
  }
  throw new Error("too-big");
}

type Props = {
  kind: MediaKind;
  max: number;
  value: string[];
  onChange: (keys: string[]) => void;
  label: string;
  hint?: string;
  /** Lets the parent block submit while uploads run. */
  onBusyChange?: (busy: boolean) => void;
};

/** Pick, compress and upload photos; shows thumbnails with a remove button. */
export function PhotoPicker({ kind, max, value, onChange, label, hint, onBusyChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const keys = useRef(value);
  keys.current = value;

  const setBusyCount = setBusy;
  const busyCb = useRef(onBusyChange);
  busyCb.current = onBusyChange;
  useEffect(() => busyCb.current?.(busy > 0), [busy]);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const room = max - keys.current.length - busy;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > picked.length)
      setError(`يمكن إضافة ${max === 1 ? "صورة واحدة" : `${max} صور`} فقط.`);
    for (const file of picked) {
      if (!file.type.startsWith("image/")) {
        setError("اختر ملف صورة.");
        continue;
      }
      setBusyCount((n) => n + 1);
      try {
        const blob = await compress(file);
        const res = await fetch(`/api/media?kind=${kind}`, {
          method: "POST",
          headers: { "content-type": blob.type },
          body: blob,
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          key?: string;
          message?: string;
        };
        if (!res.ok || !data.ok || !data.key) throw new Error(data.message || "upload");
        keys.current = [...keys.current, data.key].slice(0, max);
        onChange(keys.current);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        setError(
          /[\u0600-\u06ff]/.test(msg)
            ? msg
            : msg === "decode"
              ? "تعذّر قراءة هذه الصورة. جرّب صورة JPG أو PNG."
              : msg === "too-big"
                ? "الصورة كبيرة جداً حتى بعد الضغط."
                : "تعذّر رفع الصورة. حاول مرة أخرى.",
        );
      } finally {
        setBusyCount((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
  };

  const remove = (key: string) => {
    keys.current = keys.current.filter((k) => k !== key);
    onChange(keys.current);
    // Unsaved uploads are deleted right away; saved ones are removed when the post is saved.
    void fetch(`/api/media?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      credentials: "same-origin",
    }).catch(() => {});
  };

  const full = value.length + busy >= max;
  return (
    <div>
      <p className="font-bold">{label}</p>
      {hint ? <p className="text-sm font-semibold text-muted">{hint}</p> : null}
      <ul className="mt-2 flex flex-wrap gap-2">
        {value.map((key, i) => (
          <li key={key} className="relative">
            <img
              src={mediaUrl(key)}
              alt={`صورة ${i + 1}`}
              className="thumb size-24 border border-line"
              loading="lazy"
            />
            <button
              type="button"
              className="absolute -top-2 -start-2 grid size-8 place-items-center rounded-full border border-line bg-paper shadow"
              onClick={() => remove(key)}
              aria-label={`حذف الصورة ${i + 1}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <li
            key={`busy-${i}`}
            className="thumb grid size-24 animate-pulse place-items-center text-xs font-bold text-muted"
            aria-live="polite"
          >
            جاري الرفع…
          </li>
        ))}
        {full ? null : (
          <li>
            <button
              type="button"
              className="grid size-24 place-items-center rounded-xl border-2 border-dashed border-primary-deep bg-primary-soft text-primary-ink"
              onClick={() => input.current?.click()}
              aria-label={max === 1 ? "إضافة صورة" : "إضافة صور"}
            >
              <span className="flex flex-col items-center gap-1 text-xs font-bold">
                <ImagePlus className="size-7" aria-hidden />
                أضف صورة
              </span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void add(e.currentTarget.files)}
      />
      {error ? (
        <p role="alert" className="mt-1 text-sm font-bold text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Row of small thumbnails (each opens the full photo in a new tab). */
export function PhotoStrip({ keys, size = "size-20" }: { keys: string[]; size?: string }) {
  if (!keys.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {keys.map((key, i) => (
        <li key={key}>
          <a href={mediaUrl(key)} target="_blank" rel="noopener noreferrer">
            <img
              src={mediaUrl(key)}
              alt={`صورة ${i + 1}`}
              className={`thumb ${size} border border-line`}
              loading="lazy"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
