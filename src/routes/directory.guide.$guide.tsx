import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Info } from "lucide-react";
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

function GuidePage() {
  const { slug } = Route.useLoaderData();
  const guide = slug ? getGuide(slug) : undefined;

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

  return (
    <Shell>
      <article className="flex flex-col gap-5">
        <header>
          <Link to="/directory" className="chip mb-2">
            {tr("دليل رهط")}
          </Link>
          <h1 className="text-2xl font-bold leading-snug">{trv(guide.title)}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-muted">
            <CalendarCheck className="size-4" aria-hidden />
            {tr("آخر تحقق:")} {trv(checked)}
          </p>
          <p className="mt-3 text-lg leading-relaxed">{trv(guide.intro)}</p>
        </header>

        <nav aria-label={tr("أقسام الدليل")} className="scroll-row -mx-4 px-4 pb-1">
          {guide.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="chip whitespace-nowrap">
              <GuideIcon icon={s.icon} className="size-4" />
              {trv(s.title)}
            </a>
          ))}
        </nav>

        {guide.sections.map((section) => (
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
                <Accordion key={item.id} id={`${section.id}-${item.id}`} title={trv(item.title)}>
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
          <h2 className="text-xl font-bold">{tr("المصادر")}</h2>
          <p className="mb-2 text-sm font-semibold text-muted">{tr("آخر تحقق من كل المصادر:")} {trv(checked)}</p>
          <ol className="flex flex-col gap-1 text-base">
            {guide.sources.map((s) => (
              <li key={s.href} className="ms-5 list-decimal">
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline decoration-1 underline-offset-4"
                >
                  {trv(s.label)}
                </a>
              </li>
            ))}
          </ol>
        </section>

        {otherGuides.length ? (
          <section aria-label={tr("أدلة خدمات أخرى في رهط")}>
            <h2 className="mb-3 text-xl font-bold">{tr("أدلة خدمات أخرى في رهط")}</h2>
            <ul className="flex flex-col gap-3">
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
