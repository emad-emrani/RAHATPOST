import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { compress } from "@/components/photo-picker";
import { SectionCover } from "@/components/store-parts";
import { mediaUrl } from "@/lib/media/types";
import {
  adminCodes,
  adminDeleteCategory,
  adminDeleteSamples,
  adminDeleteProduct,
  adminGetPaySettings,
  adminListOrders,
  adminOrderAction,
  adminSaveCategory,
  adminSavePaySettings,
  adminSaveProduct,
  adminStoreData,
  adminTestPayment,
} from "@/lib/store/api";
import {
  CURRENCIES,
  DURATIONS,
  formatPrice,
  ORDER_STATUS,
  PROVIDERS,
  SECTION_ICONS,
  type Order,
  type OrderStatus,
  type StoreCategory,
} from "@/lib/store/types";
import type { AdminProductRow } from "@/lib/store/store.server";
import type { AdminPaySettings } from "@/lib/store/settings.server";
import { tr, trv } from "@/lib/i18n/core";

const PARTS = {
  products: "المنتجات",
  categories: "الأقسام والكتالوجات",
  orders: "الطلبات",
  pay: "إعدادات الدفع",
} as const;
type Part = keyof typeof PARTS;

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
  if (!res.ok || !data.ok || !data.key) throw new Error(data.message || tr("تعذّر رفع الصورة."));
  return data.key;
}

