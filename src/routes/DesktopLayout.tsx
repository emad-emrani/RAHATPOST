"use client";

import type { ReactNode } from "react";
import { AdBanner } from "./AdBanner";

export interface DesktopLayoutProps {
  /** شريط التنبيهات العاجلة أو السلايدر العلوي الكامل العرض */
  heroSection?: ReactNode;
  /** المحتوى الرئيسي للصفحة (الأخبار، المباريات، الحراج، الدليل) */
  children: ReactNode;
  /** ويدجت إضافية في الشريط الجانبي (مثل الطقس، أوقات الصلاة، الصيدلية المناوبة، أو الباصات) */
  sidebarWidgets?: ReactNode;
  /** معرفات الوحدات الإعلانية من Google AdSense */
  adSlots?: {
    /** إعلان البانر العلوي العريض (728x90 / Responsive Leaderboard) */
    topLeaderboard?: string;
    /** الإعلان الأول في الشريط الجانبي الثابت (300x250 Rectangle) */
    sidebarTop?: string;
    /** الإعلان الطولي الثابت في الشريط الجانبي (300x600 Half-Page Skyscraper) */
    sidebarSticky?: string;
    /** إعلان أسفل المحتوى الرئيسي */
    bottomBanner?: string;
  };
  /** معرف الناشر في Google AdSense */
  adClient?: string;
}

/**
 * هيكل العرض الرئيسي للشاشات الكبيرة (DesktopLayout) لمنصة رهط بوست:
 * - يعتمد شبكة متسقة من 12 عموداً على الشاشات الكبيرة (8 أعمدة للمحتوى الرئيسي + 4 أعمدة للشريط الجانبي).
 * - يثبّت الشريط الجانبي للإعلانات والخدمات (Sticky Sidebar) أثناء التمرير لزيادة نسبة المشاهدة (Viewability) دون إزعاج القارئ.
 * - يحافظ على توافق الهواتف والشاشات المتوسطة تلقائياً.
 */
export function DesktopLayout({
  heroSection,
  children,
  sidebarWidgets,
  adSlots = {
    topLeaderboard: "1122334455",
    sidebarTop: "2233445566",
    sidebarSticky: "3344556677",
    bottomBanner: "4455667788",
  },
  adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ||
    "ca-pub-9063892572843254",
}: DesktopLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      {/* 1. مساحة إعلانية علوية (Leaderboard) أعلى الصفحة */}
      {adSlots.topLeaderboard ? (
        <div className="mb-5">
          <AdBanner
            dataAdClient={adClient}
            dataAdSlot={adSlots.topLeaderboard}
            dataAdFormat="horizontal"
            minHeight={90}
          />
        </div>
      ) : null}

      {/* 2. قسم علوي كامل العرض (مثل شريط العاجل أو أزرار الأقسام السريعة) */}
      {heroSection ? <div className="mb-6">{heroSection}</div> : null}

      {/* 3. الشبكة الرئيسية للشاشات الكبيرة: المحتوى الرئيسي + الشريط الجانبي الثابت (Sticky Sidebar) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* العمود الرئيسي (الأخبار، بث المباريات، الحراج، والدليل) — 8 أعمدة */}
        <main className="min-w-0 space-y-6 lg:col-span-8 xl:col-span-9">
          {children}

          {/* إعلان سفلي في نهاية المحتوى الرئيسي */}
          {adSlots.bottomBanner ? (
            <div className="pt-2">
              <AdBanner
                dataAdClient={adClient}
                dataAdSlot={adSlots.bottomBanner}
                dataAdFormat="auto"
                minHeight={120}
              />
            </div>
          ) : null}
        </main>

        {/* الشريط الجانبي الثابت (Sticky Sidebar) — 4 أعمدة على الشاشات الكبيرة */}
        <aside
          aria-label="الشريط الجانبي للإعلانات والخدمات السريعة"
          className="w-full space-y-5 lg:sticky lg:top-20 lg:col-span-4 xl:col-span-3"
        >
          {/* بطاقة خدمات رهط السريعة (أو أي ويدجت ممررة من الصفحة) */}
          {sidebarWidgets ? (
            <div className="space-y-4">{sidebarWidgets}</div>
          ) : (
            <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-extrabold text-[#263238]">
                  خدمات رهط السريعة
                </h2>
                <span className="rounded-full bg-[#f2c94c] px-2.5 py-0.5 text-[11px] font-extrabold text-[#263238]">
                  مباشر
                </span>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-xs font-extrabold">
                <li>
                  <a
                    href="/buses"
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#f1f2f4] px-3 py-2.5 text-[#263238] transition hover:bg-[#f2c94c]"
                  >
                    🚌 خريطة الباصات
                  </a>
                </li>
                <li>
                  <a
                    href="/today"
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#f1f2f4] px-3 py-2.5 text-[#263238] transition hover:bg-[#f2c94c]"
                  >
                    💊 صيدلية المناوبة
                  </a>
                </li>
                <li>
                  <a
                    href="/haraj"
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#f1f2f4] px-3 py-2.5 text-[#263238] transition hover:bg-[#f2c94c]"
                  >
                    📢 حراج رهط
                  </a>
                </li>
                <li>
                  <a
                    href="/directory"
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#f1f2f4] px-3 py-2.5 text-[#263238] transition hover:bg-[#f2c94c]"
                  >
                    📍 دليل المصالح
                  </a>
                </li>
              </ul>
            </div>
          )}

          {/* الوحدة الإعلانية الجانبية الأولى (مستطيل 300x250) */}
          {adSlots.sidebarTop ? (
            <AdBanner
              dataAdClient={adClient}
              dataAdSlot={adSlots.sidebarTop}
              dataAdFormat="rectangle"
              minHeight={250}
            />
          ) : null}

          {/* الوحدة الإعلانية الجانبية الطولية الثابتة (300x600 Skyscraper) */}
          {adSlots.sidebarSticky ? (
            <div className="hidden lg:block">
              <AdBanner
                dataAdClient={adClient}
                dataAdSlot={adSlots.sidebarSticky}
                dataAdFormat="vertical"
                minHeight={600}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default DesktopLayout;
