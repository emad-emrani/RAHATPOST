import { Link } from "@tanstack/react-router";
import { ImageOff, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { PhotoPicker } from "@/components/photo-picker";
import { tr, trv } from "@/lib/i18n/core";
import { MAX_AD_PHOTOS, mediaUrl } from "@/lib/media/types";
import { catName, fieldLabel, findCat, optionLabel, specText, type HarajCategory } from "@/lib/market/categories";
import { CONDITIONS, type SpecField, type Specs, priceLabel, type Listing, type ListingInput, type PriceMode, type Seller } from "@/lib/market/types";
import { useSiteSettings } from "@/lib/site-settings/context";

export function useHarajName(): string {
  return useSiteSettings().texts.harajName;
}

export function memberSince(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

export function SellerAvatar({ seller, size = 10 }: { seller: Pick<Seller, "name" | "image">; size?: number }) {
  const cls = `size-${size} shrink-0 rounded-full object-cover bg-surface`;
  return seller.image ? (
    <img src={seller.image} alt="" className={cls} referrerPolicy="no-referrer" loading="lazy" />
  ) : (
    <span className={`${cls} grid place-items-center`}>
      <UserRound className="size-5 text-muted" aria-hidden />
    </span>
  );
}

export function SellerCard({ seller }: { seller: Seller }) {
  return (
    <Link to="/haraj/seller/$id" params={{ id: seller.id }} className="stamp press flex items-center gap-3 p-3">
      <SellerAvatar seller={seller} size={12} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{seller.name}</span>
        <span className="block text-sm font-semibold text-muted">{tr("عضو منذ {0}", memberSince(seller.since))}</span>
      </span>
      <span className="text-sm font-bold text-accent">{tr("كل إعلاناته")}</span>
    </Link>
  );
}

export function ListingCard({ item }: { item: Listing }) {
  return (
    <Link to="/haraj/$id" params={{ id: item.id }} className="stamp press relative block overflow-hidden">
      <div className="relative aspect-square bg-surface">
        {item.photos[0] ? (
          <img src={mediaUrl(item.photos[0])} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="grid size-full place-items-center text-muted">
            <ImageOff className="size-8" aria-hidden />
          </span>
        )}
        {item.sold ? (
          <span className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="chip chip-ink text-base">{tr("انباع")}</span>
          </span>
        ) : null}
        {item.photos.length > 1 ? (
          <span className="chip absolute bottom-2 start-2 bg-paper/90 text-xs">{item.photos.length} 📷</span>
        ) : null}
      </div>
      <div className="p-2.5">
        <p className="font-bold text-ink">{trv(priceLabel(item))}</p>
        <p className="line-clamp-2 text-sm font-bold leading-snug">{trv(item.title)}</p>
        <p className="mt-1 truncate text-xs font-semibold text-muted">
          {item.specs.year || item.specs.km
            ? [item.specs.year, item.specs.km !== undefined ? `${Number(item.specs.km).toLocaleString("en-US")} ${tr("كم")}` : null].filter(Boolean).join(" · ")
            : trv(item.condition)}{" "}
          · {trv(item.area)}
        </p>
      </div>
    </Link>
  );
}

type FormProps = {
  cats: HarajCategory[];
  initial?: Partial<ListingInput>;
  submitLabel: string;
  onSubmit: (data: ListingInput & { website: string; startedAt: number }) => Promise<string | null>;
};

export function ListingForm({ cats, initial, submitLabel, onSubmit }: FormProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<PriceMode>(initial?.priceMode ?? "price");
  const [category, setCategory] = useState(initial?.category ?? "");
  useEffect(() => setStartedAt(Date.now()), []);

  return (
    <form
      className="stamp flex flex-col gap-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (uploading) return setError(tr("انتظر حتى يكتمل رفع الصور."));
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "");
        setBusy(true);
        try {
          const message = await onSubmit({
            title: get("title"),
            category: get("category"),
            priceMode: mode,
            specs: Object.fromEntries((findCat(cats, get("category"))?.fields ?? []).map((sf) => [sf.key, get(`spec_${sf.key}`)]).filter(([, v]) => v)),
            price: mode === "free" ? null : Number(get("price")) || null,
            condition: get("condition"),
            area: get("area"),
            description: get("description"),
            phone: get("phone"),
            hidePhone: f.get("hidePhone") === "on",
            photos,
            website: get("website"),
            startedAt,
          });
          if (message) setError(message);
        } catch {
          setError(tr("تعذّر الإرسال. حاول مرة أخرى."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <PhotoPicker
        kind="ad"
        max={MAX_AD_PHOTOS}
        value={photos}
        onChange={setPhotos}
        onBusyChange={setUploading}
        label={tr("الصور (حتى {0})", MAX_AD_PHOTOS)}
        hint={tr("أول صورة هي صورة الغلاف.")}
      />
      <label className="block font-bold">
        {tr("العنوان")}
        <input name="title" required minLength={3} maxLength={90} defaultValue={initial?.title} className="field mt-1" placeholder={tr("مثال: غسالة سامسونج 8 كغم")} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block font-bold">
          {tr("التصنيف")}
          <select name="category" required className="field mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="" disabled>{tr("اختر")}</option>
            {cats.filter((c) => c.enabled || c.key === initial?.category).map((c) => <option key={c.key} value={c.key}>{c.icon} {catName(c)}</option>)}
          </select>
        </label>
        <label className="block font-bold">
          {tr("الحالة")}
          <select name="condition" required className="field mt-1" defaultValue={initial?.condition ?? "مستعمل"}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{trv(c)}</option>)}
          </select>
        </label>
      </div>
      {findCat(cats, category)?.fields.length ? <SpecsFields key={category} fields={findCat(cats, category)!.fields} initial={initial?.specs ?? {}} /> : null}
      <fieldset>
        <legend className="font-bold">{tr("السعر")}</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(["price", "negotiable", "free"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={m === mode ? "chip chip-ink justify-center py-2" : "chip justify-center bg-paper py-2"}>
              {m === "price" ? tr("سعر ثابت") : m === "negotiable" ? tr("قابل للتفاوض") : tr("مجاناً")}
            </button>
          ))}
        </div>
        {mode !== "free" ? (
          <div className="relative mt-2">
            <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center font-bold text-muted">₪</span>
            <input name="price" inputMode="numeric" pattern="[0-9]*" maxLength={8} required={mode === "price"} defaultValue={initial?.price ?? ""} className="field ps-8" placeholder={mode === "negotiable" ? tr("اختياري") : "0"} />
          </div>
        ) : null}
      </fieldset>
      <label className="block font-bold">
        {tr("المنطقة / الحي")}
        <input name="area" required minLength={2} maxLength={60} defaultValue={initial?.area} className="field mt-1" placeholder={tr("مثال: رهط، حي 12")} />
      </label>
      <label className="block font-bold">
        {tr("الوصف")}
        <textarea name="description" required minLength={10} maxLength={3000} defaultValue={initial?.description} className="field mt-1 min-h-32" />
      </label>
      <label className="block font-bold">
        {tr("رقم الهاتف (واتساب)")}
        <input name="phone" type="tel" dir="ltr" required defaultValue={initial?.phone} className="field mt-1" placeholder="05X-XXXXXXX" />
      </label>
      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" name="hidePhone" defaultChecked={initial?.hidePhone} className="size-5" />
        {tr("إخفاء الرقم (التواصل عبر واتساب فقط)")}
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error ? <p className="font-bold text-red-700" role="alert">{error}</p> : null}
      <button className="btn btn-primary" disabled={busy}>{busy ? tr("جاري الإرسال…") : submitLabel}</button>
      <p className="text-sm font-semibold text-muted">{tr("يظهر الإعلان بعد مراجعة الإدارة، ويبقى 60 يوماً ويمكن تجديده.")}</p>
    </form>
  );
}

