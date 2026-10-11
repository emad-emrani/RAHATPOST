# SEO — رهط بوست

## What the site provides

- Per-route Arabic `<title>`, meta description, canonical (`https://rahatpost.com/...`), robots, Open Graph and Twitter tags: `src/lib/seo.ts` + each route's `head()` (server-rendered).
- JSON-LD: `NewsMediaOrganization` + `WebSite` with `SearchAction` (`/?q=`) on the home page, `BreadcrumbList` on sections/detail pages, `LocalBusiness` on directory places (only real fields; owner phone numbers are not put in markup), `NewsArticle` on reader posts.
- Indexing policy:
  - indexed: home, /news, /israel-news, /today, /buses, /directory + places, /ads + real ads, reader posts (`/news/reader-…`), /app.
  - `noindex, follow`: external-feed news pages (`/news/<slug>` from RSS) and `/israel-news/<slug>` — they only hold a headline + excerpt (or a machine translation) that links to the publisher, so they are thin/duplicate of the original; the links are still followed. Also sample ads, /submit.
  - `noindex`: /login, /my-posts, /app-auth/*, /offline.html; `noindex, nofollow`: /admin.
- `/robots.txt` (static, `public/`) and `/sitemap.xml` (dynamic: `src/routes/sitemap[.]xml.ts`).
- `www.rahatpost.com` → 308 → `rahatpost.com` (Vercel project domain redirect).
- Platform note: on Vercel the platform head injector rewrites `og:title/description/image/url/type/site_name` and `twitter:*`. og:title follows the page `<title>` (no fixed title in `src/lib/og/site.json`); og:image is the site card `/og.jpg`. Per-article share images would need a change in `server/middleware/grok-pwa.ts` / `scripts/grok-pwa-shared.mjs`.

## Google Search Console (بالعربية بالأسفل)

1. Open https://search.google.com/search-console → **Add property**.
2. Recommended: **Domain** property `rahatpost.com` (covers www + apex) → Google shows a TXT record `google-site-verification=…`.
   - GoDaddy → My Products → rahatpost.com → **DNS** → **Add New Record** → Type **TXT**, Name **@**, Value = the full string, TTL 1 hour → Save. Then click **Verify** (can take minutes to a few hours).
3. Alternative: **URL prefix** `https://rahatpost.com/` → **HTML tag** method → copy only the `content="…"` value → in Vercel → Project rahatpost → Settings → Environment Variables → add `GOOGLE_SITE_VERIFICATION` = that value (Production) → redeploy → Verify.
4. After verifying: **Sitemaps** → submit `sitemap.xml`. Use **URL Inspection** → "Request indexing" for the home page, /news, /buses, /directory.

## Bing Webmaster Tools

1. https://www.bing.com/webmasters → sign in → **Import from Google Search Console** (fastest, once Google is verified), or **Add site** `https://rahatpost.com/`.
2. Manual verification: **HTML meta tag** → copy the `content` value → Vercel env `BING_SITE_VERIFICATION` → redeploy; or **CNAME** record in GoDaddy DNS as Bing shows it.
3. Submit `https://rahatpost.com/sitemap.xml` under **Sitemaps**.

## بالعربية

1. **Google:** افتح Search Console ← أضف موقعاً ← اختر «نطاق» واكتب `rahatpost.com` ← انسخ سجل TXT ← في GoDaddy: منتجاتي ← rahatpost.com ← DNS ← إضافة سجل: النوع TXT، الاسم @، القيمة كما هي ← حفظ ← ارجع واضغط «تحقق».
   - أو طريقة «علامة HTML»: انسخ قيمة content فقط وضعها في Vercel كمتغير `GOOGLE_SITE_VERIFICATION` ثم أعد النشر.
   - بعد التحقق: «خرائط الموقع» ← أرسل `sitemap.xml`.
2. **Bing:** افتح Bing Webmaster ← «استيراد من Google Search Console» (الأسهل)، أو أضف الموقع وتحقق بعلامة meta عبر المتغير `BING_SITE_VERIFICATION` في Vercel ← ثم أرسل خريطة الموقع.
