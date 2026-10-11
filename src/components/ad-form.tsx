import { useEffect, useState } from "react";
import { PhotoPicker } from "@/components/photo-picker";
import { adPostTypes, type AdInput } from "@/lib/ads/types";
import { MAX_AD_PHOTOS } from "@/lib/media/types";

type Props = {
  initial?: Partial<AdInput>;
  submitLabel: string;
  /** Returns an error message to show, or null on success. */
  onSubmit: (data: AdInput & { website: string; startedAt: number }) => Promise<string | null>;
  onCancel?: () => void;
};

/** Classified ad form (new + edit). Includes the honeypot + timing used by the server. */
export function AdForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setStartedAt(Date.now()), []);

  return (
    <form
      className="stamp flex flex-col gap-3 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        if (uploading) {
          setError("انتظر حتى يكتمل رفع الصور.");
          return;
        }
        const form = new FormData(event.currentTarget);
        const get = (k: string) => String(form.get(k) ?? "");
        setBusy(true);
        try {
          const message = await onSubmit({
            type: get("type"),
            title: get("title"),
            description: get("description"),
            price: get("price"),
            neighborhood: get("neighborhood"),
            phone: get("phone"),
            photos,
            website: get("website"),
            startedAt,
          });
          if (message) setError(message);
        } catch {
          setError("تعذّر الإرسال. حاول مرة أخرى.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block font-bold">
        نوع الإعلان
        <select name="type" required className="field mt-1" defaultValue={initial?.type ?? ""}>
          <option value="" disabled>
            اختر النوع
          </option>
          {adPostTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <Input label="عنوان الإعلان" name="title" min={3} max={90} defaultValue={initial?.title} />
      <label className="block font-bold">
        التفاصيل
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={1000}
          defaultValue={initial?.description}
          className="field mt-1 min-h-32"
        />
      </label>
      <Input
        label="السعر (اختياري)"
        name="price"
        max={30}
        required={false}
        defaultValue={initial?.price ?? ""}
      />
      <Input
        label="الحي"
        name="neighborhood"
        min={2}
        max={60}
        defaultValue={initial?.neighborhood}
      />
      <Input
        label="هاتف للتواصل"
        name="phone"
        type="tel"
        max={20}
        defaultValue={initial?.phone}
        dir="ltr"
      />
      <PhotoPicker
        kind="ad"
        max={MAX_AD_PHOTOS}
        value={photos}
        onChange={setPhotos}
        onBusyChange={setUploading}
        label="صور (اختياري)"
        hint={`حتى ${MAX_AD_PHOTOS} صور. نصغّرها ونحذف منها بيانات الموقع قبل الرفع.`}
      />
      {/* Honeypot: hidden from people, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
        <label>
          الموقع
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-sm font-semibold text-muted">
        يُنشر الإعلان باسمك بعد مراجعته، ويظهر رقم الهاتف لمن يفتح الإعلان. أي تعديل يعيده للمراجعة.
      </p>
      {error ? (
        <p role="alert" className="font-bold text-ink">
          {error}
        </p>
      ) : null}
      <div className={onCancel ? "grid grid-cols-2 gap-2" : "grid"}>
        <button type="submit" className="btn" disabled={busy || uploading}>
          {busy ? "جاري الإرسال…" : uploading ? "جاري رفع الصور…" : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            إلغاء
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Input({
  label,
  name,
  min,
  max,
  type = "text",
  required = true,
  defaultValue,
  dir,
}: {
  label: string;
  name: string;
  min?: number;
  max?: number;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  dir?: "ltr";
}) {
  return (
    <label className="block font-bold">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        minLength={min}
        maxLength={max}
        defaultValue={defaultValue}
        dir={dir}
        className="field mt-1"
      />
    </label>
  );
}
