import { useEffect, useState } from "react";
import { categoryOrder } from "@/lib/directory/types";
import { emergency as fallbackEmergency } from "@/data/content";
import { tr, trv } from "@/lib/i18n/core";
import { adminGetSiteSettings, adminSaveSiteSettings } from "@/lib/site-settings/api";
import { broadcastSiteSettingsUpdate } from "@/lib/site-settings/context";
import {
  parseDirectoryHub,
  parseEmergencyNumbers,
  type EmergencyNumber,
  type QuickLink,
  type SiteSettings,
} from "@/lib/site-settings/types";

function upsert(links: QuickLink[], row: QuickLink): QuickLink[] {
  return [...links.filter((q) => q.id !== row.id), row];
}

async function loadOwned(): Promise<SiteSettings | null> {
  const res = await adminGetSiteSettings();
  return res.authed && res.settings ? res.settings : null;
}

/** Emergency numbers the public home and /today read from `busemergcfg`. */
export function EmergencyNumbersEditor() {
  const [rows, setRows] = useState<EmergencyNumber[]>([]);
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);
  const [owned, setOwned] = useState(true);

  useEffect(() => {
    void loadOwned().then((settings) => {
      if (!settings) {
        setOwned(false);
        setReady(true);
        return;
      }
      const parsed = parseEmergencyNumbers(settings.quickLinks);
      setRows(parsed.length ? parsed : fallbackEmergency.slice(0, 8));
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  if (!owned) {
    return (
      <p className="stamp p-4 text-sm font-semibold text-muted">
        {tr("أرقام الطوارئ يعدلها مالك الموقع من هنا.")}
      </p>
    );
  }

  return (
    <form
      className="stamp flex flex-col gap-3 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setMsg("");
        const clean = rows
          .map((r) => ({ name: r.name.trim(), phone: r.phone.trim() }))
          .filter((r) => r.name && /\d/.test(r.phone))
          .slice(0, 16);
        if (!clean.length) {
          setMsg(tr("أضف رقماً واحداً على الأقل."));
          return;
        }
        const current = await loadOwned();
        if (!current) {
          setMsg(tr("هذا القسم لمالك الموقع فقط."));
          return;
        }
        const saved = await adminSaveSiteSettings({
          data: {
            ...current,
            quickLinks: upsert(current.quickLinks, {
              id: "busemergcfg",
              title: "أرقام الطوارئ",
              subtitle: clean.map((r) => r.name).join("|"),
              url: `/__em?${clean.map((r) => encodeURIComponent(r.phone)).join("|")}`,
              emoji: "",
            }),
          },
        });
        if (!saved.ok || !saved.settings) {
          setMsg(saved.message || tr("تعذّر الحفظ."));
          return;
        }
        broadcastSiteSettingsUpdate(saved.settings);
        setRows(clean);
        setMsg(tr("حُفظت أرقام الطوارئ. تظهر في الرئيسية وصفحة اليوم."));
      }}
    >
      <div>
        <h2 className="text-lg font-bold">{tr("أرقام الطوارئ")}</h2>
        <p className="text-sm font-semibold text-muted">
          {tr("الترتيب هنا هو ترتيب الظهور في الرئيسية وصفحة اليوم.")}
        </p>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_8rem_auto] gap-2">
          <input
            className="field"
            value={row.name}
            aria-label={tr("اسم الجهة")}
            onChange={(e) =>
              setRows((list) => list.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)))
            }
          />
          <input
            className="field"
            dir="ltr"
            value={row.phone}
            aria-label={tr("الرقم")}
            onChange={(e) =>
              setRows((list) => list.map((item, i) => (i === index ? { ...item, phone: e.target.value } : item)))
            }
          />
          <button
            type="button"
            className="chip"
            onClick={() => setRows((list) => list.filter((_, i) => i !== index))}
          >
            {tr("حذف")}
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="chip"
          onClick={() => setRows((list) => [...list, { name: "", phone: "" }])}
        >
          {tr("إضافة رقم")}
        </button>
        <button type="submit" className="chip chip-ink">
          {tr("حفظ الأرقام")}
        </button>
      </div>
      {msg ? <p className="text-sm font-bold">{trv(msg)}</p> : null}
    </form>
  );
}

/** Directory heading, home visibility, and hidden categories from `dirhubcfg`. */
export function DirectoryHubEditor() {
  const [title, setTitle] = useState("دليل محلات وخدمات رهط");
  const [showOnHome, setShowOnHome] = useState(true);
  const [hidden, setHidden] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);
  const [owned, setOwned] = useState(true);

  useEffect(() => {
    void loadOwned().then((settings) => {
      if (!settings) {
        setOwned(false);
        setReady(true);
        return;
      }
      const parsed = parseDirectoryHub(settings.quickLinks);
      setTitle(parsed.title);
      setShowOnHome(parsed.showOnHome);
      setHidden(parsed.hiddenCategories);
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  if (!owned) {
    return (
      <p className="stamp p-4 text-sm font-semibold text-muted">
        {tr("مظهر الدليل يضبطه مالك الموقع.")}
      </p>
    );
  }

  return (
    <form
      className="stamp mb-4 flex flex-col gap-3 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setMsg("");
        const current = await loadOwned();
        if (!current) {
          setMsg(tr("هذا القسم لمالك الموقع فقط."));
          return;
        }
        const cleanTitle = title.trim() || "دليل محلات وخدمات رهط";
        const saved = await adminSaveSiteSettings({
          data: {
            ...current,
            quickLinks: upsert(current.quickLinks, {
              id: "dirhubcfg",
              title: cleanTitle,
              subtitle: `${showOnHome ? "home:1" : "home:0"}|hide:${hidden.join(",")}`,
              url: "/__dir?",
              emoji: "",
            }),
          },
        });
        if (!saved.ok || !saved.settings) {
          setMsg(saved.message || tr("تعذّر الحفظ."));
          return;
        }
        broadcastSiteSettingsUpdate(saved.settings);
        setMsg(tr("حُفظ مظهر الدليل. الرئيسية وصفحة الدليل تستخدمانه."));
      }}
    >
      <div>
        <h2 className="text-lg font-bold">{tr("مظهر دليل المحلات والخدمات")}</h2>
        <p className="text-sm font-semibold text-muted">
          {tr("العنوان والظهور في الرئيسية والتصنيفات المخفية. المحلات نفسها تبقى طلبات الموافقة بالأسفل.")}
        </p>
      </div>
      <label className="block font-bold">
        {tr("عنوان القسم")}
        <input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 font-bold">
        <input type="checkbox" checked={showOnHome} onChange={(e) => setShowOnHome(e.target.checked)} />
        {tr("إظهار الدليل في الصفحة الرئيسية")}
      </label>
      <fieldset>
        <legend className="mb-2 font-bold">{tr("تصنيفات مخفية")}</legend>
        <div className="flex flex-wrap gap-2">
          {categoryOrder.map((cat) => {
            const on = hidden.includes(cat);
            return (
              <label key={cat} className={on ? "chip chip-ink" : "chip"}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() =>
                    setHidden((list) => (on ? list.filter((c) => c !== cat) : [...list, cat]))
                  }
                />
                {trv(cat)}
              </label>
            );
          })}
        </div>
      </fieldset>
      <button type="submit" className="chip chip-ink self-start">
        {tr("حفظ مظهر الدليل")}
      </button>
      {msg ? <p className="text-sm font-bold">{trv(msg)}</p> : null}
    </form>
  );
}
