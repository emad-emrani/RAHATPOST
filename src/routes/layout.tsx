import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-arabic",
});

export const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-9063892572843254";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.rahatpost.com"),
  title: {
    default: "رهط بوست | أخبار وخدمات رهط والنقب في مكان واحد",
    template: "%s · رهط بوست",
  },
  description:
    "منصة رهط بوست: بوابة أخبار رهط والنقب، مواعيد وخرائط باصات غاليم المباشرة، دليل المحلات والخدمات، حراج رهط، وأرقام الطوارئ والصيدليات المناوبة.",
  applicationName: "رهط بوست",
  alternates: {
    canonical: "https://www.rahatpost.com",
  },
  openGraph: {
    type: "website",
    locale: "ar_AR",
    url: "https://www.rahatpost.com",
    siteName: "رهط بوست",
    title: "رهط بوست | أخبار وخدمات رهط والنقب",
    description:
      "أخبار رهط والنقب، مواعيد باصات رهط المباشرة، دليل المصالح والخدمات، وحراج رهط المبوّب.",
  },
  verification: {
    google: "gZirpZH5RWc4SxozAbvqJJPBxhk4DyFprqchBfkZhOU",
  },
  other: {
    "google-adsense-account": ADSENSE_CLIENT_ID,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F2C94C",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={ibmPlexArabic.variable}
      suppressHydrationWarning
    >
      <head>
        {/* وسم التحقق الرسمي لحساب Google AdSense */}
        <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} />

        {/* سكريبت Google AdSense الرئيسي مدمج في الـ head لتفعيل الإعلانات والتحقق من الموقع */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />

        {/* سكريبت إعلانات Google AMP التلقائية */}
        <script
          async
          custom-element="amp-auto-ads"
          src="https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js"
        />
      </head>
      <body className="min-h-screen bg-[#f1f2f4] font-sans text-[#263238] antialiased selection:bg-[#f2c94c] selection:text-[#263238]">
        {/* تفعيل إعلانات AMP التلقائية في حال فتح صفحات متوافقة */}
        <div
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: `<amp-auto-ads type="adsense" data-ad-client="${ADSENSE_CLIENT_ID}"></amp-auto-ads>`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
