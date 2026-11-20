import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronDown, ExternalLink, Info, MapPin, Phone, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Accordion, BranchCard, ExtLink, GuideBlocks, GuideCard, GuideIcon } from "@/components/guide";
import { Shell } from "@/components/shell";
import { formatCheckedAt, getGuide, guidePath, guides, type Guide } from "@/data/guides";
import { absoluteUrl, breadcrumbLd, LOGO_URL, OG_IMAGE, seo, SITE_NAME, SITE_URL } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";

function guideFaqLd(g: Guide) {
  const questions: { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }[] = [];
  for (const s of g.sections) {
    for (const item of s.items ?? []) {
      const texts: string[] = [];
      for (const b of item.blocks) {
        if (b.kind === "p" || b.kind === "note") texts.push(b.text);
        else if (b.kind === "list" || b.kind === "steps") texts.push(b.items.join(" • "));
      }
      const answer = texts.join(" ").trim();
      if (item.title && answer) {
        questions.push({
          "@type": "Question",
          name: item.title,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        });
      }
    }
  }
  if (!questions.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions,
  };
}

export const Route = createFileRoute("/directory/guide/$guide")({
  loader: ({ params }) => ({ slug: getGuide(params.guide) ? params.guide : null }),
  head: ({ params }) => {
    const g = getGuide(params.guide);
    if (!g) {
      return seo({
        title: tr("الدليل غير موجود · رهط بوست"),
        description: tr("هذا الدليل غير موجود."),
        path: `/directory/guide/${params.guide}`,
        robots: "noindex",
      });
    }
    const path = guidePath(g);
    const faq = guideFaqLd(g);
    return seo({
      title: g.seoTitle,
      description: g.seoDescription,
      path,
      type: "article",
      modifiedTime: g.checkedAt,
      jsonLd: [
        breadcrumbLd([
          { name: tr("دليل رهط"), path: "/directory" },
          { name: g.title, path },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.seoDescription,
          inLanguage: "ar",
          datePublished: g.checkedAt,
          dateModified: g.checkedAt,
          image: [OG_IMAGE],
          author: { "@id": `${SITE_URL}/#organization` },
          publisher: {
            "@type": "NewsMediaOrganization",
            "@id": `${SITE_URL}/#organization`,
            name: SITE_NAME,
            logo: { "@type": "ImageObject", url: LOGO_URL, width: 512, height: 512 },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": absoluteUrl(path),
          },
        },
        ...(faq ? [faq] : []),
      ],
    });
  },
  component: GuidePage,
});

const GUIDE_TAB_META: Record<string, { emoji: string; shortTitle: string }> = {
  post: { emoji: "📮", shortTitle: "البريد وبنك البريد" },
  municipality: { emoji: "🏛️", shortTitle: "البلدية والأرنونا" },
  health: { emoji: "🏥", shortTitle: "الصحة والطوارئ" },
  transport: { emoji: "🚌", shortTitle: "باصات غاليم" },
};

function GuidePage() {
  const { slug } = Route.useLoaderData();
  const guide = slug ? getGuide(slug) : undefined;
  const [query, setQuery] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");

  if (!guide) {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("هذا الدليل غير موجود.")}</p>
        <Link to="/directory" className="btn mt-4">
          {tr("رجوع للدليل")}
        </Link>
      </Shell>
    );
  }

  const checked = formatCheckedAt(guide.checkedAt);
  const otherGuides = guides.filter((g) => g.slug !== guide.slug);
  const cleanQuery = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!cleanQuery) return guide.sections;
    return guide.sections
      .map((sec) => {
        const secMatch =
          sec.title.toLowerCase().includes(cleanQuery) ||
          (sec.intro ?? "").toLowerCase().includes(cleanQuery);
        if (secMatch) return sec;
        const items = (sec.items ?? []).filter((it) => {
          if (it.title.toLowerCase().includes(cleanQuery)) return true;
          return it.blocks.some((b) => {
            if (b.kind === "p" || b.kind === "note") return b.text.toLowerCase().includes(cleanQuery);
            if (b.kind === "list" || b.kind === "steps")
              return b.items.some((x) => x.toLowerCase().includes(cleanQuery));
            if (b.kind === "links")
              return b.links.some((l) => l.label.toLowerCase().includes(cleanQuery));
            return false;
          });
        });
        const branches = (sec.branches ?? []).filter(
          (br) =>
            br.name.toLowerCase().includes(cleanQuery) ||
            br.address.toLowerCase().includes(cleanQuery) ||
            br.officialName.toLowerCase().includes(cleanQuery) ||
            br.services.some((s) => s.toLowerCase().includes(cleanQuery)),
        );
        if (!items.length && !branches.length) return null;
        return { ...sec, items, branches };
      })
      .filter(Boolean) as typeof guide.sections;
  }, [guide.sections, cleanQuery]);

  return (
    <Shell>
      <article className="flex flex-col gap-5">
        {/* Interactive Top Guide Switcher */}
        <nav
          aria-label={tr("التنقل بين أدلة خدمات رهط")}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {guides.map((g) => {
            const meta = GUIDE_TAB_META[g.slug] ?? { emoji: "📘", shortTitle: g.title };
            const isCurrent = g.slug === guide.slug;
            return (
              <Link
                key={g.slug}
                to="/directory/guide/$guide"
                params={{ guide: g.slug }}
                className={`press flex items-center gap-2 rounded-2xl border p-2.5 font-extrabold transition ${
                  isCurrent
                    ? "border-ink bg-ink text-paper shadow-sm"
                    : "border-line bg-paper text-ink hover:border-primary"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl text-lg ${
                    isCurrent ? "bg-primary text-ink" : "bg-primary-soft text-ink"
                  }`}
                  aria-hidden
                >
                  {meta.emoji}
                </span>
                <span className="truncate text-xs sm:text-sm">{trv(meta.shortTitle)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Hero Header Card */}
        <header className="stamp border-2 border-primary bg-gradient-to-b from-primary-soft/70 to-paper p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to="/directory" className="chip">
              {tr("دليل رهط والخدمات")}
            </Link>
            <p className="flex items-center gap-1 text-xs font-bold text-muted sm:text-sm">
              <CalendarCheck className="size-4 text-primary-ink" aria-hidden />
              {tr("آخر تحقق:")} {trv(checked)}
            </p>
          </div>
          <h1 className="mt-2.5 text-xl font-extrabold leading-snug sm:text-2xl">
            {trv(guide.title)}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/90 sm:text-base">
            {trv(guide.intro)}
          </p>

          {/* Interactive Search & Expand All Controls */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr("ابحث في الدليل (مثال: أرنونا، صلاح الدين، مخصصات، تقسيط، 106...)")}
                className="field w-full ps-10 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setExpandAll((v) => !v)}
              className="btn btn-ghost shrink-0 py-2.5 text-xs font-extrabold sm:text-sm"
            >
              <ChevronDown
                className={`size-4 transition-transform ${expandAll ? "rotate-180" : ""}`}
                aria-hidden
              />
              {expandAll ? tr("طي جميع الأقسام") : tr("فتح جميع الإجابات")}
            </button>
          </div>
        </header>

        {/* Quick Interactive Action Bar for Post Guide */}
        {guide.slug === "post" ? (
          <section className="stamp border border-line bg-paper p-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <a
                href="https://doar.israelpost.co.il/voucher"
                target="_blank"
                rel="noopener noreferrer"
                className="btn py-2.5 text-xs font-extrabold sm:text-sm"
              >
                💳 {tr("دفع قسيمة / فاتورة أونلاين ↗")}
              </a>
              <a
                href="https://www.paybill.co.il/Payment/WaterPayment?p=165"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost py-2.5 text-xs font-extrabold sm:text-sm"
              >
                🏠 {tr("دفع أرنونا ومياه رهط ↗")}
              </a>
              <a
                href="tel:171"
                className="btn btn-ghost py-2.5 text-xs font-extrabold sm:text-sm"
              >
                <Phone className="size-4" aria-hidden />
                {tr("مركز خدمة البريد 171")}
              </a>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = trackingCode.trim().toUpperCase();
                const url = clean
                  ? `https://doar.israelpost.co.il/deliverytracker?itemcode=${encodeURIComponent(clean)}`
                  : "https://doar.israelpost.co.il/deliverytracker";
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                type="text"
                dir="ltr"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="RR123456789IL — أدخل رقم تتبع الطرد البريدي..."
                className="field flex-1 font-mono text-sm uppercase"
              />
              <button type="submit" className="btn shrink-0 px-5 py-2.5 text-xs font-extrabold sm:text-sm">
                📦 {tr("تتبع الطرد في بريد إسرائيل ↗")}
              </button>
            </form>
          </section>
        ) : null}

        {/* Section Jump Chips */}
        <nav aria-label={tr("أقسام الدليل")} className="scroll-row -mx-4 px-4 pb-1">
          {guide.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="chip whitespace-nowrap">
              <GuideIcon icon={s.icon} className="size-4" />
              {trv(s.title)}
            </a>
          ))}
        </nav>

        {filteredSections.length === 0 ? (
          <div className="stamp p-6 text-center">
            <p className="font-extrabold text-ink">{tr("لا توجد نتائج مطابقة لبحثك في هذا الدليل.")}</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="btn btn-ghost mt-3 text-xs font-extrabold"
            >
              {tr("مسح البحث وعرض كل الأقسام")}
            </button>
          </div>
        ) : null}

        {filteredSections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
              <span className="icon-badge size-10 rounded-xl">
                <GuideIcon icon={section.icon} className="size-5" />
              </span>
              {trv(section.title)}
            </h2>
            {section.intro ? <p className="mb-3 text-lg leading-relaxed">{trv(section.intro)}</p> : null}
            <div className="flex flex-col gap-3">
              {section.items?.map((item) => (
                <Accordion
                  key={`${item.id}-${expandAll || Boolean(cleanQuery)}`}
                  id={`${section.id}-${item.id}`}
                  title={trv(item.title)}
                  open={expandAll || Boolean(cleanQuery)}
                >
                  <GuideBlocks blocks={item.blocks} />
                </Accordion>
              ))}
              {section.branches?.map((b) => (
                <BranchCard key={b.id} branch={b} />
              ))}
              {section.links?.length ? (
                <div className="flex flex-col gap-2">
                  {section.links.map((l) => (
                    <ExtLink key={l.href} link={l} />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ))}

        <p className="stamp flex gap-2 p-4 font-semibold leading-relaxed">
          <Info className="mt-1 size-5 shrink-0" aria-hidden />
          <span>{trv(guide.disclaimer)}</span>
        </p>

        <section id="sources" className="stamp p-4">
          <h2 className="text-xl font-bold">{tr("المصادر الرسمية")}</h2>
          <p className="mb-2 text-sm font-semibold text-muted">{tr("آخر تحقق من كل المصادر:")} {trv(checked)}</p>
          <ol className="flex flex-col gap-1 text-base">
            {guide.sources.map((s) => (
              <li key={s.href} className="ms-5 list-decimal">
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline decoration-1 underline-offset-4"
                >
                  <span>{trv(s.label)}</span>
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ol>
        </section>

        {otherGuides.length ? (
          <section aria-label={tr("أدلة خدمات أخرى في رهط")}>
            <h2 className="mb-3 text-xl font-bold">{tr("أدلة خدمات أخرى في رهط")}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {otherGuides.map((g) => (
                <li key={g.slug}>
                  <GuideCard guide={g} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </Shell>
  );
}
