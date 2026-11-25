import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { busSchedule } from "@/data/bus-schedule";
import { busLines } from "@/data/buses";
import { adminListBusOverrides, adminSaveBusOverride, type BusOverride } from "@/lib/buses/overrides";
import { shapeFile, type LineShapes } from "@/lib/buses/map";
import { lineInfo, stopName } from "@/lib/buses/schedule";
import { OSM_RAVKAV_POINTS } from "@/data/ravkav-points";
import { adminGetSiteSettings, adminSaveSiteSettings } from "@/lib/site-settings/api";
import type { RavKavPoint, RavKavUi, SiteSettings } from "@/lib/site-settings/types";
import { tr, trv } from "@/lib/i18n/core";

const empty = (number: string): BusOverride => ({ number, hidden: false, labelFrom: "", labelTo: "", note: "", shape: null, hiddenStops: [] });

/** «خطوط الباصات»: hide lines, rename ends, notes, hide stops and redraw a line's route. Times stay GTFS-only. */
export function BusLinesAdmin() {
  const [rows, setRows] = useState<BusOverride[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const reload = () => adminListBusOverrides().then(setRows).catch(() => setErr(tr("تعذّر التحميل.")));
  useEffect(() => void reload(), []);
  if (!rows) return <p className="stamp p-4 font-semibold">{err || tr("جاري التحميل…")}</p>;
  const get = (n: string) => rows.find((r) => r.number === n) ?? empty(n);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-muted">
        {tr("المواعيد تأتي تلقائياً كل يوم من وزارة المواصلات ولا تُعدَّل يدوياً. هنا تتحكم بالظهور والأسماء والملاحظات ومسار الخريطة.")}{" "}
        {trv(`(${new Date(busSchedule.generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Jerusalem" })})`)}
      </p>
      <RavKavAdmin />
      <NoticeEditor row={get("*")} onSaved={reload} />
      {busLines.map((l) => {
        const r = get(l.number);
        return (
          <section key={l.number} className="stamp p-3">
            <button type="button" className="flex w-full items-center gap-3 text-start" onClick={() => setOpen(open === l.number ? null : l.number)}>
              <span className="inline-grid min-w-10 place-items-center rounded-xl bg-[#FDB700] px-2 py-1 font-black">{trv(l.number)}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{trv(r.labelFrom || l.from)} ↔ {trv(r.labelTo || l.to)}</span>
              {r.hidden ? <span className="chip">{tr("مخفي")}</span> : null}
              {r.shape ? <span className="chip chip-ok">{tr("مسار معدّل")}</span> : null}
              {r.note ? <span className="chip">📢</span> : null}
            </button>
            {open === l.number ? <LineEditor key={l.number} base={l} row={r} onSaved={reload} /> : null}
          </section>
        );
      })}
    </div>
  );
}

const blankPoint = { name: "", address: "", hours: "", lat: "", lon: "" };

