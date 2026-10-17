import { Link } from "@tanstack/react-router";
import { Bus, Megaphone, Newspaper, Phone, Plus, Siren, Store, Timer } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NewsImage } from "@/components/news-image";
import { newsByline } from "@/lib/news/format";
import type { NewsItem } from "@/lib/news/types";
import { mediaUrl } from "@/lib/media/types";
import { useSiteSettings } from "@/lib/site-settings/context";

const tiles = [
  { to: "/news", label: "الأخبار", icon: Newspaper },
  { to: "/buses", label: "الباصات", icon: Bus },
  { to: "/directory", label: "الدليل", icon: Store },
  { to: "/ads", label: "الإعلانات", icon: Megaphone },
  { to: "/today", label: "اليوم", icon: Siren },
  { to: "/submit", label: "أضف", icon: Plus },
] as const;

/** Horizontally scrolling category tiles (icon square + label). */
export function HomeTiles() {
  const order = useSiteSettings().tiles;
  const list = order
    .filter((o) => o.visible)
    .map((o) => tiles.find((t) => t.to === o.id))
    .filter((t): t is (typeof tiles)[number] => Boolean(t));
  if (!list.length) return null;
  return (
    <nav className="scroll-row -mx-4 px-4" aria-label="الأقسام">
      {list.map((t) => {
        const Icon = t.icon;
        return (
          <Link key={t.to} to={t.to} className="tile">
            <span className="tile-icon">
              <Icon className="size-7" aria-hidden />
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

type Slide = { key: string; className: string; content: ReactNode };

/** Snap-scrolling banner carousel with dots; auto-advances unless reduced motion is preferred. */
export function HomeCarousel({ lead, leadTime }: { lead?: NewsItem; leadTime: string }) {
  const config = useSiteSettings().slides;
  const builtins: Slide[] = [
    ...(lead
      ? [
          {
            key: "news",
            className: lead.image ? "banner banner-photo" : "banner",
            content: lead.image ? (
              <Link
                to="/news/$slug"
                params={{ slug: lead.slug }}
                className="flex h-full flex-col justify-between gap-3"
              >
                <span className="absolute inset-0" aria-hidden>
                  <NewsImage
                    item={{ ...lead, title: "" }}
                    size="full"
                    className="size-full"
                    iconClassName="size-16"
                    eager
                  />
                </span>
                <span className="banner-shade" aria-hidden />
                <span className="relative chip w-fit bg-white/20 text-white">
                  آخر خبر · {newsByline(lead)}
                </span>
                <span className="relative line-clamp-3 text-xl font-bold leading-snug">
                  {lead.title}
                </span>
                <span className="relative text-sm font-semibold text-white/90">{leadTime}</span>
              </Link>
            ) : (
              <Link
                to="/news/$slug"
                params={{ slug: lead.slug }}
                className="flex h-full flex-col justify-between gap-3"
              >
                <span className="chip w-fit bg-ink/10">آخر خبر · {newsByline(lead)}</span>
                <span className="line-clamp-3 text-xl font-bold leading-snug">{lead.title}</span>
                <span className="text-sm font-semibold">{leadTime}</span>
                <Newspaper className="banner-icon size-36" aria-hidden />
              </Link>
            ),
          },
        ]
      : []),
    {
      key: "buses",
      className: "banner banner-dark",
      content: (
        <Link to="/buses" className="flex h-full flex-col justify-between gap-3">
          <span className="chip w-fit bg-white/15 text-white">باصات رهط</span>
          <span className="text-2xl font-bold leading-snug">متى يصل الباص؟</span>
          <span className="text-sm font-semibold text-white/85">
            أوقات مباشرة وجدول محدّث يومياً
          </span>
          <Timer className="banner-icon size-36" aria-hidden />
        </Link>
      ),
    },
    {
      key: "submit",
      className: "banner banner-soft",
      content: (
        <Link
          to="/submit"
          search={{ mode: "نشاط" }}
          className="flex h-full flex-col justify-between gap-3"
        >
          <span className="chip w-fit bg-ink/10">الدليل</span>
          <span className="text-2xl font-bold leading-snug">أضف نشاطك في دليل رهط</span>
          <span className="text-sm font-semibold">يظهر بعلامة «موثّق» بعد المراجعة</span>
          <Store className="banner-icon size-36" aria-hidden />
        </Link>
      ),
    },
    {
      key: "today",
      className: "banner",
      content: (
        <Link to="/today" className="flex h-full flex-col justify-between gap-3">
          <span className="chip w-fit bg-ink/10">لوحة اليوم</span>
          <span className="text-2xl font-bold leading-snug">أرقام الطوارئ وصيدلية الحراسة</span>
          <span className="text-sm font-semibold">الشرطة 100 · الإسعاف 101 · الإطفاء 102</span>
          <Phone className="banner-icon size-36" aria-hidden />
        </Link>
      ),
    },
  ];
  const slides: Slide[] = config
    .map((c): Slide | undefined =>
      c.type === "builtin"
        ? builtins.find((b) => b.key === c.id)
        : {
            key: c.id,
            className: c.imageKey ? "banner banner-photo" : "banner",
            content: (
              <CustomSlide
                title={c.title}
                subtitle={c.subtitle}
                link={c.link}
                imageKey={c.imageKey}
              />
            ),
          },
    )
    .filter((x): x is Slide => Boolean(x));

  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
      setIndex(Math.min(slides.length - 1, i));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [slides.length]);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollTo({ left: dir * i * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => go((index + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [index, paused, slides.length]);

  if (!slides.length) return null;
  return (
    <section
      aria-roledescription="carousel"
      aria-label="أبرز المحتوى"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div ref={ref} className="carousel">
        {slides.map((s, i) => (
          <div
            key={s.key}
            className={s.className}
            aria-roledescription="slide"
            aria-label={`${i + 1} من ${slides.length}`}
          >
            {s.content}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-center">
        {slides.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className="grid size-8 place-items-center"
            aria-label={`الشريحة ${i + 1}`}
            aria-current={i === index}
            onClick={() => go(i)}
          >
            <span
              className={
                i === index ? "h-2 w-5 rounded-full bg-ink" : "size-2 rounded-full bg-ink/25"
              }
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function CustomSlide({
  title,
  subtitle,
  link,
  imageKey,
}: {
  title: string;
  subtitle: string;
  link: string;
  imageKey: string;
}) {
  const inner = (
    <>
      {imageKey ? (
        <>
          <img
            src={mediaUrl(imageKey)}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <span className="banner-shade" aria-hidden />
        </>
      ) : null}
      <span className="relative mt-auto line-clamp-3 text-2xl font-bold leading-snug">{title}</span>
      {subtitle ? (
        <span className={`relative text-sm font-semibold ${imageKey ? "text-white/90" : ""}`}>
          {subtitle}
        </span>
      ) : null}
    </>
  );
  const cls = "flex h-full flex-col justify-end gap-2";
  if (!link) return <div className={cls}>{inner}</div>;
  return /^https?:/.test(link) ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <a href={link} className={cls}>
      {inner}
    </a>
  );
}

/** Owner-defined quick link cards («روابط سريعة» in إعدادات الموقع). */
export function QuickLinks() {
  const links = useSiteSettings().quickLinks;
  if (!links.length) return null;
  return (
    <section aria-label="روابط سريعة">
      <ul className="grid grid-cols-2 gap-3">
        {links.map((l) => {
          const external = /^https?:/.test(l.url);
          return (
            <li key={l.id}>
              <a
                href={l.url}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="stamp press flex h-full items-center gap-3 p-3"
              >
                {l.emoji ? <span className="icon-badge text-2xl">{l.emoji}</span> : null}
                <span className="min-w-0">
                  <span className="block font-bold leading-snug">{l.title}</span>
                  {l.subtitle ? (
                    <span className="text-sm font-semibold text-muted">{l.subtitle}</span>
                  ) : null}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
