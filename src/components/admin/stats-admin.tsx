import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminGetGaSettings,
  adminSaveGaSettings,
  adminStats,
  adminTestGa,
  type StatsResult,
} from "@/lib/analytics/api";
import { formatPrice } from "@/lib/store/types";

const PRESETS = [
  { key: "today", label: "اليوم", start: "today" },
  { key: "7", label: "7 أيام", start: "6daysAgo" },
  { key: "28", label: "28 يوماً", start: "27daysAgo" },
  { key: "90", label: "90 يوماً", start: "89daysAgo" },
] as const;

const num = (n: number) => n.toLocaleString("ar-u-nu-latn");

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="stamp p-4">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${alert ? "bg-red-50" : "bg-surface"}`}>
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="text-2xl font-bold" dir="ltr">
        {value}
      </p>
      {hint ? <p className="text-xs font-semibold text-muted">{hint}</p> : null}
    </div>
  );
}

function Bars({ rows }: { rows: { name: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="font-semibold text-muted">لا بيانات بعد.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="flex justify-between gap-2 text-sm font-bold">
            <span className="min-w-0 truncate" dir="auto" title={r.sub ?? r.name}>
              {r.name}
            </span>
            <span dir="ltr">{num(r.value)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** «الإحصائيات»: owner + مشرف. GA4 (Data API) + our own database counts. */
export function StatsAdmin() {
  const [preset, setPreset] = useState<string>("28");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [data, setData] = useState<StatsResult | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (start: string, end: string) => {
    setBusy(true);
    try {
      setData(await adminStats({ data: { start, end } }));
    } finally {
      setBusy(false);
    }
  }, []);
  const range = () => {
    if (preset === "custom" && custom.start && custom.end)
      return [custom.start, custom.end] as const;
    return [PRESETS.find((p) => p.key === preset)?.start ?? "27daysAgo", "today"] as const;
  };
  useEffect(() => {
    if (preset !== "custom") void load(PRESETS.find((p) => p.key === preset)!.start, "today");
  }, [preset, load]);

  if (!data) return <p className="stamp p-4 font-semibold">جاري التحميل…</p>;
  if (!data.authed) return <p className="stamp p-4 font-bold">انتهت الجلسة.</p>;
  const ga = data.ga;
  const s = data.internal;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={preset === p.key ? "chip chip-ink" : "chip bg-paper"}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={preset === "custom" ? "chip chip-ink" : "chip bg-paper"}
          onClick={() => setPreset("custom")}
        >
          مخصّص
        </button>
        <button
          type="button"
          className="btn btn-ghost ms-auto px-3"
          aria-label="تحديث"
          disabled={busy}
          onClick={() => void load(...range())}
        >
          <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
        </button>
      </div>
      {preset === "custom" ? (
        <div className="stamp grid grid-cols-2 gap-2 p-3">
          <label className="font-bold">
            من
            <input
              type="date"
              className="field mt-1"
              value={custom.start}
              onChange={(e) => setCustom({ ...custom, start: e.target.value })}
            />
          </label>
          <label className="font-bold">
            إلى
            <input
              type="date"
              className="field mt-1"
              value={custom.end}
              onChange={(e) => setCustom({ ...custom, end: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="btn col-span-2"
            disabled={!custom.start || !custom.end || busy}
            onClick={() => void load(custom.start, custom.end)}
          >
            عرض
          </button>
        </div>
      ) : null}

      {!data.gaConfigured ? (
        <GaSetupSteps />
      ) : data.gaError ? (
        <p className="stamp p-4 font-bold text-red-700">{data.gaError}</p>
      ) : ga ? (
        <>
          <Card title="الآن">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="زوار نشطون الآن (آخر 30 دقيقة)" value={num(ga.realtime.active)} />
              <div className="rounded-xl bg-surface p-3">
                <p className="mb-1 text-xs font-bold text-muted">الصفحات النشطة</p>
                {ga.realtime.pages.slice(0, 4).map((p, i) => (
                  <p key={i} className="truncate text-sm font-semibold" dir="auto">
                    {p.name} · {p.users}
                  </p>
                ))}
              </div>
            </div>
          </Card>
          <Card title="ملخّص سريع">
            <div className="grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["اليوم", ga.quick.today],
                  ["7 أيام", ga.quick.d7],
                  ["30 يوماً", ga.quick.d30],
                ] as const
              ).map(([l, q]) => (
                <div key={l} className="rounded-xl bg-surface p-2">
                  <p className="text-xs font-bold text-muted">{l}</p>
                  <p className="text-lg font-bold" dir="ltr">
                    {num(q.users)}
                  </p>
                  <p className="text-[11px] font-semibold text-muted">
                    مستخدم · {num(q.sessions)} جلسة · {num(q.views)} مشاهدة
                  </p>
                </div>
              ))}
            </div>
          </Card>
          <Card title="الفترة المختارة">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="المستخدمون"
                value={num(ga.totals.users)}
                hint={`${num(ga.totals.newUsers)} جديد`}
              />
              <Stat label="الجلسات" value={num(ga.totals.sessions)} />
              <Stat label="مشاهدات الصفحات" value={num(ga.totals.views)} />
              <Stat
                label="متوسط التفاعل"
                value={`${Math.round(ga.totals.engagementSec / Math.max(1, ga.totals.users))}s`}
                hint="لكل مستخدم"
              />
            </div>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ga.series} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="مستخدمون"
                    stroke="#b45309"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    name="جلسات"
                    stroke="#263238"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="مشاهدات"
                    stroke="#f2c94c"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="الصفحات الأكثر مشاهدة">
            <Bars
              rows={ga.pages.map((p) => ({ name: p.title || p.path, sub: p.path, value: p.views }))}
            />
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="مصادر الزيارات">
              <Bars rows={ga.sources.map((r) => ({ name: r.source, value: r.sessions }))} />
            </Card>
            <Card title="القنوات">
              <Bars rows={ga.channels.map((r) => ({ name: r.name, value: r.sessions }))} />
            </Card>
            <Card title="الدول">
              <Bars rows={ga.countries.map((r) => ({ name: r.name, value: r.users }))} />
            </Card>
            <Card title="المدن">
              <Bars rows={ga.cities.map((r) => ({ name: r.name, value: r.users }))} />
            </Card>
            <Card title="الأجهزة">
              <Bars rows={ga.devices.map((r) => ({ name: r.name, value: r.users }))} />
            </Card>
            <Card title="جدد مقابل عائدين">
              <Bars rows={ga.newVsReturning.map((r) => ({ name: r.name, value: r.users }))} />
            </Card>
          </div>
          <p className="text-xs font-semibold text-muted">
            المصدر: Google Analytics 4 · تُحدَّث كل 5 دقائق تقريباً (آخر جلب:{" "}
            {new Date(ga.fetchedAt).toLocaleTimeString("ar-u-nu-latn", {
              timeZone: "Asia/Jerusalem",
            })}
            )
          </p>
        </>
      ) : null}

      <GscSection data={data} />

      {s ? (
        <>
          <Card title="بحاجة لمراجعة">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Stat
                label="أخبار القراء"
                value={num(s.pending.readerNews)}
                alert={s.pending.readerNews > 0}
              />
              <Stat label="إعلانات" value={num(s.pending.ads)} alert={s.pending.ads > 0} />
              <Stat
                label="طلبات الدليل"
                value={num(s.pending.businesses)}
                alert={s.pending.businesses > 0}
              />
              <Stat
                label="تعليقات"
                value={num(s.pending.comments)}
                alert={s.pending.comments > 0}
              />
              <Stat label="بلاغات" value={num(s.pending.reports)} alert={s.pending.reports > 0} />
            </div>
          </Card>
          <Card title="المحتوى والأعضاء">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="الأعضاء"
                value={num(s.members)}
                hint={`+${num(s.newMembers7d)} هذا الأسبوع`}
              />
              <Stat label="فريق الإدارة" value={num(s.team)} />
              <Stat label="أخبار الفريق" value={num(s.staffNews)} />
              <Stat label="أخبار القراء المنشورة" value={num(s.readerNews)} />
              <Stat label="إعلانات منشورة" value={num(s.ads)} />
              <Stat label="أنشطة في الدليل" value={num(s.businesses)} />
              <Stat label="تعليقات" value={num(s.comments)} />
              <Stat label="مشتركو الإشعارات" value={num(s.pushSubscribers)} />
            </div>
          </Card>
          <Card title="المتجر">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="منتجات حقيقية مفعّلة"
                value={num(s.store.products)}
                hint={`${num(s.store.samples)} مثال`}
              />
              <Stat
                label="طلبات بانتظار الدفع"
                value={num(s.store.orders.pending ?? 0)}
                alert={(s.store.orders.pending ?? 0) > 0}
              />
              <Stat
                label="طلبات مدفوعة/مسلّمة"
                value={num((s.store.orders.paid ?? 0) + (s.store.orders.delivered ?? 0))}
                hint={`${num(s.store.orders7d)} طلب هذا الأسبوع`}
              />
              <Stat label="الإيرادات المؤكدة" value={formatPrice(s.store.revenueAgorot)} />
            </div>
          </Card>
        </>
      ) : null}
      {data.isOwner ? <GaSettings onSaved={() => void load(...range())} /> : null}
    </div>
  );
}

function GaSetupSteps() {
  return (
    <Card title="ربط Google Analytics بلوحة الإدارة">
      <p className="mb-2 font-semibold">
        لعرض الزيارات هنا، يحتاج مالك الموقع إلى ربط حساب خدمة من Google Cloud مرة واحدة:
      </p>
      <ol className="list-decimal space-y-2 ps-5 text-sm font-semibold">
        <li>افتح console.cloud.google.com وأنشئ مشروعاً (أو اختر مشروعاً موجوداً).</li>
        <li>
          من «APIs & Services» ← «Library» ابحث عن <b dir="ltr">Google Analytics Data API</b> واضغط
          «Enable».
        </li>
        <li>
          من «IAM & Admin» ← «Service Accounts» اضغط «Create service account»، اكتب اسماً مثل
          rahatpost-stats ثم «Done» (بدون أدوار).
        </li>
        <li>
          افتح حساب الخدمة ← تبويب «Keys» ← «Add key» ← «Create new key» ← اختر JSON. سيُنزَّل ملف؛
          احتفظ به سراً.
        </li>
        <li>انسخ بريد حساب الخدمة (ينتهي بـ iam.gserviceaccount.com).</li>
        <li>
          في Google Analytics: «الإدارة» (Admin ⚙️) ← «إدارة الوصول إلى الموقع» (Property access
          management) ← «+» ← أضف البريد بدور «مُشاهد» (Viewer) وأزل علامة إرسال الإشعار.
        </li>
        <li>
          في GA: «الإدارة» ← «تفاصيل الموقع» (Property details): انسخ «معرّف الموقع» (Property ID،
          أرقام فقط — ليس G-…).
        </li>
        <li>في الأسفل (للمالك): الصق معرّف الموقع ومحتوى ملف JSON، احفظ ثم «اختبار الاتصال».</li>
      </ol>
      <p className="mt-2 text-xs font-semibold text-muted">
        يُحفظ مفتاح JSON مشفّراً ولا يُعرض مرة أخرى. صلاحية «مُشاهد» للقراءة فقط.
      </p>
    </Card>
  );
}

function GaSettings({ onSaved }: { onSaved: () => void }) {
  const [v, setV] = useState<{
    propertyId: string;
    saSaved: boolean;
    saEmail: string;
    canEncrypt: boolean;
    gscSite: string;
  } | null>(null);
  const [pid, setPid] = useState("");
  const [site, setSite] = useState("");
  const [json, setJson] = useState("");
  const [msg, setMsg] = useState("");
  const refresh = useCallback(async () => {
    const r = await adminGetGaSettings();
    if (r.authed) {
      setV(r);
      setPid(r.propertyId);
      setSite(r.gscSite);
      setJson("");
    }
  }, []);
  useEffect(() => void refresh(), [refresh]);
  if (!v) return null;
  const save = async (clearSa = false) => {
    const r = await adminSaveGaSettings({
      data: { propertyId: pid, saJson: json, clearSa, gscSite: site },
    });
    setMsg(r.message);
    if (r.ok) {
      await refresh();
      onSaved();
    }
  };
  return (
    <Card title="إعدادات Google Analytics (للمالك)">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-muted">
          معرّف القياس على الموقع: <b dir="ltr">G-2B1R786GM0</b> · مُعرّف مصدر البيانات:{" "}
          <b dir="ltr">16149603850</b>
        </p>
        <label className="font-bold">
          معرّف الموقع (Property ID)
          <input
            className="field mt-1"
            dir="ltr"
            inputMode="numeric"
            placeholder="123456789"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
          />
        </label>
        <label className="font-bold">
          موقع Search Console
          <input
            className="field mt-1"
            dir="ltr"
            placeholder="https://rahatpost.com/"
            value={site}
            onChange={(e) => setSite(e.target.value)}
          />
        </label>
        <label className="font-bold">
          مفتاح حساب الخدمة (محتوى ملف JSON)
          <textarea
            className="field mt-1 min-h-28 font-mono text-xs"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              v.saSaved
                ? `•••• محفوظ${v.saEmail ? ` (${v.saEmail})` : ""} — الصق ملفاً جديداً لاستبداله`
                : '{"type": "service_account", ...}'
            }
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
        </label>
        {!v.canEncrypt ? (
          <p className="font-bold text-red-700">لا يوجد مفتاح تشفير على الخادم.</p>
        ) : null}
        {msg ? <p className="font-bold">{msg}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={() => void save()}>
            حفظ
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              setMsg("جاري الاختبار…");
              setMsg((await adminTestGa()).message);
            }}
          >
            اختبار الاتصال
          </button>
        </div>
        {v.saSaved ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => confirm("حذف مفتاح حساب الخدمة؟") && void save(true)}
          >
            حذف المفتاح المحفوظ
          </button>
        ) : null}
      </div>
    </Card>
  );
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function GscTable({
  rows,
  label,
}: {
  rows: { key: string; clicks: number; impressions: number; ctr: number; position: number }[];
  label: string;
}) {
  if (!rows.length) return <p className="font-semibold text-muted">لا بيانات بعد.</p>;
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[22rem] text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="py-1 text-start">{label}</th>
            <th className="px-1">نقرات</th>
            <th className="px-1">ظهور</th>
            <th className="px-1">CTR</th>
            <th className="px-1">الترتيب</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line font-semibold">
              <td className="max-w-[12rem] truncate py-1.5" dir="auto" title={r.key}>
                {r.key}
              </td>
              <td className="px-1 text-center" dir="ltr">
                {num(r.clicks)}
              </td>
              <td className="px-1 text-center" dir="ltr">
                {num(r.impressions)}
              </td>
              <td className="px-1 text-center" dir="ltr">
                {pct(r.ctr)}
              </td>
              <td className="px-1 text-center" dir="ltr">
                {r.position.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DEVICE: Record<string, string> = { MOBILE: "هاتف", DESKTOP: "كمبيوتر", TABLET: "جهاز لوحي" };

/** Google Search Console (same service account, cached ~1h on the server). */
function GscSection({ data }: { data: StatsResult }) {
  const g = data.gsc;
  if (data.gscError)
    return (
      <Card title="بحث Google (Search Console)">
        <p className="font-bold text-red-700" dir="auto">
          {data.gscError}
        </p>
        <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm font-semibold">
          <li>
            فعّل «Google Search Console API»:{" "}
            <a
              className="break-all underline"
              dir="ltr"
              target="_blank"
              rel="noopener noreferrer"
              href="https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=195064417132"
            >
              console.developers.google.com/…/searchconsole
            </a>
          </li>
          <li>
            في Search Console ← «الإعدادات» ← «المستخدمون والأذونات» ← «إضافة مستخدم»: أضف{" "}
            <b dir="ltr">rahatpost-stats@rahatpost.iam.gserviceaccount.com</b> بإذن «مقيّد».
          </li>
          <li>انتظر بضع دقائق ثم اضغط زر التحديث.</li>
        </ol>
      </Card>
    );
  if (!g)
    return (
      <Card title="بحث Google (Search Console)">
        <p className="font-semibold text-muted">
          أضف مفتاح حساب الخدمة في إعدادات Google Analytics أدناه لعرض بيانات البحث.
        </p>
      </Card>
    );
  return (
    <>
      <Card title="بحث Google (Search Console)">
        <p className="mb-2 text-xs font-semibold text-muted" dir="ltr">
          {g.site} · {g.range.start} → {g.range.end}
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="النقرات" value={num(g.totals.clicks)} />
          <Stat label="مرات الظهور" value={num(g.totals.impressions)} />
          <Stat label="نسبة النقر CTR" value={pct(g.totals.ctr)} />
          <Stat
            label="متوسط الترتيب"
            value={g.totals.position ? g.totals.position.toFixed(1) : "—"}
          />
        </div>
        {g.series.length ? (
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={g.series} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="نقرات"
                  stroke="#b45309"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  name="ظهور"
                  stroke="#263238"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="font-semibold text-muted">
            لا بيانات بحث بعد. تظهر عادةً بعد يومين إلى ثلاثة من التحقق من الموقع.
          </p>
        )}
      </Card>
      <Card title="أكثر عبارات البحث">
        <GscTable rows={g.queries} label="العبارة" />
      </Card>
      <Card title="الصفحات في نتائج البحث">
        <GscTable rows={g.pages} label="الصفحة" />
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="الدول (بحث)">
          <GscTable
            rows={g.countries.map((r) => ({ ...r, key: r.key.toUpperCase() }))}
            label="الدولة"
          />
        </Card>
        <Card title="الأجهزة (بحث)">
          <GscTable
            rows={g.devices.map((r) => ({ ...r, key: DEVICE[r.key] ?? r.key }))}
            label="الجهاز"
          />
        </Card>
      </div>
      <Card title="خرائط الموقع (Sitemaps)">
        {g.sitemaps.length ? (
          <ul className="flex flex-col gap-2 text-sm font-semibold">
            {g.sitemaps.map((m) => (
              <li key={m.path} className="rounded-xl bg-surface p-3">
                <p className="break-all font-bold" dir="ltr">
                  {m.path}
                </p>
                <p>
                  {m.pending ? "قيد المعالجة · " : ""}روابط مُرسلة: {num(m.submitted)} · أخطاء:{" "}
                  {num(m.errors)} · تحذيرات: {num(m.warnings)}
                </p>
                <p className="text-xs text-muted">
                  آخر إرسال:{" "}
                  {m.lastSubmitted
                    ? new Date(m.lastSubmitted).toLocaleString("ar-u-nu-latn", {
                        timeZone: "Asia/Jerusalem",
                      })
                    : "—"}{" "}
                  · آخر قراءة من Google:{" "}
                  {m.lastDownloaded
                    ? new Date(m.lastDownloaded).toLocaleString("ar-u-nu-latn", {
                        timeZone: "Asia/Jerusalem",
                      })
                    : "—"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-semibold text-muted">
            لم تُرسل خريطة موقع بعد. أرسل https://rahatpost.com/sitemap.xml من Search Console ←
            «خرائط الموقع».
          </p>
        )}
      </Card>
      <p className="text-xs font-semibold text-muted">
        المصدر: Google Search Console · تُحدَّث كل ساعة تقريباً (آخر جلب:{" "}
        {new Date(g.fetchedAt).toLocaleTimeString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem" })})
      </p>
    </>
  );
}
