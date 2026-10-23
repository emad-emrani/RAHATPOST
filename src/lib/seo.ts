import { getI18nState } from "@/lib/i18n/core";
/**
 * Per-route SEO head: Arabic title + description, canonical URL on the apex domain, robots,
 * hreflang alternates, Open Graph / Twitter tags and JSON-LD. Used from each route's `head()`
 * so everything is in the server-rendered HTML.
 */

export const SITE_URL = "https://rahatpost.com";
export const SITE_NAME = "رهط بوست";
export const OG_IMAGE = `${SITE_URL}/og.jpg`;
export const LOGO_URL = `${SITE_URL}/icons/icon-512.png`;

export const DEFAULT_KEYWORDS = [
  "رهط بوست",
  "Rahat Post",
  "أخبار رهط",
  "أخبار النقب",
  "مدينة رهط",
  "باصات رهط",
  "باصات غاليم رهط",
  "دليل رهط",
  "محلات رهط",
  "حراج رهط",
  "إعلانات رهط",
  "صيدلية المناوبة رهط",
  "طقس رهط",
  "أوقات الصلاة رهط",
];

type Meta = Record<string, unknown>;
type LinkTag = { rel: string; href: string; hrefLang?: string };

export type SeoInput = {
  title: string;
  description: string;
  /** Path on the site, e.g. "/news". Query strings are dropped from the canonical URL. */
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  /** "index" (default), "noindex" (noindex, follow) or "private" (noindex, nofollow). */
  robots?: "index" | "noindex" | "private";
  /** JSON-LD objects (each becomes its own <script type="application/ld+json">). */
  jsonLd?: object[];
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  keywords?: string[];
};

/** Trim to a search-snippet friendly length on a word boundary. */
export function snippet(text: string | undefined | null, max = 155): string {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.split(/[?#]/)[0] || "/";
  return `${SITE_URL}${clean.startsWith("/") ? clean : `/${clean}`}`;
}

/** Only https images may be used as share/structured-data images. */
function safeImage(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("/")) return absoluteUrl(src);
  return /^https:\/\//.test(src) ? src : undefined;
}

export function seo(input: SeoInput): { meta: Meta[]; links: LinkTag[] } {
  const url = absoluteUrl(input.path);
  const image = safeImage(input.image) ?? OG_IMAGE;
  // Translated views (?lang=…) are for visitors; only the default-language pages get indexed.
  const st = getI18nState();
  const translated = st.lang !== (st.langs.find((l) => l.isDefault)?.code ?? "ar");
  const isIndexable = input.robots !== "private" && input.robots !== "noindex" && !translated;
  const robots =
    input.robots === "private"
      ? "noindex, nofollow"
      : translated
        ? "noindex, follow"
        : input.robots === "noindex"
          ? "noindex, follow"
          : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const kw = Array.from(new Set([...(input.keywords ?? []), ...DEFAULT_KEYWORDS])).join("، ");
  const meta: Meta[] = [
    { title: input.title },
    { name: "description", content: input.description },
    { name: "keywords", content: kw },
    { name: "robots", content: robots },
    { name: "googlebot", content: robots },
    { name: "author", content: SITE_NAME },
    { name: "geo.region", content: "IL-D" },
    { name: "geo.placename", content: "Rahat, Negev" },
    { name: "geo.position", content: "31.3925;34.7544" },
    { name: "ICBM", content: "31.3925, 34.7544" },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "ar_AR" },
    { property: "og:locale:alternate", content: "he_IL" },
    { property: "og:locale:alternate", content: "en_US" },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: input.imageAlt ?? input.title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
  ];
  if (input.publishedTime) {
    meta.push({ property: "article:published_time", content: input.publishedTime });
  }
  if (input.modifiedTime || input.publishedTime) {
    meta.push({
      property: "article:modified_time",
      content: input.modifiedTime ?? input.publishedTime,
    });
  }
  if (input.section) {
    meta.push({ property: "article:section", content: input.section });
  }
  for (const data of input.jsonLd ?? []) meta.push({ "script:ld+json": data });

  const links: LinkTag[] = [{ rel: "canonical", href: url }];
  if (isIndexable) {
    links.push(
      { rel: "alternate", hrefLang: "ar", href: url },
      { rel: "alternate", hrefLang: "x-default", href: url },
    );
  }
  return { meta, links };
}

