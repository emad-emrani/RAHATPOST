import { Link } from "@tanstack/react-router";
import { Bus, Megaphone, Newspaper, Phone, Plus, Siren, Store, Timer } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { NewsItem } from "@/lib/news/types";

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
  return (
    <nav className="scroll-row -mx-4 px-4" aria-label="الأقسام">
      {tiles.map((t) => {
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
  const slides: Slide[] = [
    ...(lead
      ? [
          {
            key: "news",
            className: "banner",
            content: (
              <Link to="/news/$slug" params={{ slug: lead.slug }} className="flex h-full flex-col justify-between gap-3">
                <span className="chip w-fit bg-white/20 text-white">آخر خبر · {lead.source}</span>
                <span className="line-clamp-3 text-xl font-bold leading-snug">{lead.title}</span>
                <span className="text-sm font-semibold text-white/85">{leadTime}</span>
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
          <span className="text-sm font-semibold text-white/85">أوقات مباشرة وجدول محدّث يومياً</span>
          <Timer className="banner-icon size-36" aria-hidden />
        </Link>
      ),
    },
    {
      key: "submit",
      className: "banner banner-yellow",
      content: (
        <Link to="/submit" search={{ mode: "نشاط" }} className="flex h-full flex-col justify-between gap-3">
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
          <span className="chip w-fit bg-white/20 text-white">لوحة اليوم</span>
          <span className="text-2xl font-bold leading-snug">أرقام الطوارئ وصيدلية الحراسة</span>
          <span className="text-sm font-semibold text-white/85">الشرطة 100 · الإسعاف 101 · الإطفاء 102</span>
          <Phone className="banner-icon size-36" aria-hidden />
        </Link>
      ),
    },
  ];

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
          <div key={s.key} className={s.className} aria-roledescription="slide" aria-label={`${i + 1} من ${slides.length}`}>
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
              className={i === index ? "h-2 w-5 rounded-full bg-primary" : "size-2 rounded-full bg-ink/25"}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
