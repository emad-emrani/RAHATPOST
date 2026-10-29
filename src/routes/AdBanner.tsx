"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export type AdBannerFormat =
  | "auto"
  | "fluid"
  | "rectangle"
  | "vertical"
  | "horizontal";

export interface AdBannerProps {
  /** معرف الوحدة الإعلانية من حساب Google AdSense (Data Ad Slot) */
  dataAdSlot: string;
  /** معرف الناشر (Publisher ID) — الافتراضي لحساب رهط بوست */
  dataAdClient?: string;
  /** شكل الوحدة الإعلانية */
  dataAdFormat?: AdBannerFormat;
  /** مفتاح التخطيط للإعلانات المدمجة داخل المحتوى (In-Feed) */
  dataAdLayoutKey?: string;
  /** تفعيل الاستجابة الكاملة لعرض الشاشة */
  dataFullWidthResponsive?: boolean;
  /** الكلاسات الإضافية للحاوية الخارجية */
  className?: string;
  /** الحد الأدنى للارتفاع لمنع قفز المحتوى (CLS) */
  minHeight?: number;
  /** إظهار ترويسة "إعلان" أعلى الوحدة */
  showLabel?: boolean;
  /** تنسيق مخصص لعنصر <ins> */
  style?: CSSProperties;
}

/**
 * مكون AdBanner المحمي ضد أخطاء إعادة التصيير (Re-rendering) في React 18/19 و Next.js:
 * - يتحقق من عدم تهيئة عنصر <ins> مسبقاً عبر فحص data-adsbygoogle-status و data-ad-status.
 * - ينتظر حتى يصبح عرض الحاوية أكبر من 0 بكسل لتفادي خطأ availableWidth=0 في الأعمدة المخفية.
 * - يعيد تهيئة الإعلان بأمان عند تغيّر رقم الـ Slot فقط دون تكرار طلبات push().
 */
export function AdBanner({
  dataAdSlot,
  dataAdClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ||
    "ca-pub-9063892572843254",
  dataAdFormat = "auto",
  dataAdLayoutKey,
  dataFullWidthResponsive = true,
  className = "",
  minHeight = 100,
  showLabel = true,
  style,
}: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedSlotRef = useRef<string | null>(null);
  const [adUnfilled, setAdUnfilled] = useState(false);
  const uniqueId = useId();

  useEffect(() => {
    const containerEl = containerRef.current;
    const insEl = insRef.current;
    if (!containerEl || !insEl || typeof window === "undefined") return;

    // إذا تم دفع نفس الـ Slot مسبقاً أو كان العنصر مهيأً من سكربت أدسنس، لا تقم باستدعاء push مرة أخرى
    const existingStatus = insEl.getAttribute("data-adsbygoogle-status");
    const adFillStatus = insEl.getAttribute("data-ad-status");
    if (
      pushedSlotRef.current === dataAdSlot ||
      existingStatus === "done" ||
      adFillStatus === "filled"
    ) {
      return;
    }

    let rafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let statusObserver: MutationObserver | null = null;

    const tryPushAd = () => {
      if (!insRef.current || !containerRef.current) return;
      if (
        pushedSlotRef.current === dataAdSlot ||
        insRef.current.getAttribute("data-adsbygoogle-status") === "done" ||
        insRef.current.innerHTML.trim().length > 0
      ) {
        return;
      }

      // التأكد من أن الحاوية مرئية ولها عرض فعلي (> 0) لتجنب خطأ TagError: availableWidth=0
      const width = containerRef.current.getBoundingClientRect().width;
      if (width <= 0) return;

      try {
        pushedSlotRef.current = dataAdSlot;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AdBanner] AdSense push skipped:", err);
        }
      }
    };

    // مراقبة حالة امتلاء الإعلان (filled / unfilled)
    statusObserver = new MutationObserver(() => {
      const status = insEl.getAttribute("data-ad-status");
      if (status === "unfilled") {
        setAdUnfilled(true);
      } else if (status === "filled") {
        setAdUnfilled(false);
      }
    });
    statusObserver.observe(insEl, {
      attributes: true,
      attributeFilter: ["data-ad-status", "data-adsbygoogle-status"],
    });

    // إذا كانت الحاوية مرئية الآن، ادفع الإعلان في الإطار التالي، وإلا انتظر حتى تصبح مرئية عبر ResizeObserver
    if (containerEl.getBoundingClientRect().width > 0) {
      rafId = window.requestAnimationFrame(tryPushAd);
    } else if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            tryPushAd();
            resizeObserver?.disconnect();
            break;
          }
        }
      });
      resizeObserver.observe(containerEl);
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      statusObserver?.disconnect();
    };
  }, [dataAdSlot, dataAdClient]);

  if (adUnfilled) {
    return null;
  }

  return (
    <aside
      ref={containerRef}
      aria-label="مساحة إعلانية"
      className={`w-full overflow-hidden rounded-2xl border border-black/5 bg-white p-2.5 shadow-[0_1px_3px_rgba(16,24,40,0.05)] ${className}`}
    >
      {showLabel ? (
        <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-bold text-[#64748b]">
          <span>إعلان</span>
          <span className="text-[10px] opacity-75">رهط بوست</span>
        </div>
      ) : null}

      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#f8fafc]"
        style={{ minHeight: `${minHeight}px` }}
      >
        <ins
          ref={insRef}
          key={`${uniqueId}-${dataAdSlot}`}
          className="adsbygoogle block w-full"
          style={{
            display: "block",
            minHeight: `${minHeight}px`,
            width: "100%",
            ...style,
          }}
          data-ad-client={dataAdClient}
          data-ad-slot={dataAdSlot}
          data-ad-format={dataAdFormat}
          {...(dataAdLayoutKey ? { "data-ad-layout-key": dataAdLayoutKey } : {})}
          data-full-width-responsive={dataFullWidthResponsive ? "true" : "false"}
        />
      </div>
    </aside>
  );
}

export default AdBanner;
