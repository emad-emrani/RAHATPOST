import { useRouter } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { compress } from "@/components/photo-picker";
import { mediaUrl } from "@/lib/media/types";
import {
  adminGetSiteSettings,
  adminResetSiteSettings,
  adminSaveSiteSettings,
} from "@/lib/site-settings/api";
import {
  AD_PLACEMENTS,
  BUILTIN_SLIDES,
  DEFAULT_SETTINGS,
  HOME_SECTIONS,
  NAV_ITEMS,
  THEME_DEFAULT,
  THEME_PRESETS,
  TILE_ITEMS,
  themeVars,
  type AdPlacement,
  type SiteSettings,
  type Toggle,
} from "@/lib/site-settings/types";

const PARTS = {
  theme: "المظهر والألوان",
  home: "أقسام الرئيسية",
  slider: "السلايدر",
  texts: "النصوص والشعار",
  menus: "القوائم والأيقونات",
  links: "روابط سريعة",
  google: "خدمات جوجل",
} as const;
type Part = keyof typeof PARTS;

const newId = () => Math.random().toString(36).slice(2, 12).padEnd(8, "0");

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

async function uploadImage(file: File): Promise<string> {
  const blob = await compress(file);
  const res = await fetch("/api/media?kind=staff", {
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
  if (!res.ok || !data.ok || !data.key) throw new Error(data.message || "تعذّر رفع الصورة.");
  return data.key;
}

/** «إعدادات الموقع» (owner only; the server re-checks and sanitizes every save). */
export function SiteSettingsAdmin() {
  const router = useRouter();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [part, setPart] = useState<Part>("theme");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void adminGetSiteSettings().then((r) => {
      if (!r.authed) setMsg("هذا القسم لمالك الموقع فقط.");
      setS(r.settings);
    });
  }, []);

  if (!s) return <p className="stamp p-4 font-semibold">{msg || "جاري التحميل…"}</p>;

  const set = (patch: Partial<SiteSettings>) => {
    setS({ ...s, ...patch });
    setDirty(true);
    setMsg("");
  };

  const save = async () => {
    setSaving(true);
    const res = await adminSaveSiteSettings({ data: s });
    setSaving(false);
    if (!res.ok || !res.settings) return setMsg(res.message || "تعذّر الحفظ.");
    setS(res.settings);
    setDirty(false);
    setMsg("تم الحفظ ✓ تظهر التغييرات في الموقع خلال دقيقة تقريباً.");
    await router.invalidate();
  };

  const reset = async () => {
    if (!confirm("استعادة كل الإعدادات الافتراضية؟ سيتم حذف كل التخصيصات.")) return;
    const res = await adminResetSiteSettings();
    if (!res.ok) return setMsg("تعذّر الاستعادة.");
    setS(DEFAULT_SETTINGS);
    setDirty(false);
    setMsg("تمت استعادة الإعدادات الافتراضية ✓");
    await router.invalidate();
  };

  return (
    <>
      <div className="scroll-row mb-4">
        {(Object.keys(PARTS) as Part[]).map((p) => (
          <button
            key={p}
            type="button"
            className={part === p ? "chip chip-ink shrink-0" : "chip shrink-0"}
            onClick={() => setPart(p)}
          >
            {PARTS[p]}
          </button>
        ))}
      </div>

      {part === "theme" ? <ThemePart s={s} set={set} /> : null}
      {part === "home" ? (
        <Card title="أقسام الصفحة الرئيسية" hint="أظهر أو أخفِ الأقسام ورتّبها بالأسهم.">
          <ToggleList list={s.home} labels={HOME_SECTIONS} onChange={(home) => set({ home })} />
        </Card>
      ) : null}
      {part === "slider" ? <SliderPart s={s} set={set} setMsg={setMsg} /> : null}
      {part === "texts" ? <TextsPart s={s} set={set} setMsg={setMsg} /> : null}
      {part === "menus" ? (
        <>
          <Card title="شريط التنقل السفلي وقائمة الأقسام العلوية">
            <ToggleList list={s.nav} labels={NAV_ITEMS} onChange={(nav) => set({ nav })} />
          </Card>
          <Card title="أيقونات الأقسام في الرئيسية">
            <ToggleList list={s.tiles} labels={TILE_ITEMS} onChange={(tiles) => set({ tiles })} />
          </Card>
        </>
      ) : null}
      {part === "links" ? <LinksPart s={s} set={set} /> : null}
      {part === "google" ? <GooglePart s={s} set={set} /> : null}

      <div className="sticky bottom-20 z-20 mt-4 flex flex-col gap-2 rounded-2xl bg-paper p-3 shadow-[var(--shadow-lift)] md:bottom-4">
        {msg ? <p className="font-bold">{msg}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn" disabled={saving || !dirty} onClick={save}>
            {saving ? "جاري الحفظ…" : dirty ? "حفظ التغييرات" : "لا تغييرات"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            استعادة الافتراضي
          </button>
        </div>
      </div>
    </>
  );
}

type PartProps = { s: SiteSettings; set: (p: Partial<SiteSettings>) => void };

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="stamp mb-4 flex flex-col gap-3 p-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {hint ? <p className="text-sm font-semibold text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block font-bold">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ToggleList<T extends string>({
  list,
  labels,
  onChange,
}: {
  list: Toggle<T>[];
  labels: Record<T, string>;
  onChange: (l: Toggle<T>[]) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {list.map((item, i) => (
        <li
          key={item.id}
          className={`flex items-center gap-2 rounded-xl border border-line px-3 py-2 ${item.visible ? "" : "opacity-50"}`}
        >
          <span className="min-w-0 flex-1 font-bold">{labels[item.id]}</span>
          <IconBtn label="أعلى" onClick={() => onChange(move(list, i, -1))} disabled={i === 0}>
            <ArrowUp className="size-4" />
          </IconBtn>
          <IconBtn
            label="أسفل"
            onClick={() => onChange(move(list, i, 1))}
            disabled={i === list.length - 1}
          >
            <ArrowDown className="size-4" />
          </IconBtn>
          <IconBtn
            label={item.visible ? "إخفاء" : "إظهار"}
            onClick={() =>
              onChange(list.map((x) => (x.id === item.id ? { ...x, visible: !x.visible } : x)))
            }
          >
            {item.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </IconBtn>
        </li>
      ))}
    </ul>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-lg border border-line bg-paper disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ThemePart({ s, set }: PartProps) {
  const t = s.theme;
  const color = (k: keyof typeof t, label: string) => (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={t[k]}
          onChange={(e) => set({ theme: { ...t, [k]: e.target.value } })}
          className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-paper"
        />
        <input
          className="field"
          dir="ltr"
          value={t[k]}
          maxLength={7}
          onChange={(e) => set({ theme: { ...t, [k]: e.target.value } })}
        />
      </div>
    </Field>
  );
  return (
    <>
      <Card title="الألوان" hint="الألوان الفاتحة للون الأساسي تبقى أوضح مع النص الداكن.">
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="chip"
              onClick={() => set({ theme: p.theme })}
            >
              <span className="size-4 rounded-full" style={{ background: p.theme.primary }} />
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {color("primary", "اللون الأساسي (الأزرار والتحديد)")}
          {color("accent", "لون التنبيه والعاجل")}
          {color("background", "لون الخلفية")}
          {color("ink", "لون النص")}
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => set({ theme: THEME_DEFAULT })}
        >
          إرجاع الألوان الافتراضية
        </button>
      </Card>
      <Card title="معاينة مباشرة">
        <div
          className="rounded-2xl p-4"
          style={{
            ...(themeVars(t) as React.CSSProperties),
            background: "var(--color-surface)",
            color: "var(--color-ink)",
          }}
        >
          <div className="stamp p-4">
            <span className="chip chip-deep">رهط</span>
            <p className="mt-2 text-lg font-bold">عنوان خبر للمعاينة</p>
            <p className="text-sm font-semibold text-muted">منذ 5 دقائق · رهط بوست</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="btn">زر أساسي</span>
              <span className="chip chip-alert">عاجل</span>
              <span className="see-all">عرض الكل</span>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

function ImagePick({
  label,
  value,
  onChange,
  setMsg,
}: {
  label: string;
  value: string;
  onChange: (k: string) => void;
  setMsg: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <span className="font-bold">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={mediaUrl(value)} alt="" className="size-16 rounded-xl object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-xl bg-primary-soft text-xs font-bold">
            افتراضي
          </span>
        )}
        <label className="btn btn-ghost px-3">
          {busy ? "جاري الرفع…" : "اختيار صورة"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                onChange(await uploadImage(f));
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "تعذّر رفع الصورة.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {value ? (
          <button type="button" className="btn btn-ghost px-3" onClick={() => onChange("")}>
            إزالة
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TextsPart({ s, set, setMsg }: PartProps & { setMsg: (m: string) => void }) {
  const t = s.texts;
  const text = (k: keyof typeof t, label: string, max: number, multi = false) => (
    <Field label={label}>
      {multi ? (
        <textarea
          className="field min-h-20"
          value={t[k]}
          maxLength={max}
          onChange={(e) => set({ texts: { ...t, [k]: e.target.value } })}
        />
      ) : (
        <input
          className="field"
          value={t[k]}
          maxLength={max}
          dir={k === "contactEmail" ? "ltr" : undefined}
          onChange={(e) => set({ texts: { ...t, [k]: e.target.value } })}
        />
      )}
    </Field>
  );
  return (
    <>
      <Card title="نصوص الموقع">
        {text("siteName", "اسم الموقع (في الشريط العلوي)", 40)}
        {text("tagline", "الشعار تحت الاسم", 60)}
        {text("addButton", "نص زر الإضافة", 16)}
        {text("footer", "نص أسفل الصفحة", 400, true)}
        {text("contactEmail", "بريد التواصل (يظهر أسفل الصفحة)", 120)}
      </Card>
      <Card
        title="الشعار والأيقونة"
        hint="صورة مربعة JPG أو WebP. تُستبدل صورة الشعار في الشريط العلوي وأيقونة المتصفح."
      >
        <ImagePick
          label="الشعار"
          value={s.logoKey}
          onChange={(logoKey) => set({ logoKey })}
          setMsg={setMsg}
        />
        <ImagePick
          label="أيقونة المتصفح (favicon)"
          value={s.faviconKey}
          onChange={(faviconKey) => set({ faviconKey })}
          setMsg={setMsg}
        />
      </Card>
    </>
  );
}

function SliderPart({ s, set, setMsg }: PartProps & { setMsg: (m: string) => void }) {
  const slides = s.slides;
  const missing = (Object.keys(BUILTIN_SLIDES) as (keyof typeof BUILTIN_SLIDES)[]).filter(
    (id) => !slides.some((x) => x.type === "builtin" && x.id === id),
  );
  const update = (i: number, patch: Record<string, string>) =>
    set({
      slides: slides.map((x, j) => (j === i && x.type === "custom" ? { ...x, ...patch } : x)),
    });
  return (
    <Card title="شرائح السلايدر" hint="رتّب الشرائح بالأسهم. الشرائح الجاهزة تتحدث تلقائياً.">
      <ul className="flex flex-col gap-3">
        {slides.map((x, i) => (
          <li key={x.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 font-bold">
                {x.type === "builtin"
                  ? `شريحة جاهزة: ${BUILTIN_SLIDES[x.id]}`
                  : x.title || "شريحة جديدة"}
              </span>
              <IconBtn
                label="أعلى"
                onClick={() => set({ slides: move(slides, i, -1) })}
                disabled={i === 0}
              >
                <ArrowUp className="size-4" />
              </IconBtn>
              <IconBtn
                label="أسفل"
                onClick={() => set({ slides: move(slides, i, 1) })}
                disabled={i === slides.length - 1}
              >
                <ArrowDown className="size-4" />
              </IconBtn>
              <IconBtn
                label="حذف"
                onClick={() => set({ slides: slides.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" />
              </IconBtn>
            </div>
            {x.type === "custom" ? (
              <div className="mt-3 flex flex-col gap-2">
                <Field label="العنوان">
                  <input
                    className="field"
                    value={x.title}
                    maxLength={90}
                    onChange={(e) => update(i, { title: e.target.value })}
                  />
                </Field>
                <Field label="نص قصير (اختياري)">
                  <input
                    className="field"
                    value={x.subtitle}
                    maxLength={140}
                    onChange={(e) => update(i, { subtitle: e.target.value })}
                  />
                </Field>
                <Field label="الرابط (صفحة في الموقع مثل /buses أو رابط https)">
                  <input
                    className="field"
                    dir="ltr"
                    value={x.link}
                    maxLength={300}
                    onChange={(e) => update(i, { link: e.target.value })}
                  />
                </Field>
                <ImagePick
                  label="الصورة"
                  value={x.imageKey}
                  onChange={(imageKey) => update(i, { imageKey })}
                  setMsg={setMsg}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn"
        disabled={slides.length >= 12}
        onClick={() =>
          set({
            slides: [
              ...slides,
              { type: "custom", id: newId(), title: "", subtitle: "", link: "", imageKey: "" },
            ],
          })
        }
      >
        إضافة شريحة
      </button>
      {missing.length ? (
        <div className="flex flex-wrap gap-2">
          {missing.map((id) => (
            <button
              key={id}
              type="button"
              className="chip"
              onClick={() => set({ slides: [...slides, { type: "builtin", id }] })}
            >
              + {BUILTIN_SLIDES[id]}
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function LinksPart({ s, set }: PartProps) {
  const links = s.quickLinks;
  const update = (i: number, patch: Record<string, string>) =>
    set({ quickLinks: links.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <Card
      title="روابط سريعة في الرئيسية"
      hint="بطاقات صغيرة بروابط تختارها. رتّب مكانها من «أقسام الرئيسية»."
    >
      <ul className="flex flex-col gap-3">
        {links.map((l, i) => (
          <li key={l.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <div className="flex items-center gap-2">
              <input
                className="field w-16 text-center"
                value={l.emoji}
                maxLength={4}
                placeholder="🔗"
                onChange={(e) => update(i, { emoji: e.target.value })}
                aria-label="رمز"
              />
              <input
                className="field flex-1"
                value={l.title}
                maxLength={60}
                placeholder="العنوان"
                onChange={(e) => update(i, { title: e.target.value })}
              />
              <IconBtn
                label="أعلى"
                onClick={() => set({ quickLinks: move(links, i, -1) })}
                disabled={i === 0}
              >
                <ArrowUp className="size-4" />
              </IconBtn>
              <IconBtn
                label="حذف"
                onClick={() => set({ quickLinks: links.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" />
              </IconBtn>
            </div>
            <input
              className="field"
              value={l.subtitle}
              maxLength={100}
              placeholder="وصف قصير (اختياري)"
              onChange={(e) => update(i, { subtitle: e.target.value })}
            />
            <input
              className="field"
              dir="ltr"
              value={l.url}
              maxLength={300}
              placeholder="/directory أو https://…"
              onChange={(e) => update(i, { url: e.target.value })}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn"
        disabled={links.length >= 12}
        onClick={() =>
          set({
            quickLinks: [...links, { id: newId(), title: "", subtitle: "", url: "", emoji: "" }],
          })
        }
      >
        إضافة رابط
      </button>
      <p className="text-sm font-semibold text-muted">
        الروابط بدون عنوان أو برابط غير صحيح لا تُحفظ.
      </p>
    </Card>
  );
}

function GooglePart({ s, set }: PartProps) {
  const g = s.google;
  const up = (patch: Partial<typeof g>) => set({ google: { ...g, ...patch } });
  const check = (on: boolean, label: string, onChange: (v: boolean) => void) => (
    <label className="flex items-center gap-2 font-bold">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
  const bad = (v: string, re: RegExp) =>
    v && !re.test(v.trim()) ? (
      <p className="text-sm font-bold text-alert">الصيغة غير صحيحة — لن تُحفظ.</p>
    ) : null;
  return (
    <>
      <Card
        title="Google AdSense"
        hint="أدخل المعرّفات فقط (لا تلصق أكواد). لا تظهر الإعلانات في لوحة الإدارة وصفحات الحساب."
      >
        <Field label="معرّف الناشر (ca-pub-…)">
          <input
            className="field"
            dir="ltr"
            value={g.adsensePub}
            placeholder="ca-pub-1234567890123456"
            onChange={(e) => up({ adsensePub: e.target.value })}
          />
        </Field>
        {bad(g.adsensePub, /^ca-pub-\d{10,20}$/)}
        {check(g.adsenseEnabled, "تفعيل الإعلانات", (v) => up({ adsenseEnabled: v }))}
        {check(g.autoAds, "الإعلانات التلقائية (Auto ads) — فعّلها أيضاً من حساب AdSense", (v) =>
          up({ autoAds: v }),
        )}
        <p className="text-sm font-semibold text-muted">
          ملف ads.txt يُنشأ تلقائياً على rahatpost.com/ads.txt من معرّف الناشر.
        </p>
        <div className="flex flex-col gap-2">
          <p className="font-bold">وحدات إعلانية يدوية</p>
          {g.slots.map((a, i) => (
            <div key={a.id} className="flex items-center gap-2">
              <input
                className="field flex-1"
                dir="ltr"
                value={a.slot}
                placeholder="رقم الوحدة (data-ad-slot)"
                onChange={(e) =>
                  up({
                    slots: g.slots.map((x, j) => (j === i ? { ...x, slot: e.target.value } : x)),
                  })
                }
              />
              <select
                className="field flex-1"
                value={a.placement}
                onChange={(e) =>
                  up({
                    slots: g.slots.map((x, j) =>
                      j === i ? { ...x, placement: e.target.value as AdPlacement } : x,
                    ),
                  })
                }
              >
                {(Object.keys(AD_PLACEMENTS) as AdPlacement[]).map((p) => (
                  <option key={p} value={p}>
                    {AD_PLACEMENTS[p]}
                  </option>
                ))}
              </select>
              <IconBtn label="حذف" onClick={() => up({ slots: g.slots.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
              </IconBtn>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={g.slots.length >= 10}
            onClick={() =>
              up({ slots: [...g.slots, { id: newId(), slot: "", placement: "home" }] })
            }
          >
            إضافة وحدة إعلانية
          </button>
        </div>
      </Card>
      <Card title="Google Analytics 4">
        <Field label="معرّف القياس (G-…)">
          <input
            className="field"
            dir="ltr"
            value={g.gaId}
            placeholder="G-XXXXXXXXXX"
            onChange={(e) => up({ gaId: e.target.value.toUpperCase() })}
          />
        </Field>
        {bad(g.gaId, /^G-[A-Z0-9]{4,16}$/)}
        {check(g.gaEnabled, "تفعيل Google Analytics", (v) => up({ gaEnabled: v }))}
      </Card>
      <Card title="Google Tag Manager (اختياري)">
        <Field label="معرّف الحاوية (GTM-…)">
          <input
            className="field"
            dir="ltr"
            value={g.gtmId}
            placeholder="GTM-XXXXXXX"
            onChange={(e) => up({ gtmId: e.target.value.toUpperCase() })}
          />
        </Field>
        {bad(g.gtmId, /^GTM-[A-Z0-9]{4,12}$/)}
      </Card>
      <Card
        title="Google Search Console"
        hint="من «طريقة التحقق: علامة HTML» انسخ قيمة content فقط."
      >
        <Field label="رمز التحقق">
          <input
            className="field"
            dir="ltr"
            value={g.gscCode}
            onChange={(e) => up({ gscCode: e.target.value.trim() })}
          />
        </Field>
        {bad(g.gscCode, /^[A-Za-z0-9_-]{10,100}$/)}
      </Card>
    </>
  );
}
