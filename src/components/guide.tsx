import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Clock,
  ExternalLink,
  Info,
  Landmark,
  MapPin,
  Phone,
  Receipt,
  TriangleAlert,
} from "lucide-react";
import type { Guide, GuideBlock, GuideBranch, GuideLink, GuideSection } from "@/data/guides/types";

const sectionIcons: Record<GuideSection["icon"], typeof Receipt> = {
  receipt: Receipt,
  "map-pin": MapPin,
  landmark: Landmark,
  info: Info,
};

export function GuideIcon({ icon, className }: { icon: GuideSection["icon"]; className?: string }) {
  const Icon = sectionIcons[icon];
  return <Icon className={className} aria-hidden />;
}

/** Prominent card linking to a guide (directory list, place pages). */
export function GuideCard({ guide, compact = false }: { guide: Guide; compact?: boolean }) {
  return (
    <Link
      to="/directory/guide/$guide"
      params={{ guide: guide.slug }}
      className={`stamp press flex items-center gap-3 border-2 border-primary p-3 ${compact ? "" : "bg-primary-soft"}`}
    >
      <span className="icon-badge size-14 rounded-2xl bg-paper">
        <BookOpen className="size-7" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-snug">{guide.title}</span>
        <span className="block text-sm font-semibold text-muted">{guide.cardSubtitle}</span>
      </span>
      <ChevronLeft className="size-5 shrink-0" aria-hidden />
    </Link>
  );
}

export function ExtLink({ link }: { link: GuideLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 rounded-2xl border border-line bg-paper p-3 font-bold press"
    >
      <ExternalLink className="mt-1 size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block underline decoration-2 underline-offset-4">{link.label}</span>
        {link.note ? (
          <span className="block text-sm font-semibold text-muted">{link.note}</span>
        ) : null}
      </span>
    </a>
  );
}

function Block({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case "p":
      return <p>{block.text}</p>;
    case "list":
      return (
        <ul className="flex flex-col gap-1">
          {block.items.map((t) => (
            <li key={t} className="ms-5 list-disc">
              {t}
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="flex flex-col gap-1">
          {block.items.map((t) => (
            <li key={t} className="ms-5 list-decimal">
              {t}
            </li>
          ))}
        </ol>
      );
    case "note":
      return (
        <p
          className={`flex gap-2 rounded-2xl p-3 font-semibold ${block.tone === "alert" ? "border-2 border-alert bg-paper" : "bg-surface"}`}
        >
          {block.tone === "alert" ? (
            <TriangleAlert className="mt-1 size-5 shrink-0" aria-hidden />
          ) : (
            <Info className="mt-1 size-5 shrink-0" aria-hidden />
          )}
          <span>{block.text}</span>
        </p>
      );
    case "links":
      return (
        <div className="flex flex-col gap-2">
          {block.links.map((l) => (
            <ExtLink key={l.href} link={l} />
          ))}
        </div>
      );
  }
}

/** Native <details> accordion: works without JS and is crawlable. */
export function Accordion({
  id,
  title,
  children,
  open,
}: {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details id={id} className="stamp group scroll-mt-24" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{title}</span>
        <ChevronDown
          className="size-5 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-4 text-lg leading-relaxed">
        {children}
      </div>
    </details>
  );
}

export function GuideBlocks({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </>
  );
}

export function BranchCard({ branch }: { branch: GuideBranch }) {
  return (
    <Accordion
      id={`branch-${branch.id}`}
      title={
        <span className="block">
          <span className="block">{branch.name}</span>
          <span className="block text-sm font-semibold text-muted">
            {branch.kind} · {branch.address}
          </span>
        </span>
      }
    >
      <p className="text-base font-semibold text-muted">
        الاسم الرسمي: <span lang="he">{branch.officialName}</span> (رقم {branch.id}) · العنوان
        الرسمي: <span lang="he">{branch.officialAddress}</span>
      </p>
      <div>
        <h4 className="mb-1 flex items-center gap-2 font-bold">
          <Clock className="size-4" aria-hidden />
          ساعات العمل
        </h4>
        <table className="w-full text-base">
          <tbody>
            {branch.hours.map((h) => (
              <tr key={h.day} className="border-b border-line last:border-0">
                <th scope="row" className="py-1 text-start font-semibold">
                  {h.day}
                </th>
                <td className="py-1 text-left font-bold">
                  {h.time.split("، ").map((range) => (
                    <span key={range} className="block" dir={/\d/.test(range) ? "ltr" : undefined}>
                      {range}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {branch.notes?.map((n) => (
        <p key={n} className="font-semibold">
          {n}
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        {branch.services.map((s) => (
          <span key={s} className="chip">
            {s}
          </span>
        ))}
      </div>
      {branch.phone || branch.fax ? (
        <p className="flex flex-wrap items-center gap-x-4 font-semibold">
          {branch.phone ? (
            <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1 underline">
              <Phone className="size-4" aria-hidden />
              <span dir="ltr">{branch.phone}</span>
            </a>
          ) : null}
          {branch.fax ? (
            <span>
              فاكس: <span dir="ltr">{branch.fax}</span>
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <a className="btn" href={branch.directionsUrl} target="_blank" rel="noopener noreferrer">
          <MapPin className="size-4" aria-hidden />
          الاتجاهات
        </a>
        {branch.appointmentUrl ? (
          <a
            className="btn btn-ghost"
            href={branch.appointmentUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            حجز دور
          </a>
        ) : (
          <a className="btn btn-ghost" href={branch.url} target="_blank" rel="noopener noreferrer">
            صفحة الفرع
          </a>
        )}
      </div>
      {branch.appointmentUrl ? (
        <a
          className="inline-flex items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-4"
          href={branch.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          صفحة الفرع الرسمية (الساعات المحدّثة)
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}
    </Accordion>
  );
}
