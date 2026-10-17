import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  BookOpen,
  Briefcase,
  ChevronLeft,
  Cloud,
  Gamepad2,
  Gift,
  GraduationCap,
  MessageCircle,
  Music,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { mediaUrl } from "@/lib/media/types";
import { addToCart } from "@/lib/store/cart";
import { checkout } from "@/lib/store/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  DURATIONS,
  effectivePrice,
  formatPrice,
  type Currency,
  type PublicProduct,
  type SectionIcon,
  type StoreCategory,
} from "@/lib/store/types";

export function Price({
  p,
  currency,
  big = false,
}: {
  p: PublicProduct;
  currency: Currency;
  big?: boolean;
}) {
  const now = effectivePrice(p);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className={big ? "text-2xl font-bold" : "text-lg font-bold"} dir="ltr">
        {formatPrice(now, currency)}
      </span>
      {now < p.priceAgorot ? (
        <s className="text-sm font-semibold text-muted" dir="ltr">
          {formatPrice(p.priceAgorot, currency)}
        </s>
      ) : null}
      {p.duration !== "none" ? (
        <span className="text-sm font-semibold text-muted">/ {DURATIONS[p.duration]}</span>
      ) : null}
    </span>
  );
}

export function ProductImage({ p, className }: { p: PublicProduct; className: string }) {
  return p.imageKey ? (
    <img src={mediaUrl(p.imageKey)} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-primary-soft`}>
      <ShoppingBag className="size-10 text-primary-ink" aria-hidden />
    </span>
  );
}

export function Badges({ p }: { p: PublicProduct }) {
  const now = effectivePrice(p);
  return (
    <span className="flex flex-wrap gap-1">
      {p.isSample ? <span className="chip chip-deep">مثال</span> : null}
      {now < p.priceAgorot ? <span className="chip chip-alert">تخفيض</span> : null}
      {!p.inStock ? <span className="chip">نفد</span> : null}
      {p.badges.map((b) => (
        <span key={b} className="chip chip-ink">
          {b}
        </span>
      ))}
    </span>
  );
}

/** «الدفع نقداً عبر واتساب»: creates a pending order, then opens WhatsApp with its details. */
export function WhatsAppCashButton({
  items,
  redirect,
  onDone,
}: {
  items: { id: string; qty: number }[];
  redirect: string;
  onDone?: () => void;
}) {
  const { user, isPending } = useCurrentUserState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isPending) return null;
  if (!user)
    return (
      <Link to="/login" search={{ redirect }} className="btn btn-ghost w-full">
        <MessageCircle className="size-4" aria-hidden />
        الدفع نقداً عبر واتساب (سجّل الدخول)
      </Link>
    );
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await checkout({ data: { items, method: "whatsapp" } });
            if (!r.ok) return setError(r.message);
            onDone?.();
            if (r.url) window.location.assign(r.url);
          } catch {
            setError("تعذّر إنشاء الطلب.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <MessageCircle className="size-4" aria-hidden />
        {busy ? "جاري إنشاء الطلب…" : "الدفع نقداً عبر واتساب"}
      </button>
      {error ? <p className="font-bold text-red-700">{error}</p> : null}
    </>
  );
}

export function BuyButtons({ p, compact = false }: { p: PublicProduct; compact?: boolean }) {
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  if (p.isSample)
    return (
      <button type="button" className="btn btn-ghost w-full" disabled>
        منتج تجريبي
      </button>
    );
  if (!p.inStock)
    return (
      <button type="button" className="btn btn-ghost w-full" disabled>
        غير متوفر حالياً
      </button>
    );
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
      <button
        type="button"
        className="btn btn-ghost px-2"
        onClick={() => {
          addToCart(p.id);
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
      >
        <ShoppingCart className="size-4" aria-hidden />
        {added ? "أُضيف ✓" : "أضف للسلة"}
      </button>
      <button
        type="button"
        className="btn px-2"
        onClick={() => {
          addToCart(p.id);
          void navigate({ to: "/cart" });
        }}
      >
        اشترِ الآن
      </button>
    </div>
  );
}

export function ProductCard({ p, currency }: { p: PublicProduct; currency: Currency }) {
  return (
    <article className="stamp flex h-full flex-col overflow-hidden">
      <Link to="/store/$slug" params={{ slug: p.slug }} className="block">
        <ProductImage p={p} className="aspect-[4/3] w-full" />
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Badges p={p} />
        <Link to="/store/$slug" params={{ slug: p.slug }} className="font-bold leading-snug">
          {p.name}
        </Link>
        {p.shortDesc ? (
          <p className="line-clamp-2 text-sm font-semibold text-muted">{p.shortDesc}</p>
        ) : null}
        <div className="mt-auto pt-1">
          <Price p={p} currency={currency} />
        </div>
        <BuyButtons p={p} compact />
      </div>
    </article>
  );
}

/** Links that keep the old directory and guides reachable from the store. */
export function StoreFooterLinks() {
  return (
    <nav className="stamp mt-6 flex flex-col gap-1 p-3" aria-label="روابط أخرى">
      <Link
        to="/directory"
        className="flex min-h-12 items-center gap-2 rounded-xl px-2 font-bold hover:bg-surface"
      >
        <Store className="size-5 text-primary-ink" aria-hidden />
        دليل المحلات والخدمات في رهط
      </Link>
      <Link
        to="/directory/guide/$guide"
        params={{ guide: "post" }}
        className="flex min-h-12 items-center gap-2 rounded-xl px-2 font-bold hover:bg-surface"
      >
        <BookOpen className="size-5 text-primary-ink" aria-hidden />
        دليل خدمة البريد
      </Link>
      <Link
        to="/my-orders"
        className="flex min-h-12 items-center gap-2 rounded-xl px-2 font-bold hover:bg-surface"
      >
        <ShoppingBag className="size-5 text-primary-ink" aria-hidden />
        طلباتي
      </Link>
    </nav>
  );
}

const ICONS: Record<SectionIcon, LucideIcon> = {
  bag: ShoppingBag,
  tv: Tv,
  briefcase: Briefcase,
  sparkles: Sparkles,
  bot: Bot,
  gamepad: Gamepad2,
  music: Music,
  cloud: Cloud,
  shield: Shield,
  graduation: GraduationCap,
  gift: Gift,
  phone: Smartphone,
};

/** Section cover: the uploaded image, else a neutral icon on the section colour. */
export function SectionCover({ c, className }: { c: StoreCategory; className: string }) {
  if (c.imageKey)
    return (
      <img
        src={mediaUrl(c.imageKey)}
        alt=""
        loading="lazy"
        className={`${className} object-cover`}
      />
    );
  const Icon = ICONS[c.icon] ?? ShoppingBag;
  return (
    <span className={`${className} grid place-items-center`} style={{ backgroundColor: c.color }}>
      <Icon className="size-10 text-ink" aria-hidden />
    </span>
  );
}

export function SectionTile({ c }: { c: StoreCategory }) {
  return (
    <Link
      to="/store/c/$slug"
      params={{ slug: c.slug }}
      className="stamp press flex h-full flex-col overflow-hidden"
    >
      <SectionCover c={c} className="aspect-[4/3] w-full" />
      <span className="flex flex-col gap-0.5 p-3">
        <span className="font-bold leading-snug">{c.name}</span>
        <span className="text-xs font-semibold text-muted">
          {c.productCount
            ? c.productCount === 1
              ? "خيار واحد"
              : c.productCount === 2
                ? "خياران"
                : `${c.productCount} ${c.productCount < 11 ? "خيارات" : "خياراً"}`
            : "قريباً"}
        </span>
      </span>
    </Link>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; slug?: string }[] }) {
  return (
    <nav
      aria-label="مسار التصفح"
      className="mb-3 flex flex-wrap items-center gap-1 text-sm font-bold"
    >
      <Link to="/store" className="inline-flex min-h-10 items-center text-muted">
        المتجر
      </Link>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronLeft className="size-4 text-muted" aria-hidden />
          {it.slug ? (
            <Link
              to="/store/c/$slug"
              params={{ slug: it.slug }}
              className="inline-flex min-h-10 items-center text-muted"
            >
              {it.label}
            </Link>
          ) : (
            <span aria-current="page">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