/** Optional details block for the chosen category (fields come from the admin category config). Every field can be skipped. */
function SpecsFields({ fields, initial }: { fields: readonly SpecField[]; initial: Specs }) {
  return (
    <details open className="rounded-xl border border-black/10 p-3">
      <summary className="cursor-pointer font-bold">
        {tr("تفاصيل إضافية")} <span className="text-sm font-semibold text-muted">({tr("اختياري — املأ ما تريد")})</span>
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {fields.map((f) => {
          const name = `spec_${f.key}`;
          const def = initial[f.key] !== undefined ? String(initial[f.key]) : "";
          return (
            <label key={f.key} className="block text-sm font-bold">
              {fieldLabel(f)}
              {f.type === "select" ? (
                <select name={name} defaultValue={def} className="field mt-1">
                  <option value="">{tr("—")}</option>
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{optionLabel(f, o)}</option>)}
                </select>
              ) : f.type === "month" ? (
                <input name={name} type="month" defaultValue={def} className="field mt-1" dir="ltr" />
              ) : f.type === "number" ? (
                <input name={name} inputMode="numeric" pattern="[0-9]*" defaultValue={def} className="field mt-1" dir="ltr" />
              ) : (
                <input name={name} maxLength={f.max ?? 60} defaultValue={def} placeholder={f.placeholder ? trv(f.placeholder) : undefined} className="field mt-1" />
              )}
            </label>
          );
        })}
      </div>
    </details>
  );
}

/** Filled specs as a two-column list (nothing when none were given). */
export function SpecsTable({ cat, specs }: { cat: HarajCategory | undefined; specs: Specs }) {
  const rows = (cat?.fields ?? []).filter((f) => specs[f.key] !== undefined);
  if (!rows.length) return null;
  return (
    <>
      <h2 className="mt-5 font-bold">{tr("المواصفات")}</h2>
      <dl className="mt-2 grid grid-cols-2 gap-2">
        {rows.map((f) => (
          <div key={f.key} className="rounded-xl bg-surface px-3 py-2">
            <dt className="text-xs font-semibold text-muted">{fieldLabel(f)}</dt>
            <dd className="font-bold">{specText(f, specs[f.key])}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
