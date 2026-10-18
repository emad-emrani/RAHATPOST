import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CreditCard, ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { Shell } from "@/components/shell";
import { gmapsPlace } from "@/lib/buses/map";
import { useSiteSettings } from "@/lib/site-settings/context";
import type { RavKavPoint } from "@/lib/site-settings/types";
import { OSM_RAVKAV_POINTS } from "@/data/ravkav-points";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";

export const Route = createFileRoute("/buses_/ravkav")({
  head: () =>
    seo({
      title: tr("رب-كاف في رهط: الشحن والخدمات الرسمية · رهط بوست"),
      description: tr("روابط خدمات رب-كاف الرسمية بالعربية: الشحن أونلاين، طلب بطاقة شخصية، ملفات التخفيض، استبدال البطاقة، ونقاط الشحن القريبة من رهط."),
      path: "/buses/ravkav",
      jsonLd: [breadcrumbLd([{ name: tr("باصات رهط"), path: "/buses" }, { name: tr("رب-كاف"), path: "/buses/ravkav" }])],
    }),
  component: RavKavPage,
});

/** Official services only (MOT-authorised Rav-Kav Online, the National Public Transport Authority, «על הקו» centres). */
const SERVICES = [
  { title: "شحن رب-كاف أونلاين (التطبيق الرسمي)", desc: "اشحن بطاقتك من الهاتف (NFC) أو الكمبيوتر، وافحص الرصيد والعقود الموجودة على البطاقة.", url: "https://ravkavonline.co.il/ar/" },
  { title: "طلب بطاقة رب-كاف شخصية بالبريد", desc: "بطاقة جديدة أو بديلة مع صورتك، تصلك إلى البيت. البطاقة الشخصية الأولى مجانية.", url: "https://ravkavonline.co.il/he/ravkav-issue-request/order-ravkav-online" },
  { title: "ملفات التخفيض (طلاب، شباب، كبار السن، تأمين وطني، ذوو إعاقة)", desc: "قدّم طلب ملف التخفيض أونلاين بدون الوصول إلى مكتب خدمة.", url: "https://ravkavonline.co.il/he/ravkav-profile-loading/loading-special-profiles-online" },
  { title: "أسئلة شائعة: الرصيد، الشحن المؤجّل، أنواع العقود", desc: "كيف تفحص الرصيد، وكيف تشتري عقداً لشخص آخر ويشحنه لاحقاً.", url: "https://ravkavonline.co.il/he/faq" },
  { title: "مراكز خدمة «على الخط» — استبدال بطاقة مفقودة", desc: "إصدار واستبدال البطاقة الشخصية؛ العقود والرصيد محميّة عند الفقدان.", url: "https://alhakav.mot.gov.il" },
  { title: "أنواع البطاقات والأسعار — سلطة المواصلات العامة", desc: "الفرق بين البطاقة الشخصية والمجهولة، وطرق الدفع وطرق الشحن.", url: "https://www.pti.org.il/datasites/ravkav/cards.html" },
  { title: "HopOn — إصدار وشحن بديل معتمد", desc: "تطبيق معتمد آخر لإصدار البطاقة والدفع في المواصلات العامة.", url: "https://hopon.co.il" },
];

function RavKavPage() {
  const st = useSiteSettings();
  const admin = st.ravkavPoints ?? [];
  const ui = st.ravkavUi ?? { button: true, points: true, hidden: [] };
  const points: RavKavPoint[] = [...admin, ...OSM_RAVKAV_POINTS.filter((o) => !admin.some((a) => Math.abs(a.lat - o.lat) < 1e-4 && Math.abs(a.lon - o.lon) < 1e-4))].filter((p) => !ui.hidden.includes(p.id));
  return (
    <Shell>
      <Link to="/buses" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowRight className="size-4" aria-hidden />
        {tr("باصات رهط")}
      </Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
        <CreditCard className="size-6" aria-hidden />
        {tr("رب-كاف")}
      </h1>
      <p className="mt-1 font-semibold text-muted">{tr("كل خدمات بطاقة المواصلات من المواقع الرسمية فقط.")}</p>

      {ui.points ? (
        <>
      <h2 className="mt-5 text-xl font-bold">{tr("نقاط الشحن قرب رهط")}</h2>
      {points.length ? (
        <>
          <PointsMap points={points} />
          <ul className="mt-3 flex flex-col gap-2">
            {points.map((p) => (
              <li key={p.id} className="stamp flex items-start gap-3 p-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-[#B45309]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{trv(p.name)}</p>
                  {p.address ? <p className="text-sm font-semibold text-muted">{trv(p.address)}</p> : null}
                  {p.hours ? <p className="text-sm font-semibold">{trv(p.hours)}</p> : null}
                </div>
                <a className="btn btn-ghost shrink-0 px-3 py-1.5 text-sm" href={gmapsPlace(p.lat, p.lon)} target="_blank" rel="noopener noreferrer">{tr("الاتجاهات")}</a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-semibold text-muted">
            {tr("بعض النقاط من خريطة OpenStreetMap المفتوحة (© مساهمو OpenStreetMap). لأحدث قائمة رسمية: تطبيق رب-كاف أونلاين ← «نقاط الشحن».")}
          </p>
        </>
      ) : (
        <p className="stamp mt-3 p-4 font-semibold">
          {tr("لم تُضف نقاط شحن بعد. لمعرفة أقرب نقطة شحن رسمية الآن افتح تطبيق رب-كاف أونلاين ← «نقاط الشحن».")}
        </p>
      )}

        </>
      ) : null}

      <h2 className="mt-6 text-xl font-bold">{tr("خدمات رب-كاف الرسمية")}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {SERVICES.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="stamp press flex h-full items-start gap-3 p-3">
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{tr(s.title)}</span>
                <span className="mt-0.5 block text-sm font-semibold text-muted">{tr(s.desc)}</span>
              </span>
              <ExternalLink className="mt-1 size-4 shrink-0" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-semibold text-muted">{tr("بعض المواقع الرسمية بالعبرية فقط. رهط بوست غير تابع لأي جهة منها.")}</p>
    </Shell>
  );
}

function PointsMap({ points }: { points: RavKavPoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let m: import("leaflet").Map | null = null;
    let off = false;
    void import("leaflet").then((mod) => {
      if (off || !el.current) return;
      const L = (mod as unknown as { default?: typeof mod }).default ?? mod;
      m = L.map(el.current, { zoomControl: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: "rp-soft-tiles",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);
      const g = L.featureGroup().addTo(m);
      for (const p of points)
        L.circleMarker([p.lat, p.lon], { radius: 9, color: "#263238", weight: 2, fillColor: "#FDB700", fillOpacity: 1 })
          .bindPopup(`<b>${p.name.replace(/</g, "&lt;")}</b><br>${p.address.replace(/</g, "&lt;")}`)
          .addTo(g);
      m.fitBounds(g.getBounds(), { padding: [30, 30], maxZoom: 16 });
    });
    return () => {
      off = true;
      m?.remove();
    };
  }, [points]);
  return <div ref={el} className="mt-3 h-64 w-full overflow-hidden rounded-2xl border border-line" />;
}