/** «المتجر» admin: owner + مشرف; «إعدادات الدفع» owner only (the server re-checks every call). */
export function StoreAdmin({ isOwner }: { isOwner: boolean }) {
  const [part, setPart] = useState<Part>("products");
  const parts = (Object.keys(PARTS) as Part[]).filter((p) => p !== "pay" || isOwner);
  return (
    <>
      <div className="scroll-row mb-4">
        {parts.map((p) => (
          <button
            key={p}
            type="button"
            className={part === p ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
            onClick={() => setPart(p)}
          >
            {trv(PARTS[p])}
          </button>
        ))}
      </div>
      {part === "products" || part === "categories" ? (
        <Catalog part={part} />
      ) : part === "orders" ? (
        <Orders />
      ) : (
        <PaySettings />
      )}
    </>
  );
}

/* ------------------------------------------------------------- catalog */

type Data = {
  products: AdminProductRow[];
  categories: StoreCategory[];
  low: { name: string; freeCodes: number }[];
  lowThreshold: number;
};

function Catalog({ part }: { part: "products" | "categories" }) {
  const [data, setData] = useState<Data | null>(null);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Partial<AdminProductRow> | null>(null);
  const refresh = useCallback(async () => {
    const r = await adminStoreData();
    if (!r.authed) return setMsg(tr("انتهت الجلسة."));
    setData(r);
  }, []);
  useEffect(() => void refresh(), [refresh]);
  if (!data) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;

  if (part === "categories") return <Categories cats={data.categories} refresh={refresh} />;
  if (editing)
    return (
      <ProductForm
        p={editing}
        cats={data.categories}
        onDone={async () => {
          setEditing(null);
          await refresh();
        }}
      />
    );
  return (
    <>
      {data.low.length ? (
        <div className="stamp mb-3 flex gap-2 border-red-300 p-3 font-bold">
          <AlertTriangle className="size-5 shrink-0 text-red-700" aria-hidden />
          <span>
            {tr("أكواد قليلة (≤")} {trv(data.lowThreshold)}):{" "}
            {data.low.map((l) => `${l.name} (${l.freeCodes})`).join(tr("، "))}
          </span>
        </div>
      ) : null}
      <button
        type="button"
        className="btn mb-3 w-full"
        onClick={() =>
          setEditing({ active: false, duration: "none", deliveryType: "fixed", badges: [] })
        }
      >
        <Plus className="size-4" aria-hidden />
        {tr("منتج جديد")}
      </button>
      {data.products.some((p) => p.isSample) ? (
        <button
          type="button"
          className="btn btn-ghost mb-3 w-full"
          onClick={async () => {
            if (!confirm(tr("حذف كل المنتجات التجريبية «مثال»؟"))) return;
            const r = await adminDeleteSamples();
            setMsg(r.ok ? tr("حُذف {0} منتج تجريبي.", r.n) : tr("تعذّر الحذف."));
            await refresh();
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          {tr("حذف كل الأمثلة (")}{trv(data.products.filter((p) => p.isSample).length)})
        </button>
      ) : null}
      {msg ? <p className="stamp mb-3 p-3 font-bold">{trv(msg)}</p> : null}
      {data.products.length === 0 ? (
        <p className="stamp p-4 font-semibold">
          {tr("لا منتجات بعد. المتجر يظهر فارغاً للزوار حتى تضيف منتجاً وتفعّله.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.products.map((p) => (
            <li key={p.id} className="stamp flex gap-3 p-3">
              {p.imageKey ? (
                <img
                  src={mediaUrl(p.imageKey)}
                  alt=""
                  className="size-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="size-16 shrink-0 rounded-xl bg-primary-soft" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1">
                  {p.isSample ? <span className="chip chip-deep">{tr("مثال")}</span> : null}
                  <span className={p.active ? "chip chip-ok" : "chip"}>
                    {p.active ? tr("مفعّل") : tr("مخفي")}
                  </span>
                  <span className="chip">
                    {p.deliveryType === "codes"
                      ? tr("أكواد: {0} متاح · {1} مُسلّم", p.freeCodes, p.usedCodes)
                      : p.stock == null
                        ? tr("غير محدود")
                        : tr("الكمية: {0}", p.stock)}
                  </span>
                </div>
                <p className="mt-1 font-bold">{trv(p.name)}</p>
                <p className="text-sm font-semibold text-muted" dir="ltr">
                  {formatPrice(p.saleAgorot ?? p.priceAgorot)} · /store/{trv(p.slug)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3"
                    onClick={() => setEditing(p)}
                  >
                    <Pencil className="size-4" aria-hidden />
                    {tr("تعديل")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3"
                    onClick={async () => {
                      if (!confirm(tr("حذف «{0}»؟", p.name))) return;
                      await adminDeleteProduct({ data: { id: p.id } });
                      await refresh();
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {tr("حذف")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const shekel = (a: number | null | undefined) => (a == null ? "" : String(a / 100));

function ProductForm({
  p,
  cats,
  onDone,
}: {
  p: Partial<AdminProductRow>;
  cats: StoreCategory[];
  onDone: () => void;
}) {
  const [f, setF] = useState({
    id: p.id ?? "",
    name: p.name ?? "",
    slug: p.slug ?? "",
    categoryId: p.categoryId ?? "",
    price: shekel(p.priceAgorot),
    sale: shekel(p.saleAgorot),
    imageKey: p.imageKey ?? "",
    shortDesc: p.shortDesc ?? "",
    description: p.description ?? "",
    duration: p.duration ?? "none",
    badges: (p.badges ?? []).join(tr("، ")),
    stock: p.stock == null ? "" : String(p.stock),
    active: p.active ?? false,
    sort: String(p.sort ?? 0),
    deliveryType: p.deliveryType ?? "fixed",
    delivery: p.delivery ?? "",
    isSample: p.isSample ?? false,
  });
  const [codes, setCodes] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (x: Partial<typeof f>) => setF((o) => ({ ...o, ...x }));
  const save = async () => {
    setBusy(true);
    setMsg("");
    const r = await adminSaveProduct({ data: { ...f, badges: f.badges.split(/[،,]/) } });
    if (r.ok && codes.trim() && r.id) {
      const c = await adminCodes({ data: { productId: r.id, text: codes } });
      setMsg(tr("أُضيف {0} كود.", c.n));
    }
    setBusy(false);
    if (!r.ok) return setMsg(r.message ?? tr("تعذّر الحفظ."));
    onDone();
  };
  const field = "field mt-1";
  return (
    <div className="stamp flex flex-col gap-3 p-4">
      <h2 className="text-xl font-bold">{f.id ? tr("تعديل منتج") : tr("منتج جديد")}</h2>
      <label className="font-bold">
        {tr("الاسم")}
        <input
          className={field}
          value={f.name}
          maxLength={120}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>
      <label className="font-bold">
        {tr("الرابط (slug بالإنجليزية)")}
        <input
          className={field}
          dir="ltr"
          value={f.slug}
          placeholder="netflix-monthly"
          onChange={(e) => set({ slug: e.target.value })}
        />
      </label>
      <label className="font-bold">
        {tr("القسم")}
        <select
          className={field}
          value={f.categoryId}
          onChange={(e) => set({ categoryId: e.target.value })}
        >
          <option value="">{tr("بدون")}</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parentId
                ? `${cats.find((k) => k.id === c.parentId)?.name ?? ""} › ${c.name}`
                : c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="font-bold">
          {tr("السعر")}
          <input
            className={field}
            inputMode="decimal"
            dir="ltr"
            value={f.price}
            onChange={(e) => set({ price: e.target.value })}
          />
        </label>
        <label className="font-bold">
          {tr("سعر التخفيض")}
          <input
            className={field}
            inputMode="decimal"
            dir="ltr"
            value={f.sale}
            placeholder={tr("اختياري")}
            onChange={(e) => set({ sale: e.target.value })}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="font-bold">
          {tr("المدة")}
          <select
            className={field}
            value={f.duration}
            onChange={(e) => set({ duration: e.target.value as typeof f.duration })}
          >
            {Object.entries(DURATIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {trv(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="font-bold">
          {tr("الترتيب")}
          <input
            className={field}
            inputMode="numeric"
            dir="ltr"
            value={f.sort}
            onChange={(e) => set({ sort: e.target.value })}
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        {f.imageKey ? (
          <img src={mediaUrl(f.imageKey)} alt="" className="size-16 rounded-xl object-cover" />
        ) : (
          <span className="size-16 rounded-xl bg-primary-soft" />
        )}
        <label className="btn btn-ghost px-3">
          {busy ? "…" : tr("صورة المنتج")}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                set({ imageKey: await uploadImage(file) });
              } catch (err) {
                setMsg(err instanceof Error ? err.message : tr("تعذّر الرفع."));
              }
              setBusy(false);
            }}
          />
        </label>
        {f.imageKey ? (
          <button
            type="button"
            className="btn btn-ghost px-3"
            onClick={() => set({ imageKey: "" })}
          >
            {tr("إزالة")}
          </button>
        ) : null}
      </div>
      <label className="font-bold">
        {tr("وصف قصير")}
        <input
          className={field}
          maxLength={200}
          value={f.shortDesc}
          onChange={(e) => set({ shortDesc: e.target.value })}
        />
      </label>
      <label className="font-bold">
        {tr("الوصف")}
        <textarea
          className={`${field} min-h-24`}
          maxLength={4000}
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>
      <label className="font-bold">
        {tr("شارات (مفصولة بفاصلة)")}
        <input
          className={field}
          value={f.badges}
          placeholder={tr("الأكثر مبيعاً، جديد")}
          onChange={(e) => set({ badges: e.target.value })}
        />
      </label>
      <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-3">
        <legend className="px-1 font-bold">{tr("التسليم التلقائي بعد الدفع")}</legend>
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="radio"
            checked={f.deliveryType === "fixed"}
            onChange={() => set({ deliveryType: "fixed" })}
          />{" "}
          {tr("محتوى ثابت لكل المشترين (نص / رابط)")}
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="radio"
            checked={f.deliveryType === "codes"}
            onChange={() => set({ deliveryType: "codes" })}
          />{" "}
          {tr("مخزون أكواد (كود مختلف لكل وحدة)")}
        </label>
        {f.deliveryType === "fixed" ? (
          <>
            <label className="font-bold">
              {tr("محتوى التسليم (يظهر للمشتري فقط بعد تأكيد الدفع)")}
              <textarea
                className={`${field} min-h-20`}
                dir="auto"
                value={f.delivery}
                onChange={(e) => set({ delivery: e.target.value })}
              />
            </label>
            <label className="font-bold">
              {tr("الكمية المتوفرة")}
              <input
                className={field}
                inputMode="numeric"
                dir="ltr"
                value={f.stock}
                placeholder={tr("فارغ = غير محدود")}
                onChange={(e) => set({ stock: e.target.value })}
              />
            </label>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-muted">
              {tr("متاح الآن:")} {p.freeCodes ?? 0} {tr("· مُسلّم:")} {p.usedCodes ?? 0}{tr(". عند نفاد الأكواد يظهر المنتج «نفد» تلقائياً.")}
            </p>
            <label className="font-bold">
              {tr("أضف أكواداً (كود في كل سطر)")}
              <textarea
                className={`${field} min-h-24 font-mono`}
                dir="ltr"
                value={codes}
                onChange={(e) => setCodes(e.target.value)}
              />
            </label>
            {f.id && (p.freeCodes ?? 0) > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  if (!confirm(tr("حذف كل الأكواد غير المستخدمة؟"))) return;
                  const r = await adminCodes({ data: { productId: f.id, clear: true } });
                  setMsg(tr("حُذف {0} كود غير مستخدم.", r.n));
                }}
              >
                {tr("حذف الأكواد غير المستخدمة")}
              </button>
            ) : null}
          </>
        )}
      </fieldset>
      <label className="flex items-center gap-2 font-bold">
        <input
          type="checkbox"
          className="size-5"
          checked={f.isSample}
          onChange={(e) => set({ isSample: e.target.checked })}
        />{" "}
        {tr("منتج تجريبي «مثال» (لا يمكن شراؤه — أزل العلامة لجعله حقيقياً)")}
      </label>
      <label className="flex items-center gap-2 font-bold">
        <input
          type="checkbox"
          className="size-5"
          checked={f.active}
          onChange={(e) => set({ active: e.target.checked })}
        />{" "}
        {tr("ظاهر في المتجر")}
      </label>
      {msg ? <p className="font-bold">{trv(msg)}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn" disabled={busy} onClick={save}>
          {tr("حفظ")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          {tr("إلغاء")}
        </button>
      </div>
    </div>
  );
}

type SectionForm = Partial<StoreCategory>;

function Categories({ cats, refresh }: { cats: StoreCategory[]; refresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<SectionForm | null>(null);
  if (editing)
    return (
      <SectionEditor
        c={editing}
        cats={cats}
        onDone={async () => {
          setEditing(null);
          await refresh();
        }}
      />
    );
  const top = cats.filter((c) => !c.parentId);
  const row = (c: StoreCategory, sub = false) => (
    <li key={c.id} className={`stamp flex items-center gap-3 p-3 ${sub ? "ms-6" : ""}`}>
      <SectionCover c={c} className="size-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{trv(c.name)}</p>
        <p className="text-xs font-semibold text-muted">
          <span dir="ltr">/store/c/{trv(c.slug)}</span> · {trv(c.productCount)} {tr("منتج ·")}{" "}
          {!c.active
            ? tr("معطّل")
            : c.productCount
              ? tr("ظاهر")
              : c.showSoon
                ? tr("ظاهر «قريباً»")
                : tr("مخفي حتى تضاف منتجات")}
        </p>
      </div>
      <button
        type="button"
        className="btn btn-ghost px-3"
        aria-label={tr("تعديل {0}", c.name)}
        onClick={() => setEditing(c)}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className="btn btn-ghost px-3"
        aria-label={tr("حذف {0}", c.name)}
        onClick={async () => {
          if (!confirm(tr("حذف قسم «{0}»؟ المنتجات والأقسام الفرعية تبقى بدون قسم.", c.name))) return;
          await adminDeleteCategory({ data: { id: c.id } });
          await refresh();
        }}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
  return (
    <>
      <button
        type="button"
        className="btn mb-3 w-full"
        onClick={() =>
          setEditing({ active: true, icon: "bag", color: "#f2c94c", sort: cats.length + 1 })
        }
      >
        <Plus className="size-4" aria-hidden />
        {tr("قسم جديد")}
      </button>
      <p className="mb-3 text-sm font-semibold text-muted">
        {tr("القسم الفارغ لا يظهر للزوار حتى تضيف له منتجاً مفعّلاً، إلا إذا فعّلت «أظهره كـ قريباً». أضف الخطط (شهري، 3 أشهر، سنوي…) كمنتجات داخل القسم.")}
      </p>
      <ul className="flex flex-col gap-2">
        {top.flatMap((c) => [
          row(c),
          ...cats.filter((k) => k.parentId === c.id).map((k) => row(k, true)),
        ])}
      </ul>
    </>
  );
}

function SectionEditor({
  c,
  cats,
  onDone,
}: {
  c: SectionForm;
  cats: StoreCategory[];
  onDone: () => void;
}) {
  const [f, setF] = useState({
    id: c.id ?? "",
    name: c.name ?? "",
    slug: c.slug ?? "",
    description: c.description ?? "",
    icon: c.icon ?? "bag",
    color: c.color ?? "#f2c94c",
    imageKey: c.imageKey ?? "",
    sort: String(c.sort ?? 0),
    active: c.active ?? true,
    showSoon: c.showSoon ?? false,
    parentId: c.parentId ?? "",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (x: Partial<typeof f>) => setF((o) => ({ ...o, ...x }));
  const hasChildren = Boolean(f.id) && cats.some((k) => k.parentId === f.id);
  const preview: StoreCategory = {
    id: f.id || "new",
    name: f.name,
    slug: f.slug,
    sort: 0,
    imageKey: f.imageKey || null,
    icon: f.icon as StoreCategory["icon"],
    description: f.description,
    color: f.color,
    active: f.active,
    showSoon: f.showSoon,
    parentId: f.parentId || null,
    productCount: 0,
  };
  const field = "field mt-1";
  return (
    <div className="stamp flex flex-col gap-3 p-4">
      <h2 className="text-xl font-bold">{f.id ? tr("تعديل قسم") : tr("قسم جديد")}</h2>
      <label className="font-bold">
        {tr("الاسم")}
        <input
          className={field}
          maxLength={60}
          value={f.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>
      <label className="font-bold">
        {tr("الرابط (بالإنجليزية)")}
        <input
          className={field}
          dir="ltr"
          value={f.slug}
          placeholder="streaming"
          onChange={(e) => set({ slug: e.target.value })}
        />
      </label>
      <label className="font-bold">
        {tr("الوصف")}
        <textarea
          className={`${field} min-h-16`}
          maxLength={500}
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>
      <label className="font-bold">
        {tr("القسم الأب (اختياري)")}
        <select
          className={field}
          value={f.parentId}
          disabled={hasChildren}
          onChange={(e) => set({ parentId: e.target.value })}
        >
          <option value="">{tr("— قسم رئيسي —")}</option>
          {cats
            .filter((k) => !k.parentId && k.id !== f.id)
            .map((k) => (
              <option key={k.id} value={k.id}>
                {trv(k.name)}
              </option>
            ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <SectionCover c={preview} className="size-20 shrink-0 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <label className="btn btn-ghost px-3">
            {busy ? tr("جاري الرفع…") : tr("رفع صورة/أيقونة")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  set({ imageKey: await uploadImage(file) });
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : tr("تعذّر الرفع."));
                }
                setBusy(false);
              }}
            />
          </label>
          {f.imageKey ? (
            <button
              type="button"
              className="btn btn-ghost px-3"
              onClick={() => set({ imageKey: "" })}
            >
              {tr("إزالة الصورة")}
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-xs font-semibold text-muted">
        {tr("ارفع صورك الخاصة فقط (يُفضّل عدم استخدام شعارات تجارية دون إذن).")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="font-bold">
          {tr("الأيقونة (بدون صورة)")}
          <select
            className={field}
            value={f.icon}
            onChange={(e) => set({ icon: e.target.value as typeof f.icon })}
          >
            {Object.entries(SECTION_ICONS).map(([k, v]) => (
              <option key={k} value={k}>
                {trv(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="font-bold">
          {tr("اللون")}
          <input
            type="color"
            className="mt-1 h-12 w-full rounded-xl border border-line"
            value={f.color}
            onChange={(e) => set({ color: e.target.value })}
          />
        </label>
      </div>
      <label className="font-bold">
        {tr("الترتيب")}
        <input
          className={field}
          inputMode="numeric"
          dir="ltr"
          value={f.sort}
          onChange={(e) => set({ sort: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 font-bold">
        <input
          type="checkbox"
          className="size-5"
          checked={f.active}
          onChange={(e) => set({ active: e.target.checked })}
        />{" "}
        {tr("مفعّل")}
      </label>
      <label className="flex items-center gap-2 font-bold">
        <input
          type="checkbox"
          className="size-5"
          checked={f.showSoon}
          onChange={(e) => set({ showSoon: e.target.checked })}
        />{" "}
        {tr("أظهره كـ «قريباً» وهو فارغ")}
      </label>
      {msg ? <p className="font-bold">{trv(msg)}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await adminSaveCategory({ data: f });
            setBusy(false);
            if (!r.ok) return setMsg(r.message ?? tr("تعذّر الحفظ."));
            onDone();
          }}
        >
          {tr("حفظ")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          {tr("إلغاء")}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- orders */

type AdminOrder = Order & {
  log: { action: string; detail: string; at: string }[];
  items: (Order["items"][number] & { revoked?: boolean })[];
};
const LOG: Record<string, string> = {
  deliver: "تسليم",
  resend: "إعادة إرسال",
  revoke: "سحب",
  email: "بريد",
  short: "نقص",
  payment: "دفع مؤكَّد",
  callback: "إشعار من شركة الدفع",
};
const at = (iso: string) =>
  new Date(iso).toLocaleString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem" });

function Orders() {
  const [status, setStatus] = useState<OrderStatus | "">("pending");
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = useCallback(async () => {
    const r = await adminListOrders({ data: { status: status || undefined } });
    setOrders(r.orders as AdminOrder[]);
  }, [status]);
  useEffect(() => void refresh(), [refresh]);
  const act = async (id: string, action: string, ask?: string) => {
    if (ask && !confirm(ask)) return;
    setBusy(id);
    const r = await adminOrderAction({ data: { id, action } });
    setMsg(r.ok ? "" : (r.message ?? tr("تعذّر التنفيذ.")));
    setBusy("");
    await refresh();
  };
  return (
    <>
      <div className="scroll-row mb-3">
        {(["pending", "paid", "delivered", "cancelled", ""] as const).map((s) => (
          <button
            key={s || "all"}
            type="button"
            className={status === s ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
            onClick={() => setStatus(s)}
          >
            {s ? ORDER_STATUS[s] : tr("الكل")}
          </button>
        ))}
      </div>
      {msg ? <p className="stamp mb-3 p-3 font-bold">{trv(msg)}</p> : null}
      {!orders ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : orders.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لا طلبات هنا.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id} className="stamp p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="chip chip-ink">{trv(ORDER_STATUS[o.status])}</span>
                <span className="font-bold" dir="ltr">
                  {formatPrice(o.totalAgorot, o.currency)}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-muted">
                {o.id.slice(0, 8)} · {at(o.createdAt)} · {PROVIDERS[o.provider] ?? o.provider}
              </p>
              <p className="font-bold">
                {trv(o.userName)}{" "}
                <span className="text-sm text-muted" dir="ltr">
                  {trv(o.userEmail)}
                </span>
              </p>
              {o.note ? <p className="text-sm font-semibold">{trv(o.note)}</p> : null}
              <ul className="mt-2 flex flex-col gap-1">
                {o.items.map((i) => (
                  <li key={i.productId} className="text-sm">
                    <span className="font-bold">
                      {trv(i.name)} × {trv(i.qty)}
                    </span>
                    {i.delivery ? (
                      <span
                        className="block whitespace-pre-wrap break-all font-mono text-muted"
                        dir="auto"
                      >
                        {i.revoked ? tr("[مسحوب] ") : ""}
                        {trv(i.delivery)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {o.status === "pending" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy === o.id}
                    onClick={() =>
                      act(o.id, "paid", tr("تأكيد استلام الدفع؟ سيُسلَّم المنتج للمشتري تلقائياً."))
                    }
                  >
                    {tr("تم الدفع")}
                  </button>
                ) : null}
                {o.status === "paid" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy === o.id}
                    onClick={() => act(o.id, "deliver")}
                  >
                    {tr("إعادة محاولة التسليم")}
                  </button>
                ) : null}
                {o.status === "delivered" ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy === o.id}
                    onClick={() => act(o.id, "resend")}
                  >
                    {tr("إعادة الإرسال")}
                  </button>
                ) : null}
                {o.status === "delivered" || o.status === "paid" ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy === o.id}
                    onClick={() => act(o.id, "revoke", tr("إخفاء المحتوى عن المشتري؟"))}
                  >
                    {tr("سحب التسليم")}
                  </button>
                ) : null}
                {o.status !== "cancelled" ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy === o.id}
                    onClick={() => act(o.id, "cancelled", tr("إلغاء الطلب؟"))}
                  >
                    {tr("إلغاء")}
                  </button>
                ) : null}
              </div>
              {o.log.length ? (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer font-bold">{tr("السجل (")}{trv(o.log.length)})</summary>
                  <ul className="mt-1 flex flex-col gap-1">
                    {o.log.map((l, k) => (
                      <li key={k}>
                        <b>{LOG[l.action] ?? l.action}</b> · {at(l.at)} ·{" "}
                        <span dir="auto">{trv(l.detail)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------------------------------------------------------- payment settings */

function Secret({
  label,
  saved,
  value,
  onChange,
  cleared,
  onClear,
}: {
  label: string;
  saved: boolean;
  value: string;
  onChange: (v: string) => void;
  cleared: boolean;
  onClear: () => void;
}) {
  return (
    <label className="font-bold">
      {trv(label)}
      <span className="mt-1 flex gap-2">
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          value={value}
          placeholder={saved && !cleared ? tr("•••• محفوظ (اكتب لاستبداله)") : tr("غير محفوظ")}
          onChange={(e) => onChange(e.target.value)}
        />
        {saved && !cleared ? (
          <button type="button" className="btn btn-ghost px-3" onClick={onClear}>
            {tr("مسح")}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function PaySettings() {
  const [s, setS] = useState<AdminPaySettings | null>(null);
  const [hooks, setHooks] = useState({ cardcom: "", tranzila: "" });
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [clear, setClear] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await adminGetPaySettings();
    if (!r.authed) return setMsg(tr("هذا القسم لمالك الموقع فقط."));
    setS(r.settings);
    setHooks(r.webhooks);
    setSecrets({});
    setClear([]);
  }, []);
  useEffect(() => void load(), [load]);
  if (!s) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;
  const set = (x: Partial<AdminPaySettings>) => setS({ ...s, ...x });
  const sec = (k: string) => ({
    value: secrets[k] ?? "",
    onChange: (v: string) => setSecrets({ ...secrets, [k]: v }),
    saved: s.saved[k as keyof AdminPaySettings["saved"]],
    cleared: clear.includes(k),
    onClear: () => setClear([...clear, k]),
  });
  const save = async () => {
    setMsg("");
    const r = await adminSavePaySettings({ data: { ...s, secrets, clear } });
    setMsg(r.ok ? tr("تم الحفظ.") : (r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) await load();
  };
  const field = "field mt-1";
  return (
    <div className="flex flex-col gap-3">
      <div className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("عام")}</h2>
        <label className="font-bold">
          {tr("العملة")}
          <select
            className={field}
            value={s.currency}
            onChange={(e) => set({ currency: e.target.value as AdminPaySettings["currency"] })}
          >
            {Object.entries(CURRENCIES).map(([k, v]) => (
              <option key={k} value={k}>
                {trv(k)} {trv(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="font-bold">
          {tr("رقم واتساب (الدفع نقداً واليدوي)")}
          <input
            className={field}
            dir="ltr"
            inputMode="tel"
            value={s.whatsapp}
            placeholder="0501234567"
            onChange={(e) => set({ whatsapp: e.target.value })}
          />
        </label>
        <label className="font-bold">
          {tr("بريد التواصل")}
          <input
            className={field}
            dir="ltr"
            type="email"
            value={s.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </label>
      </div>
      <div className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("شركة الدفع")}</h2>
        <label className="font-bold">
          {tr("المزوّد")}
          <select
            className={field}
            value={s.provider}
            onChange={(e) => set({ provider: e.target.value as AdminPaySettings["provider"] })}
          >
            {Object.entries(PROVIDERS).map(([k, v]) => (
              <option key={k} value={k}>
                {trv(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            className="size-5"
            checked={s.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
          />{" "}
          {tr("تفعيل الدفع الإلكتروني")}
        </label>
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            className="size-5"
            checked={s.testMode}
            onChange={(e) => set({ testMode: e.target.checked })}
          />{" "}
          {tr("وضع تجريبي (تُعلَّم الطلبات «تجريبي»)")}
        </label>
        <p className="text-sm font-semibold text-muted">
          {tr("إن لم يكن المزوّد مفعّلاً أو بيانات الاعتماد ناقصة، يبقى الدفع يدوياً تلقائياً. لا تُعلَّم أي عملية «مدفوعة» إلا بعد تحقق الخادم من شركة الدفع أو بزر «تم الدفع».")}
        </p>
        {!s.canEncrypt ? (
          <p className="font-bold text-red-700">
            {tr("لا يوجد مفتاح تشفير على الخادم؛ لا يمكن حفظ كلمات السر.")}
          </p>
        ) : null}
        {s.env.length ? (
          <p className="text-sm font-bold">
            {tr("قيم من متغيرات البيئة (تتقدّم على هذه الحقول):")} {s.env.join(", ")}
          </p>
        ) : null}
        {s.provider === "cardcom" ? (
          <>
            <label className="font-bold">
              {tr("رقم الطرفية (TerminalNumber)")}
              <input
                className={field}
                dir="ltr"
                inputMode="numeric"
                value={s.cardcom.terminal}
                onChange={(e) => set({ cardcom: { ...s.cardcom, terminal: e.target.value } })}
              />
            </label>
            <label className="font-bold">
              {tr("اسم مستخدم الواجهة (ApiName)")}
              <input
                className={field}
                dir="ltr"
                value={s.cardcom.apiName}
                onChange={(e) => set({ cardcom: { ...s.cardcom, apiName: e.target.value } })}
              />
            </label>
            <Secret
              label={tr("كلمة سر الواجهة (ApiPassword، اختيارية)")}
              {...sec("cardcom.apiPassword")}
            />
            <Hook
              url={hooks.cardcom}
              label={tr("عنوان WebHookUrl (يُرسل تلقائياً مع كل عملية؛ يمكن وضعه أيضاً في إعدادات Cardcom)")}
            />
          </>
        ) : null}
        {s.provider === "tranzila" ? (
          <>
            <label className="font-bold">
              {tr("اسم المسوف (Supplier / Terminal)")}
              <input
                className={field}
                dir="ltr"
                value={s.tranzila.supplier}
                onChange={(e) => set({ tranzila: { ...s.tranzila, supplier: e.target.value } })}
              />
            </label>
            <Secret label="TranzilaPW" {...sec("tranzila.password")} />
            <label className="font-bold">
              API App Key
              <input
                className={field}
                dir="ltr"
                value={s.tranzila.appKey}
                onChange={(e) => set({ tranzila: { ...s.tranzila, appKey: e.target.value } })}
              />
            </label>
            <Secret label="API Secret" {...sec("tranzila.appSecret")} />
            <Hook url={hooks.tranzila} label={tr("عنوان notify_url (Tranzila)")} />
            <p className="text-sm font-bold">
              {tr("Tranzila: التأكيد التلقائي غير مفعّل بعد؛ الإشعار يُسجَّل فقط وتؤكّد أنت الدفع بزر «تم الدفع».")}
            </p>
          </>
        ) : null}
        {msg ? <p className="font-bold">{trv(msg)}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={save}>
            {tr("حفظ")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              setMsg(tr("جاري الاختبار…"));
              const r = await adminTestPayment();
              setMsg(r.message);
            }}
          >
            {tr("اختبار الاتصال")}
          </button>
        </div>
        <p className="text-xs font-semibold text-muted">
          {tr("الاختبار يستخدم القيم المحفوظة (احفظ أولاً).")}
        </p>
      </div>
    </div>
  );
}

function Hook({ url, label }: { url: string; label: string }) {
  return (
    <div className="font-bold">
      {trv(label)}
      <div className="mt-1 flex gap-2">
        <input
          className="field"
          readOnly
          dir="ltr"
          value={url}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="btn btn-ghost px-3"
          onClick={() => void navigator.clipboard?.writeText(url)}
        >
          {tr("نسخ")}
        </button>
      </div>
    </div>
  );
}