/** Charging points saved in site settings. The public page keeps the map point unless it is hidden. */
function RavKavAdmin() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [form, setForm] = useState(blankPoint);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminGetSiteSettings()
      .then((r) => {
        if (r.authed && r.settings) setSettings(r.settings);
        else setMsg(tr("هذا القسم لمالك الموقع فقط."));
      })
      .catch(() => setMsg(tr("تعذّر التحميل.")));
  }, []);

  const save = async (points: RavKavPoint[], ui: RavKavUi) => {
    if (!settings) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await adminSaveSiteSettings({ data: { ...settings, ravkavPoints: points, ravkavUi: ui } });
      if (res.ok && res.settings) {
        setSettings(res.settings);
        setMsg(tr("تم الحفظ — يظهر في صفحة رب-كاف خلال دقيقة."));
      } else setMsg(res.message || tr("تعذّر الحفظ."));
    } catch {
      setMsg(tr("تعذّر الحفظ."));
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <p className="stamp p-4 font-semibold">{msg || tr("جاري تحميل نقاط رب-كاف…")}</p>;
  const points = settings.ravkavPoints;
  const ui = settings.ravkavUi;
  const hidden = new Set(ui.hidden);
  const toggleHidden = (id: string) => {
    const next = hidden.has(id) ? ui.hidden.filter((x) => x !== id) : [...ui.hidden, id];
    void save(points, { ...ui, hidden: next });
  };
  const add = () => {
    const lat = Number(form.lat.replace(",", "."));
    const lon = Number(form.lon.replace(",", "."));
    const name = form.name.trim();
    if (name.length < 2) return setMsg(tr("اكتب اسم النقطة."));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 29.4 || lat > 33.5 || lon < 34.2 || lon > 35.95) {
      return setMsg(tr("خط العرض وخط الطول يجب أن يكونا داخل إسرائيل. مثال رهط: 31.392 و 34.755."));
    }
    const id = `rk${Math.random().toString(36).slice(2, 10)}`;
    setForm(blankPoint);
    void save(
      [...points, { id, name, address: form.address.trim(), hours: form.hours.trim(), lat, lon }],
      ui,
    );
  };

  return (
    <section className="stamp p-3">
      <h2 className="font-bold">{tr("نقاط شحن رب-كاف")}</h2>
      <p className="mt-1 text-sm font-semibold text-muted">
        {tr("النقاط التي تضيفها هنا تُحفظ وتظهر في صفحة رب-كاف مع نقطة محطة القطار من الخريطة العامة.")}
      </p>
      <label className="mt-3 flex items-center justify-between gap-3 font-bold">
        {tr("إظهار نقاط الشحن في الصفحة")}
        <input
          type="checkbox"
          role="switch"
          className="size-6 accent-[#FDB700]"
          checked={ui.points}
          disabled={busy}
          onChange={(e) => void save(points, { ...ui, points: e.target.checked })}
        />
      </label>

      <ul className="mt-3 flex flex-col gap-2">
        {OSM_RAVKAV_POINTS.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 rounded-2xl bg-surface p-3">
            <span className="min-w-0">
              <span className="block font-bold">{trv(p.name)}</span>
              <span className="text-xs font-semibold text-muted">{tr("نقطة الخريطة العامة — تبقى إن لم تُخفَ")}</span>
            </span>
            <button type="button" className="chip shrink-0" disabled={busy} onClick={() => toggleHidden(p.id)}>
              {hidden.has(p.id) ? tr("إظهار") : tr("إخفاء")}
            </button>
          </li>
        ))}
        {points.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 rounded-2xl bg-surface p-3">
            <span className="min-w-0">
              <span className="block font-bold">{trv(p.name)}</span>
              <span className="text-xs font-semibold text-muted">
                {trv(p.address)} {p.hours ? `· ${trv(p.hours)}` : ""} · {p.lat}, {p.lon}
              </span>
            </span>
            <span className="flex shrink-0 gap-1">
              <button type="button" className="chip" disabled={busy} onClick={() => toggleHidden(p.id)}>
                {hidden.has(p.id) ? tr("إظهار") : tr("إخفاء")}
              </button>
              <button
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => void save(points.filter((x) => x.id !== p.id), { ...ui, hidden: ui.hidden.filter((id) => id !== p.id) })}
              >
                {tr("حذف")}
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-sm font-bold sm:col-span-2">
          {tr("اسم النقطة")}
          <input className="field mt-1" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="text-sm font-bold">
          {tr("العنوان")}
          <input className="field mt-1" value={form.address} maxLength={160} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <label className="text-sm font-bold">
          {tr("ساعات العمل")}
          <input className="field mt-1" value={form.hours} maxLength={80} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        </label>
        <label className="text-sm font-bold">
          {tr("خط العرض")}
          <input className="field mt-1" dir="ltr" inputMode="decimal" placeholder="31.392" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
        </label>
        <label className="text-sm font-bold">
          {tr("خط الطول")}
          <input className="field mt-1" dir="ltr" inputMode="decimal" placeholder="34.755" value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} />
        </label>
      </div>
      <button type="button" className="btn mt-3" disabled={busy} onClick={add}>{tr("إضافة نقطة الشحن")}</button>
      {msg ? <p className="mt-2 text-sm font-semibold">{msg}</p> : null}
    </section>
  );
}