/* ------------------------------------------------------------ JSON-LD builders */

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: ["Rahat Post", "رهط بوست - أخبار رهط والنقب", "רהט פוסט"],
  description:
    "بوابة مدينة رهط والنقب الإخبارية والخدمية: آخر أخبار رهط والنقب، مواعيد باصات غاليم، دليل المحلات والخدمات، حراج رهط، صيدلية المناوبة وأرقام الطوارئ.",
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: LOGO_URL, width: 512, height: 512 },
  image: OG_IMAGE,
  inLanguage: ["ar", "he", "en"],
  areaServed: [
    {
      "@type": "City",
      name: "رهط",
      alternateName: ["Rahat", "רהט"],
      geo: { "@type": "GeoCoordinates", latitude: 31.3925, longitude: 34.7544 },
    },
    { "@type": "AdministrativeArea", name: "النقب", alternateName: ["Negev", "הנגב"] },
  ],
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: ["Rahat Post", "موقع رهط بوست"],
  description:
    "أخبار رهط والنقب اليوم، مواعيد باصات رهط، دليل محلات وخدمات رهط، حراج رهط للإعلانات المبوبة، صيدلية الحراسة وأرقام الطوارئ.",
  url: SITE_URL,
  inLanguage: "ar",
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: SITE_NAME, path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Article structured data for news items hosted or curated on Rahat Post. */
export function newsArticleLd(a: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  publisherName?: string;
  image?: string;
  section?: string;
  /** Approved comments (reader posts), omitted when 0. */
  commentCount?: number;
}) {
  const image = safeImage(a.image);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(a.path),
    },
    headline: snippet(a.headline, 110),
    description: a.description,
    inLanguage: "ar",
    datePublished: a.datePublished,
    dateModified: a.dateModified ?? a.datePublished,
    image: [image ?? OG_IMAGE],
    ...(a.section ? { articleSection: a.section } : {}),
    author: a.authorName
      ? { "@type": "Person", name: a.authorName }
      : a.publisherName
        ? { "@type": "Organization", name: a.publisherName }
        : { "@id": `${SITE_URL}/#organization` },
    publisher: {
      "@type": "NewsMediaOrganization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: LOGO_URL, width: 512, height: 512 },
    },
    contentLocation: { "@type": "City", name: "رهط", alternateName: "Rahat" },
    ...(a.commentCount ? { commentCount: a.commentCount } : {}),
  };
}

/** LocalBusiness with only the fields we actually have. */
export function localBusinessLd(p: {
  path: string;
  name: string;
  altName?: string;
  category: string;
  description?: string;
  address?: string;
  area?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  lat?: number;
  lon?: number;
  osm?: string;
}) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${absoluteUrl(p.path)}#place`,
    name: p.name,
    url: absoluteUrl(p.path),
    address: {
      "@type": "PostalAddress",
      ...(p.address || p.area ? { streetAddress: p.address ?? p.area } : {}),
      addressLocality: "رهط",
      addressRegion: "النقب",
      addressCountry: "IL",
    },
  };
  if (p.altName) ld.alternateName = p.altName;
  if (p.description) ld.description = p.description;
  if (p.phone) ld.telephone = p.phone;
  if (p.openingHours) ld.openingHours = p.openingHours;
  if (p.lat !== undefined && p.lon !== undefined) {
    ld.geo = { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lon };
  }
  const sameAs = [p.website, p.osm].filter((u): u is string =>
    Boolean(u && /^https?:\/\//.test(u)),
  );
  if (sameAs.length) ld.sameAs = sameAs;
  return ld;
}
