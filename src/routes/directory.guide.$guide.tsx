import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Info } from "lucide-react";
import { Accordion, BranchCard, ExtLink, GuideBlocks, GuideIcon } from "@/components/guide";
import { Shell } from "@/components/shell";
import { formatCheckedAt, getGuide, guidePath } from "@/data/guides";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";

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
    return seo({
      title: g.seoTitle,
      description: g.seoDescription,
      path,
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
          dateModified: g.checkedAt,
          mainEntityOfPage: path,
        },
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
      </article>
    </Shell>
  );
}