function NoticeEditor({ row, onSaved }: { row: BusOverride; onSaved: () => void }) {
  const [note, setNote] = useState(row.note);
  const [msg, setMsg] = useState("");
  return (
    <section className="stamp p-3">
      <label className="block text-sm font-bold">{tr("إعلان عام أعلى صفحة الباصات (اتركه فارغاً لإخفائه)")}</label>
      <div className="mt-1 flex gap-2">
        <input className="field flex-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        <button type="button" className="btn px-3" onClick={async () => { await adminSaveBusOverride({ data: { ...row, note } }); setMsg(tr("تم الحفظ")); onSaved(); }}>{tr("حفظ")}</button>
      </div>
      {msg ? <p className="mt-1 text-sm font-semibold">{msg}</p> : null}
    </section>
  );
}

function LineEditor({ base, row, onSaved }: { base: (typeof busLines)[number]; row: BusOverride; onSaved: () => void }) {
  const info = lineInfo(base.number);
  const [f, setF] = useState<BusOverride>(row);
  const [dir, setDir] = useState(info?.dirs[0]?.dir ?? "1");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const d = info?.dirs.find((x) => x.dir === dir);
  const save = async (next = f) => {
    setBusy(true);
    try {
      await adminSaveBusOverride({ data: next });
      setMsg(tr("تم الحفظ — يظهر في الموقع خلال دقيقة."));
      onSaved();
    } catch {
      setMsg(tr("تعذّر الحفظ."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
      <label className="flex items-center justify-between font-bold">
        {tr("إخفاء هذا الخط من الموقع")}
        <input type="checkbox" role="switch" className="size-6 accent-[#FDB700]" checked={f.hidden} onChange={(e) => setF({ ...f, hidden: e.target.checked })} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm font-bold">{tr("اسم البداية")}<input className="field mt-1" placeholder={base.from} value={f.labelFrom} onChange={(e) => setF({ ...f, labelFrom: e.target.value })} /></label>
        <label className="text-sm font-bold">{tr("اسم النهاية")}<input className="field mt-1" placeholder={base.to} value={f.labelTo} onChange={(e) => setF({ ...f, labelTo: e.target.value })} /></label>
      </div>
      <label className="text-sm font-bold">{tr("ملاحظة للركاب (تغيير مسار، أعمال طرق…)")}<textarea className="field mt-1" rows={2} maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>

      {info && info.dirs.length > 1 ? (
        <div className="scroll-row">
          {info.dirs.map((x) => (
            <button key={x.dir} type="button" className={x.dir === dir ? "chip chip-ink shrink-0" : "chip shrink-0"} onClick={() => setDir(x.dir)}>
              {tr("إلى")} {stopName(x.to)}
            </button>
          ))}
        </div>
      ) : null}
      {d ? (
        <>
          <RouteEditor
            line={base.number}
            dir={dir}
            stops={d.stops.map(([c]) => c)}
            hiddenStops={f.hiddenStops}
            value={f.shape?.[dir] ?? null}
            onChange={(pts) => {
              const shape = { ...(f.shape ?? {}) };
              if (pts) shape[dir] = pts;
              else delete shape[dir];
              setF({ ...f, shape: Object.keys(shape).length ? shape : null });
            }}
          />
          <details>
            <summary className="cursor-pointer text-sm font-bold">{tr("إخفاء محطات من الخريطة")} ({f.hiddenStops.length})</summary>
            <ul className="mt-2 grid max-h-60 gap-1 overflow-auto sm:grid-cols-2">
              {d.stops.map(([c]) => (
                <li key={c}>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={!f.hiddenStops.includes(c)}
                      onChange={(e) => setF({ ...f, hiddenStops: e.target.checked ? f.hiddenStops.filter((x) => x !== c) : [...f.hiddenStops, c] })}
                    />
                    {stopName(c)} · {trv(c)}
                  </label>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn px-4" disabled={busy} onClick={() => void save()}>{tr("حفظ")}</button>
        <button type="button" className="btn btn-ghost px-3" disabled={busy} onClick={() => { const n = { ...row, ...empty(base.number) }; setF(n); void save(n); }}>{tr("إرجاع كل شيء للأصل")}</button>
        {msg ? <span className="text-sm font-semibold">{msg}</span> : null}
      </div>
    </div>
  );
}

/** Leaflet editor: the GTFS route in grey, the admin route in yellow. Tap to add points. */
function RouteEditor({ line, dir, stops, hiddenStops, value, onChange }: {
  line: string; dir: string; stops: string[]; hiddenStops: string[];
  value: [number, number][] | null; onChange: (pts: [number, number][] | null) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const Lr = useRef<typeof import("leaflet") | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [gtfs, setGtfs] = useState<[number, number][] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const pts = useRef<[number, number][] | null>(value);
  pts.current = value;
  const drawingRef = useRef(drawing);
  drawingRef.current = drawing;

  useEffect(() => {
    let off = false;
    void import("leaflet").then((mod) => {
      if (off || !el.current || map.current) return;
      const L = (mod as unknown as { default?: typeof mod }).default ?? mod;
      Lr.current = L;
      const m = L.map(el.current).setView([31.393, 34.756], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      m.on("click", (e) => {
        if (!drawingRef.current) return;
        onChangeRef.current([...(pts.current ?? []), [Math.round(e.latlng.lat * 1e5) / 1e5, Math.round(e.latlng.lng * 1e5) / 1e5]]);
      });
      map.current = m;
      setTick((t) => t + 1);
    });
    return () => { off = true; map.current?.remove(); map.current = null; };
  }, []);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setGtfs(null);
    void fetch(`/data/bus-shapes/${shapeFile(line)}.json`).then((r) => (r.ok ? (r.json() as Promise<LineShapes>) : null)).catch(() => null).then((s) => setGtfs(s?.dirs[dir] ?? null));
  }, [line, dir]);

  useEffect(() => {
    const L = Lr.current, g = layer.current, m = map.current;
    if (!L || !g || !m) return;
    g.clearLayers();
    const stopPts = stops.map((c) => ({ c, s: busSchedule.stops[c] })).filter((x) => x.s);
    const base = gtfs ?? stopPts.map((x) => [x.s.lat, x.s.lon] as [number, number]);
    const gl = L.polyline(base, { color: "#607D8B", weight: 4, opacity: value ? 0.4 : 0.85, dashArray: value ? "6 6" : undefined }).addTo(g);
    if (value) L.polyline(value, { color: "#F59E0B", weight: 6 }).addTo(g);
    for (const p of value ?? []) L.circleMarker(p, { radius: 3, color: "#B45309" }).addTo(g);
    for (const x of stopPts)
      L.circleMarker([x.s.lat, x.s.lon], { radius: 5, color: "#263238", fillColor: hiddenStops.includes(x.c) ? "#ccc" : "#fff", fillOpacity: 1, weight: 2 })
        .bindTooltip(stopName(x.c)).addTo(g);
    if (!drawing && base.length > 1) m.fitBounds(gl.getBounds(), { padding: [16, 16] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gtfs, value, hiddenStops, stops, tick]);

  return (
    <div>
      <div ref={el} className="h-72 w-full overflow-hidden rounded-xl border border-line" style={{ cursor: drawing ? "crosshair" : undefined }} />
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <button type="button" className={drawing ? "btn px-3 py-1.5" : "btn btn-ghost px-3 py-1.5"} onClick={() => setDrawing(!drawing)}>
          {drawing ? tr("إيقاف الرسم") : tr("رسم مسار جديد (انقر على الخريطة)")}
        </button>
        {gtfs ? <button type="button" className="btn btn-ghost px-3 py-1.5" onClick={() => onChange(gtfs.filter((_, i) => i % 3 === 0 || i === gtfs.length - 1))}>{tr("ابدأ من مسار الوزارة")}</button> : null}
        <button type="button" className="btn btn-ghost px-3 py-1.5" disabled={!value?.length} onClick={() => onChange(value && value.length > 1 ? value.slice(0, -1) : null)}>{tr("تراجع نقطة")}</button>
        <button type="button" className="btn btn-ghost px-3 py-1.5" disabled={!value} onClick={() => onChange(null)}>{tr("استخدم مسار الوزارة")}</button>
      </div>
      <p className="mt-1 text-xs font-semibold text-muted">{tr("الرمادي: مسار وزارة المواصلات. الأصفر: مسارك المعدّل (يُعرض بدلاً منه بعد الحفظ).")}</p>
    </div>
  );
}
