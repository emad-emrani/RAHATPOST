import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_VIP_POSTS,
  SocialVipFeedAndTrendsSection,
  parseCustomVipPosts,
  parseSocialHubConfig,
  type SocialVipPostItem,
} from "@/components/social-vip-feed";
import {
  parseWeatherPrayerStyleConfig,
  type WeatherFxOverride,
  type WeatherPrayerVisualStyle,
} from "@/components/today-cards";
import type { SiteSettings } from "@/lib/site-settings/types";

function toBase64UrlSafe(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

export interface PublishableArticleItem {
  slug: string;
  title: string;
  summary: string;
  category: string;
  imageUrl?: string;
  publishedAt?: string;
}

export function SocialHubAndNewslettersAdmin({
  draft,
  setDraft,
  saveNow,
  busy,
  articles = [],
}: {
  draft: SiteSettings;
  setDraft: (next: SiteSettings) => void;
  saveNow: (next: SiteSettings, msg?: string) => Promise<void>;
  busy: boolean;
  articles?: PublishableArticleItem[];
}) {
  const [subTab, setSubTab] = useState<"pages" | "tiktok-ai" | "vip-feed" | "weather-security">(
    "pages",
  );
  const [toast, setToast] = useState<string>("");

  const hubCfg = useMemo(() => parseSocialHubConfig(draft.quickLinks), [draft.quickLinks]);
  const customVipPosts = useMemo(() => parseCustomVipPosts(draft.quickLinks), [draft.quickLinks]);
  const weatherCfg = useMemo(
    () => parseWeatherPrayerStyleConfig(draft.quickLinks),
    [draft.quickLinks],
  );

  // Social Page Connection State
  const [fbPageName, setFbPageName] = useState(hubCfg.fbPageName);
  const [fbPageUrl, setFbPageUrl] = useState(hubCfg.fbPageUrl);
  const [fbPageId, setFbPageId] = useState(hubCfg.fbPageId);
  const [fbAccessToken, setFbAccessToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("rp_fb_page_token") ?? "";
  });
  const [fbAutoPublish, setFbAutoPublish] = useState(hubCfg.fbAutoPublish);
  const [tiktokHandle, setTiktokHandle] = useState(hubCfg.tiktokHandle);
  const [telegramChannel, setTelegramChannel] = useState(hubCfg.telegramChannel);
  const [vipEnabled, setVipEnabled] = useState(hubCfg.vipSectionEnabled);
  const [trendScope, setTrendScope] = useState<"local" | "global">(hubCfg.defaultTrendScope);
  const [fbPostStatus, setFbPostStatus] = useState<string>("");

  // New Custom VIP Post Form
  const [newPlatform, setNewPlatform] = useState<"x" | "facebook">("x");
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorHandle, setNewAuthorHandle] = useState("");
  const [newAuthorRole, setNewAuthorRole] = useState("سياسي / شخصية عامة");
  const [newCategory, setNewCategory] = useState<"politicians" | "celebrities" | "sports" | "local">(
    "politicians",
  );
  const [newOriginalLang, setNewOriginalLang] = useState<"he" | "en" | "ar">("he");
  const [newOriginalText, setNewOriginalText] = useState("");
  const [newTranslatedAr, setNewTranslatedAr] = useState("");
  const [newTrendTag, setNewTrendTag] = useState("#رهط_بوست");

  // AI TikTok Video Studio State
  const sampleArticles: PublishableArticleItem[] = useMemo(() => {
    if (articles.length > 0) return articles;
    return [
      {
        slug: "rahat-development-2026",
        title: "بلدية رهط تعلن إطلاق مشاريع تطوير شاملة للشوارع والبنية التحتية في الأحياء الجديدة",
        summary:
          "بدء أعمال التعبيد والإنارة الذكية وتوسعة المرافق الخدمية لخدمة أهالي مدينة رهط والنقب على مدار الساعة.",
        category: "أخبار رهط",
      },
      {
        slug: "negev-weather-rain-alert",
        title: "أجواء ماطرة ومنخفض جوي يزور رهط ومنطقة النقب مع انخفاض ملموس في درجات الحرارة",
        summary:
          "الأرصاد الجوية تتوقع هطول زخات مطر متفرقة في بئر السبع ورهط وتدعو السائقين للحيطة والحذر على الطرقات.",
        category: "الطقس واليوم",
      },
      {
        slug: "galim-buses-smart-schedule",
        title: "تحديث مواعيد ومسارات باصات غاليم في رهط وبئر السبع لتسهيل تنقل الطلاب والعمال",
        summary:
          "متابعة حية لجميع خطوط باصات رهط عبر منصة وتطبيق رهط بوست مع خريطة المسارات التفاعلية.",
        category: "خدمات وباصات",
      },
    ];
  }, [articles]);

  const [selectedArticleIdx, setSelectedArticleIdx] = useState(0);
  const [videoHeadline, setVideoHeadline] = useState(sampleArticles[0]?.title ?? "");
  const [videoSummary, setVideoSummary] = useState(sampleArticles[0]?.summary ?? "");
  const [videoBadge, setVideoBadge] = useState(sampleArticles[0]?.category ?? "عاجل · رهط بوست");
  const [videoTheme, setVideoTheme] = useState<"breaking-red" | "gold-night" | "cyber-neon">(
    "gold-night",
  );
  const [videoDurationSec, setVideoDurationSec] = useState<number>(8);
  const [withVoiceAndSound, setWithVoiceAndSound] = useState<boolean>(true);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    setVipEnabled(hubCfg.vipSectionEnabled);
    setTrendScope(hubCfg.defaultTrendScope);
    setFbPageName(hubCfg.fbPageName);
    setFbPageUrl(hubCfg.fbPageUrl);
    setFbPageId(hubCfg.fbPageId);
    setFbAutoPublish(hubCfg.fbAutoPublish);
    setTiktokHandle(hubCfg.tiktokHandle);
    setTelegramChannel(hubCfg.telegramChannel);
  }, [hubCfg]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const persistSocialHubSettings = async (
    overrides?: Partial<{
      vip: boolean;
      scope: "local" | "global";
      fbAuto: boolean;
      fbName: string;
      fbUrl: string;
      fbId: string;
      tt: string;
      tg: string;
    }>,
    customMsg?: string,
  ) => {
    const nextVip = overrides?.vip ?? vipEnabled;
    const nextScope = overrides?.scope ?? trendScope;
    const nextFbAuto = overrides?.fbAuto ?? fbAutoPublish;
    const nextFbName = overrides?.fbName ?? fbPageName;
    const nextFbUrl = overrides?.fbUrl ?? fbPageUrl;
    const nextFbId = overrides?.fbId ?? fbPageId;
    const nextTt = overrides?.tt ?? tiktokHandle;
    const nextTg = overrides?.tg ?? telegramChannel;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("rp_fb_page_token", fbAccessToken.trim());
      } catch {
        /* ignore */
      }
    }

    const titleStr = `vip:${nextVip ? "1" : "0"}|scope:${nextScope}|fbauto:${nextFbAuto ? "1" : "0"}|fbid:${nextFbId.trim()}|tt:${nextTt.trim()}`;
    const metaJson = JSON.stringify({
      fbPageName: nextFbName.trim(),
      fbPageUrl: nextFbUrl.trim(),
      telegramChannel: nextTg.trim(),
    });
    const urlStr = `/__shcfg?${toBase64UrlSafe(metaJson)}`;

    const otherLinks = (draft.quickLinks ?? []).filter((q) => q.id !== "socialhubcfg");
    const nextDraft: SiteSettings = {
      ...draft,
      quickLinks: [
        ...otherLinks,
        {
          id: "socialhubcfg",
          title: titleStr.slice(0, 120),
          subtitle: "socialhub",
          url: urlStr,
        },
      ],
    };
    setDraft(nextDraft);
    await saveNow(nextDraft, customMsg ?? "تم حفظ إعدادات التواصل والنشرات بنجاح ✓");
    showToastMsg(customMsg ?? "تم حفظ إعدادات التواصل والنشرات بنجاح ✓");
  };

  const persistWeatherStyle = async (
    style: WeatherPrayerVisualStyle,
    fx: WeatherFxOverride,
    intensity: "light" | "medium" | "heavy" = weatherCfg.rainIntensity,
  ) => {
    const otherLinks = (draft.quickLinks ?? []).filter((q) => q.id !== "weatherstylecfg");
    const nextDraft: SiteSettings = {
      ...draft,
      quickLinks: [
        ...otherLinks,
        {
          id: "weatherstylecfg",
          title: `style:${style}|fx:${fx}`,
          subtitle: `int:${intensity}|sim:1`,
          url: "/today",
        },
      ],
    };
    setDraft(nextDraft);
    await saveNow(nextDraft, "تم تحديث مظهر وأنيميشن الطقس وأوقات الصلاة ✓");
    showToastMsg("تم تحديث مظهر وأنيميشن الطقس وأوقات الصلاة ✓");
  };

  // Continuous live preview animation on the 9:16 canvas when in tiktok-ai tab
  useEffect(() => {
    if (subTab !== "tiktok-ai") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTs = performance.now();
    let active = true;

    const renderFrame = (nowTs: number) => {
      if (!active) return;
      const elapsedSec = ((nowTs - startTs) / 1000) % videoDurationSec;
      drawAiTikTokFrame(ctx, canvas.width, canvas.height, {
        headline: videoHeadline || "رهط بوست · أخبار رهط والنقب أولاً بأول",
        summary: videoSummary || "تابعوا التغطية الكاملة والحصرية عبر موقع وتطبيق رهط بوست",
        badge: videoBadge || "عاجل · رهط بوست",
        theme: videoTheme,
        tiktokHandle: tiktokHandle || "@rahatpost",
        elapsedSec,
        totalSec: videoDurationSec,
      });
      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      active = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [subTab, videoHeadline, videoSummary, videoBadge, videoTheme, tiktokHandle, videoDurationSec]);

  // Generate downloadable 9:16 vertical video (.webm / .mp4) using Canvas + MediaRecorder + Web Audio
  const handleGenerateAiTikTokVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isGeneratingVideo) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsGeneratingVideo(true);
    setVideoProgress(0);
    if (generatedVideoUrl) {
      URL.revokeObjectURL(generatedVideoUrl);
      setGeneratedVideoUrl("");
    }

    try {
      const stream = canvas.captureStream(30);
      let audioCtx: AudioContext | null = null;

      // Synthesize subtle broadcast news intro chime & rhythmic pulse into the video audio track
      if (withVoiceAndSound && typeof window !== "undefined") {
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            audioCtx = new AudioCtx();
            const dest = audioCtx.createMediaStreamDestination();
            const nowAudio = audioCtx.currentTime;

            // Breaking news intro chord chimes
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
              if (!audioCtx) return;
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = "triangle";
              osc.frequency.setValueAtTime(freq, nowAudio + i * 0.14);
              gain.gain.setValueAtTime(0.001, nowAudio + i * 0.14);
              gain.gain.exponentialRampToValueAtTime(0.12, nowAudio + i * 0.14 + 0.04);
              gain.gain.exponentialRampToValueAtTime(0.001, nowAudio + i * 0.14 + 0.65);
              osc.connect(gain);
              gain.connect(dest);
              gain.connect(audioCtx.destination);
              osc.start(nowAudio + i * 0.14);
              osc.stop(nowAudio + i * 0.14 + 0.7);
            });

            // Soft newsroom pulse every second
            for (let s = 1; s < videoDurationSec; s++) {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(110, nowAudio + s);
              gain.gain.setValueAtTime(0.001, nowAudio + s);
              gain.gain.exponentialRampToValueAtTime(0.05, nowAudio + s + 0.03);
              gain.gain.exponentialRampToValueAtTime(0.001, nowAudio + s + 0.25);
              osc.connect(gain);
              gain.connect(dest);
              osc.start(nowAudio + s);
              osc.stop(nowAudio + s + 0.28);
            }

            dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
          }
        } catch {
          /* ignore audio synthesis errors */
        }

        // Also trigger Arabic TTS voiceover during preview/recording if supported
        try {
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(
              `${videoBadge}. ${videoHeadline}. ${videoSummary}`,
            );
            utter.lang = "ar-SA";
            utter.rate = 1.02;
            window.speechSynthesis.speak(utter);
          }
        } catch {
          /* ignore */
        }
      }

      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const supportedMime =
        mimeTypes.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ||
        "";

      const recorder = new MediaRecorder(
        stream,
        supportedMime ? { mimeType: supportedMime, videoBitsPerSecond: 3_500_000 } : undefined,
      );

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const donePromise = new Promise<string>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: supportedMime || "video/webm" });
          resolve(URL.createObjectURL(blob));
        };
      });

      recorder.start(100);
      const totalMs = videoDurationSec * 1000;
      const t0 = performance.now();

      await new Promise<void>((resolve) => {
        const step = () => {
          const elapsed = performance.now() - t0;
          const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
          setVideoProgress(pct);
          if (elapsed >= totalMs) {
            resolve();
          } else {
            setTimeout(step, 80);
          }
        };
        step();
      });

      recorder.stop();
      if (audioCtx) {
        void audioCtx.close().catch(() => {});
      }
      const url = await donePromise;
      setGeneratedVideoUrl(url);
      showToastMsg("🎬 تم توليد فيديو تيك توك بالذكاء الاصطناعي بنجاح! يمكنك معاينته أو تحميله الآن.");
    } catch {
      showToastMsg("تعذّر تسجيل الفيديو في هذا المتصفح، يرجى استخدام Chrome أو Edge.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Share or Auto-Post Article to Rahat Post Facebook Page
  const handlePublishToFacebookPage = async (article: PublishableArticleItem) => {
    const articleUrl = `https://www.rahatpost.com/news/${encodeURIComponent(article.slug)}`;
    const caption = `📰 ${article.title}\n\n${article.summary}\n\n👈 التفاصيل الكاملة على موقع رهط بوست:\n${articleUrl}\n\n#رهط_بوست #رهط #النقب`;

    if (fbPageId.trim() && fbAccessToken.trim()) {
      setFbPostStatus("جاري النشر التلقائي على صفحة فيسبوك عبر Graph API…");
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(fbPageId.trim())}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: caption,
              link: articleUrl,
              access_token: fbAccessToken.trim(),
            }),
          },
        );
        const data = await res.json();
        if (data?.id) {
          setFbPostStatus(`✅ تم نشر الخبر مباشرة على صفحة فيسبوك (معرّف المنشور: ${data.id})!`);
          return;
        }
        setFbPostStatus(
          `⚠️ تعذّر النشر المباشر عبر التوكن (${data?.error?.message || "تحقق من الصلاحيات"})، تم فتح نافذة النشر الرسمية.`,
        );
      } catch {
        setFbPostStatus("تم تجهيز المنشور وفتح نافذة النشر على صفحة فيسبوك.");
      }
    }

    // Copy caption + open Facebook Share dialog pre-populated with quote & link
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      /* ignore */
    }
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      articleUrl,
    )}&quote=${encodeURIComponent(caption)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=680,height=640");
    showToastMsg("📘 تم نسخ نص الخبر وفتح نافذة النشر على صفحة فيسبوك!");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border-2 border-primary-deep bg-gradient-to-l from-[#111827] via-[#1e293b] to-[#0f172a] p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-[#111827]">
              📱 مركز التواصل والنشرات الذكي · AI Social Hub
            </span>
            <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">
              التواصل والنشرات · فيسبوك + ناشر تيك توك AI + قسم تواصل اجتماعي والتريند
            </h2>
            <p className="mt-1 text-xs font-semibold text-white/80 sm:text-sm">
              ربط منشورات الموقع بصفحة رهط بوست على فيسبوك، تحويل الأخبار إلى فيديو تيك توك بالذكاء
              الاصطناعي، وإدارة قسم «تواصل اجتماعي» (تغريدات المشاهير والسياسيين والتريند العالمي والمحلي).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-2xl px-3 py-1.5 text-xs font-extrabold ${
                vipEnabled
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
                  : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
              }`}
            >
              {vipEnabled
                ? "🌐 قسم تواصل اجتماعي: مفعّل وظاهر"
                : "🔒 قسم تواصل اجتماعي: مخفي حالياً (لحين تفعيله)"}
            </span>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: "pages", label: "📘 ربط صفحة فيسبوك ونشر الأخبار" },
            { id: "tiktok-ai", label: "🎬 ناشر تيك توك بالذكاء الاصطناعي (AI Video)" },
            {
              id: "vip-feed",
              label: `🌐 قسم تواصل اجتماعي والتريند (${vipEnabled ? "مفعّل" : "مخفي"})`,
            },
            { id: "weather-security", label: "🌧️ أنيميشن الطقس والصلاة + الأمان والحماية" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as typeof subTab)}
              className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold transition ${
                subTab === t.id
                  ? "bg-primary text-[#111827] shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {toast ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-extrabold text-emerald-800">
          {toast}
        </div>
      ) : null}

      {/* =====================================================================
       * SUB-TAB 1: ربط منشورات الموقع بصفحة رهط بوست على فيسبوك ومنصات التواصل
       * ===================================================================== */}
      {subTab === "pages" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Facebook & Social Accounts Connection Card */}
          <div className="stamp space-y-4 p-5 lg:col-span-5">
            <div className="flex items-center gap-2.5 border-b border-line pb-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-[#1877f2] text-lg font-black text-white">
                f
              </span>
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  ربط صفحة رهط بوست على فيسبوك والمنصات
                </h3>
                <p className="text-xs font-semibold text-muted">
                  ربط تلقائي ومباشر لمنشورات وأخبار الموقع
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-extrabold text-ink">
                  اسم الصفحة الرسمية على فيسبوك
                </span>
                <input
                  type="text"
                  value={fbPageName}
                  onChange={(e) => setFbPageName(e.target.value)}
                  className="field text-sm font-bold"
                  placeholder="رهط بوست - Rahat Post"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-extrabold text-ink">
                  رابط صفحة فيسبوك (Facebook Page URL)
                </span>
                <input
                  type="url"
                  dir="ltr"
                  value={fbPageUrl}
                  onChange={(e) => setFbPageUrl(e.target.value)}
                  className="field text-sm font-bold"
                  placeholder="https://www.facebook.com/rahatpost"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-extrabold text-ink">
                    معرّف الصفحة (Page ID - اختياري للنشر التلقائي)
                  </span>
                  <input
                    type="text"
                    dir="ltr"
                    value={fbPageId}
                    onChange={(e) => setFbPageId(e.target.value)}
                    className="field text-xs font-bold"
                    placeholder="1029384756..."
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-extrabold text-ink">
                    حساب تيك توك الرسمي
                  </span>
                  <input
                    type="text"
                    dir="ltr"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    className="field text-xs font-bold"
                    placeholder="@rahatpost"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-extrabold text-ink">
                  مفتاح الربط التلقائي لفيسبوك (Facebook Page Access Token - اختياري)
                </span>
                <input
                  type="password"
                  dir="ltr"
                  value={fbAccessToken}
                  onChange={(e) => setFbAccessToken(e.target.value)}
                  className="field text-xs font-bold"
                  placeholder="EAAGm0PX4ZCpsBA..."
                />
                <span className="mt-1 block text-[11px] font-semibold text-muted">
                  يحفظ محلياً بأمان لإرسال الأخبار مباشرة عبر Graph API، أو يمكنك النشر بنقرة واحدة بدون توكن.
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-extrabold text-ink">
                  رابط قناة تلغرام / واتساب للنشرات
                </span>
                <input
                  type="text"
                  dir="ltr"
                  value={telegramChannel}
                  onChange={(e) => setTelegramChannel(e.target.value)}
                  className="field text-xs font-bold"
                  placeholder="https://t.me/rahatpost"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
                <div>
                  <span className="block text-xs font-extrabold text-ink">
                    تجهيز النشر التلقائي عند إضافة خبر جديد
                  </span>
                  <span className="block text-[11px] font-semibold text-muted">
                    يرفق بطاقة المشاركة الفورية لفيسبوك وتيك توك مع كل خبر منشور
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={fbAutoPublish}
                  onChange={(e) => setFbAutoPublish(e.target.checked)}
                  className="size-5 accent-[#d9a92a]"
                />
              </label>

              <button
                type="button"
                disabled={busy}
                onClick={() => void persistSocialHubSettings()}
                className="btn w-full"
              >
                💾 حفظ إعدادات الربط والصفحات
              </button>
            </div>
          </div>

          {/* Live Site Posts Publisher Feed */}
          <div className="stamp space-y-4 p-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  📰 منشورات وأخبار الموقع الجاهزة للنشر على التواصل الاجتماعي
                </h3>
                <p className="text-xs font-semibold text-muted">
                  انشر أي خبر من الموقع مباشرة على صفحة رهط بوست في فيسبوك أو حوّله إلى فيديو تيك توك بالذكاء الاصطناعي
                </p>
              </div>
              <a
                href={fbPageUrl || "https://www.facebook.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#1877f2] px-3 py-1.5 text-xs font-extrabold text-white shadow-2xs"
              >
                📘 فتح صفحة فيسبوك ↗
              </a>
            </div>

            {fbPostStatus ? (
              <p className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs font-extrabold text-sky-700">
                {fbPostStatus}
              </p>
            ) : null}

            <div className="space-y-3">
              {sampleArticles.slice(0, 8).map((art, idx) => {
                const fullUrl = `https://www.rahatpost.com/news/${encodeURIComponent(art.slug)}`;
                return (
                  <div
                    key={art.slug + idx}
                    className="rounded-2xl border border-line bg-surface/60 p-3.5 transition hover:border-primary-deep"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="chip text-[10px]">{art.category}</span>
                        <h4 className="mt-1 text-sm font-extrabold text-ink">{art.title}</h4>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted">
                          {art.summary}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handlePublishToFacebookPage(art)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1877f2] px-3 py-2 text-xs font-extrabold text-white shadow-2xs transition hover:brightness-95"
                      >
                        <span>📘</span>
                        <span>نشر على صفحة فيسبوك</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArticleIdx(idx);
                          setVideoHeadline(art.title);
                          setVideoSummary(art.summary);
                          setVideoBadge(art.category || "عاجل · رهط بوست");
                          setSubTab("tiktok-ai");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#111827] px-3 py-2 text-xs font-extrabold text-[#f2c94c] shadow-2xs transition hover:bg-black"
                      >
                        <span>🎬</span>
                        <span>تحويل إلى فيديو تيك توك AI</span>
                      </button>

                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(
                          fullUrl,
                        )}&text=${encodeURIComponent(art.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-extrabold text-ink hover:border-primary-deep"
                      >
                        ✈️ تلغرام
                      </a>

                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `📰 *${art.title}*\n${art.summary}\n\n${fullUrl}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-extrabold text-emerald-700 hover:border-emerald-500"
                      >
                        💬 واتساب
                      </a>

                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                          `${art.title}\n#رهط_بوست #رهط`,
                        )}&url=${encodeURIComponent(fullUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-extrabold text-ink hover:border-primary-deep"
                      >
                        𝕏 تغريدة
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
       * SUB-TAB 2: ناشر تيك توك بالذكاء الاصطناعي (AI News-to-TikTok Video Studio)
       * ===================================================================== */}
      {subTab === "tiktok-ai" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Controls Column */}
          <div className="stamp space-y-4 p-5 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="inline-block rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-extrabold text-primary-ink">
                  ✨ صناعة فيديو بالذكاء الاصطناعي · 9:16 Vertical HD
                </span>
                <h3 className="mt-1 text-lg font-extrabold text-ink">
                  🎬 ناشر تيك توك الذكي · تحويل الأخبار المنشورة إلى فيديو AI
                </h3>
                <p className="text-xs font-semibold text-muted">
                  اختر أي خبر منشور في الموقع وسيقوم المحرك بتوليد فيديو عمودي متحرك مع تعليق صوتي
                  ومؤثرات بصرية وترجمة حركية جاهز للنشر على تيك توك وريلز!
                </p>
              </div>
            </div>

            {/* Article Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-ink">
                1. اختر خبراً منشوراً لتحويله تلقائياً إلى سيناريو فيديو:
              </label>
              <select
                value={selectedArticleIdx}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setSelectedArticleIdx(idx);
                  const art = sampleArticles[idx];
                  if (art) {
                    setVideoHeadline(art.title);
                    setVideoSummary(art.summary);
                    setVideoBadge(art.category || "عاجل · رهط بوست");
                  }
                }}
                className="field text-sm font-bold"
              >
                {sampleArticles.map((a, i) => (
                  <option key={a.slug + i} value={i}>
                    📰 {a.title.slice(0, 75)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-extrabold text-ink">
                  شارة الفيديو العلوية
                </span>
                <input
                  type="text"
                  value={videoBadge}
                  onChange={(e) => setVideoBadge(e.target.value)}
                  className="field text-xs font-bold"
                  placeholder="عاجل · رهط بوست"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-extrabold text-ink">
                  نمط التصميم البصري (AI Visual Style)
                </span>
                <select
                  value={videoTheme}
                  onChange={(e) => setVideoTheme(e.target.value as typeof videoTheme)}
                  className="field text-xs font-bold"
                >
                  <option value="gold-night">🌙 استوديو رهط بوست الذهبي الفاخر</option>
                  <option value="breaking-red">🚨 عاجل إخباري أحمر وذهبي</option>
                  <option value="cyber-neon">⚡ نيون تيك توك عصري (Cyber Neon)</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-extrabold text-ink">
                العنوان الرئيسي في الفيديو (يظهر بكتابة حركية متدرجة)
              </span>
              <textarea
                rows={2}
                value={videoHeadline}
                onChange={(e) => setVideoHeadline(e.target.value)}
                className="field text-sm font-bold"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-extrabold text-ink">
                ملخص الخبر / النص الصوتي والترجمة السفلية (TikTok Captions)
              </span>
              <textarea
                rows={3}
                value={videoSummary}
                onChange={(e) => setVideoSummary(e.target.value)}
                className="field text-xs font-bold"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-3">
                <span className="text-xs font-extrabold text-ink">
                  🔊 دمج الصوت الإخباري والقراءة الصوتية الذكية
                </span>
                <input
                  type="checkbox"
                  checked={withVoiceAndSound}
                  onChange={(e) => setWithVoiceAndSound(e.target.checked)}
                  className="size-5 accent-[#d9a92a]"
                />
              </label>

              <label className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-3">
                <span className="text-xs font-extrabold text-ink">⏱️ مدة الفيديو:</span>
                <select
                  value={videoDurationSec}
                  onChange={(e) => setVideoDurationSec(Number(e.target.value))}
                  className="rounded-xl border border-line bg-paper px-2.5 py-1 text-xs font-extrabold"
                >
                  <option value={6}>6 ثوانٍ (سريع)</option>
                  <option value={8}>8 ثوانٍ (قياسي لتيك توك)</option>
                  <option value={12}>12 ثانية (مفصّل)</option>
                </select>
              </label>
            </div>

            {/* Generate & Publish Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isGeneratingVideo}
                onClick={() => void handleGenerateAiTikTokVideo()}
                className="btn flex-1 bg-gradient-to-r from-[#f2c94c] via-[#f59e0b] to-[#f2c94c] text-[#111827] shadow-md"
              >
                {isGeneratingVideo
                  ? `⏳ جاري صناعة الفيديو بالذكاء الاصطناعي (${videoProgress}%)…`
                  : "🎬 صناعة وتوليد فيديو تيك توك AI الآن"}
              </button>

              <a
                href="https://www.tiktok.com/tiktokstudio/upload"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0f1419] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:opacity-90"
              >
                🎵 فتح استوديو رفع تيك توك ↗
              </a>
            </div>

            {generatedVideoUrl ? (
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4">
                <p className="text-xs font-extrabold text-emerald-800">
                  ✅ الفيديو جاهز! يمكنك تحميله مباشرة ورفعه على حساب تيك توك ({tiktokHandle}) أو ريلز فيسبوك:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={generatedVideoUrl}
                    download={`rahatpost-tiktok-${Date.now()}.webm`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                  >
                    ⬇️ تحميل ملف الفيديو (9:16 HD)
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const desc = `${videoHeadline}\n\n${videoSummary}\n\nتابعونا عبر موقع وتطبيق رهط بوست 🌐\n#رهط_بوست #رهط #النقب #أخبار_رهط #تيك_توك`;
                      void navigator.clipboard?.writeText(desc);
                      showToastMsg("📋 تم نسخ وصف الفيديو والهاشتاجات الجاهزة لتيك توك!");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-extrabold text-ink"
                  >
                    📋 نسخ الوصف والهاشتاجات لتيك توك
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Live 9:16 Vertical TikTok Canvas Preview Column */}
          <div className="stamp flex flex-col items-center justify-center p-5 lg:col-span-5">
            <p className="mb-2 text-xs font-extrabold text-muted">
              📱 معاينة حية للفيديو العمودي (9:16 TikTok & Reels)
            </p>
            <div className="relative overflow-hidden rounded-[2rem] border-4 border-[#111827] bg-black shadow-2xl">
              <canvas
                ref={canvasRef}
                width={540}
                height={960}
                className="block h-[460px] w-[258px] object-cover sm:h-[520px] sm:w-[292px]"
              />
            </div>
            {generatedVideoUrl ? (
              <div className="mt-4 w-full max-w-[292px]">
                <p className="mb-1 text-center text-[11px] font-extrabold text-emerald-700">
                  ▶️ تشغيل الفيديو المسجّل:
                </p>
                <video
                  src={generatedVideoUrl}
                  controls
                  playsInline
                  className="w-full rounded-2xl border border-line bg-black"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* =====================================================================
       * SUB-TAB 3: قسم «تواصل اجتماعي» (المشاهير والسياسيون + التريند العالمي والمحلي)
       * ===================================================================== */}
      {subTab === "vip-feed" ? (
        <div className="space-y-6">
          <div className="stamp p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  🌐 التحكم بقسم «تواصل اجتماعي · المشاهير والسياسيون والتريند»
                </h3>
                <p className="mt-1 text-xs font-semibold text-muted">
                  يعرض آخر منشورات وتغريدات المشاهير والسياسيين بتصميم فيسبوك وإكس مع زر الترجمة
                  الفورية وعدد التعليقات والتفاعل وزر التريند العالمي والمحلي (مخفي افتراضياً لحين تفعيله).
                </p>
              </div>

              {/* Master Activation Switch (مخفي لحين تفعيله) */}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const nextVal = !vipEnabled;
                  setVipEnabled(nextVal);
                  void persistSocialHubSettings(
                    { vip: nextVal },
                    nextVal
                      ? "✅ تم تفعيل وإظهار قسم «تواصل اجتماعي» في الواجهة الرئيسية!"
                      : "🔒 تم إخفاء قسم «تواصل اجتماعي» عن الزوار.",
                  );
                }}
                className={`inline-flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-sm transition ${
                  vipEnabled
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-primary text-[#111827] hover:bg-primary-hover"
                }`}
              >
                <span>{vipEnabled ? "✅ القسم مفعّل وظاهر الآن" : "🔒 القسم مخفي حالياً — اضغط لتفعيله"}</span>
              </button>
            </div>

            {/* Trend Default Scope + Add Custom Celebrity/Politician Post */}
            <div className="mt-4 grid gap-6 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-5">
                <h4 className="text-sm font-extrabold text-ink">⚙️ إعدادات التريند الافتراضية</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTrendScope("local");
                      void persistSocialHubSettings({ scope: "local" });
                    }}
                    className={`flex-1 rounded-2xl border p-3 text-xs font-extrabold transition ${
                      trendScope === "local"
                        ? "border-primary-deep bg-primary text-[#111827]"
                        : "border-line bg-surface text-ink"
                    }`}
                  >
                    📍 التريند المحلي افتراضياً (رهط والنقب والبلاد)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTrendScope("global");
                      void persistSocialHubSettings({ scope: "global" });
                    }}
                    className={`flex-1 rounded-2xl border p-3 text-xs font-extrabold transition ${
                      trendScope === "global"
                        ? "border-primary-deep bg-primary text-[#111827]"
                        : "border-line bg-surface text-ink"
                    }`}
                  >
                    🌍 التريند العالمي افتراضياً (Global Trends)
                  </button>
                </div>

                <div className="rounded-2xl border border-line bg-surface/70 p-3.5 text-xs font-semibold text-muted">
                  💡 عدد المنشورات والتغريدات المعروضة حالياً:{" "}
                  <strong className="text-ink">
                    {customVipPosts.length + DEFAULT_VIP_POSTS.length} منشور وتغريدة
                  </strong>{" "}
                  ({customVipPosts.length} مضافة يدوياً + {DEFAULT_VIP_POSTS.length} تلقائية).
                </div>
              </div>

              {/* Add New Celebrity / Politician Post Form */}
              <div className="space-y-3 rounded-2xl border border-line bg-surface/50 p-4 lg:col-span-7">
                <h4 className="text-sm font-extrabold text-ink">
                  ➕ إضافة تغريدة أو منشور جديد (للمشاهير أو السياسيين)
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as "x" | "facebook")}
                    className="field text-xs font-bold"
                  >
                    <option value="x">𝕏 منصة إكس (تويتر)</option>
                    <option value="facebook">📘 منصة فيسبوك</option>
                  </select>

                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
                    className="field text-xs font-bold"
                  >
                    <option value="politicians">🏛️ سياسيون</option>
                    <option value="celebrities">⭐ مشاهير</option>
                    <option value="sports">⚽ نجوم رياضة</option>
                    <option value="local">📍 شخصيات ومؤسسات محلية</option>
                  </select>

                  <select
                    value={newOriginalLang}
                    onChange={(e) => setNewOriginalLang(e.target.value as "he" | "en" | "ar")}
                    className="field text-xs font-bold"
                  >
                    <option value="he">لغة المنشور: عبرية (مع زر ترجمة)</option>
                    <option value="en">لغة المنشور: إنجليزية (مع زر ترجمة)</option>
                    <option value="ar">لغة المنشور: عربية</option>
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    placeholder="الاسم (مثال: بنيامين نتنياهو / محمد صلاح)"
                    className="field text-xs font-bold"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={newAuthorHandle}
                    onChange={(e) => setNewAuthorHandle(e.target.value)}
                    placeholder="@handle"
                    className="field text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={newAuthorRole}
                    onChange={(e) => setNewAuthorRole(e.target.value)}
                    placeholder="الصفة (سياسي / نجم رياضي)"
                    className="field text-xs font-bold"
                  />
                </div>

                <textarea
                  rows={2}
                  value={newOriginalText}
                  onChange={(e) => setNewOriginalText(e.target.value)}
                  placeholder="نص التغريدة أو المنشور الأصلي كما ظهر على فيسبوك أو تويتر…"
                  className="field text-xs font-bold"
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <textarea
                    rows={2}
                    value={newTranslatedAr}
                    onChange={(e) => setNewTranslatedAr(e.target.value)}
                    placeholder="الترجمة العربية (تظهر عند ضغط الزائر على زر «ترجمة إلى العربية»)…"
                    className="field text-xs font-bold sm:col-span-2"
                  />
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={newTrendTag}
                      onChange={(e) => setNewTrendTag(e.target.value)}
                      placeholder="هاشتاج التريند (#رهط_بوست)"
                      className="field text-xs font-bold"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (!newAuthorName.trim() || !newOriginalText.trim()) {
                          showToastMsg("يرجى إدخال اسم الشخصية ونص المنشور.");
                          return;
                        }
                        const initials = newAuthorName.trim().slice(0, 2).toUpperCase();
                        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#1e293b"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#f2c94c" font-family="sans-serif" font-weight="800" font-size="26">${initials}</text></svg>`;
                        const newItem: SocialVipPostItem = {
                          id: `custom-${Date.now()}`,
                          platform: newPlatform,
                          authorName: newAuthorName.trim(),
                          authorHandle: newAuthorHandle.trim() || "@official",
                          authorRole: newAuthorRole.trim() || "شخصية عامة",
                          category: newCategory,
                          avatarUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
                          verified: "blue",
                          publishedAgo: "الآن",
                          originalLang: newOriginalLang,
                          originalText: newOriginalText.trim(),
                          translatedAr: newTranslatedAr.trim() || newOriginalText.trim(),
                          trendTag: newTrendTag.trim() || "#رهط_بوست",
                          likes: 120,
                          commentsCount: 18,
                          shares: 24,
                          views: "4.2K",
                          sampleComments: [],
                        };
                        const nextList = [newItem, ...customVipPosts].slice(0, 15);
                        const encoded = toBase64UrlSafe(JSON.stringify(nextList));
                        const otherLinks = (draft.quickLinks ?? []).filter(
                          (q) => q.id !== "socialvipcustom",
                        );
                        const nextDraft: SiteSettings = {
                          ...draft,
                          quickLinks: [
                            ...otherLinks,
                            {
                              id: "socialvipcustom",
                              title: `count:${nextList.length}`,
                              subtitle: encoded.slice(180),
                              url: `/__svip?${encoded.slice(0, 180)}`,
                            },
                          ],
                        };
                        setDraft(nextDraft);
                        await saveNow(nextDraft, "تمت إضافة المنشور إلى قسم تواصل اجتماعي ✓");
                        setNewAuthorName("");
                        setNewOriginalText("");
                        setNewTranslatedAr("");
                        showToastMsg("تمت إضافة المنشور بنجاح ✓");
                      }}
                      className="btn min-h-10 text-xs"
                    >
                      ➕ إضافة وحفظ المنشور
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Admin Preview of SocialVipFeedAndTrendsSection */}
          <div className="space-y-2">
            <p className="text-xs font-extrabold text-muted">
              👁️ معاينة حية لقسم «تواصل اجتماعي» كما يظهر عند تفعيله:
            </p>
            <SocialVipFeedAndTrendsSection forceShowForAdminPreview />
          </div>
        </div>
      ) : null}

      {/* =====================================================================
       * SUB-TAB 4: أنيميشن ومظهر الطقس وأوقات الصلاة (/today) + الأمان والحماية
       * ===================================================================== */}
      {subTab === "weather-security" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Weather & Prayer Times Animation & Style Selector */}
          <div className="stamp space-y-4 p-5 lg:col-span-7">
            <h3 className="text-lg font-extrabold text-ink">
              🌧️ مظهر وأنيميشن «الطقس وأوقات الصلاة في رهط» (`/today` والواجهة الرئيسية)
            </h3>
            <p className="text-xs font-semibold text-muted">
              اختر شكل بطاقة الطقس ومواقيت الصلاة وتأثير أنيميشن المطر المتحرك في صفحة `/today` والشريط العلوي:
            </p>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {(
                [
                  {
                    id: "scene-animated",
                    title: "🌧️ المشهد الجوي المتحرك بالأمطار (الافتراضي)",
                    desc: "سماء تفاعلية مع قطرات مطر متحركة وسحب ووهج لمواقيت الصلاة",
                  },
                  {
                    id: "mosque-gold",
                    title: "🕌 المظهر الذهبي الفاخر لمواقيت الصلاة",
                    desc: "تصميم ذهبي داكن فاخر يبرز الصلاة القادمة والطقس",
                  },
                  {
                    id: "glass-modern",
                    title: "✨ المظهر الزجاجي الشفاف (Glassmorphism)",
                    desc: "بطاقات زجاجية عصرية مع أنيميشن قطرات المطر",
                  },
                  {
                    id: "night-radar",
                    title: "📊 اللوحة الرقمية والرادار الجوي الليلي",
                    desc: "لوحة أرصاد جوية داكنة عالية التباين",
                  },
                  {
                    id: "compact-unified",
                    title: "🔗 اللوحة الموحّدة المدمجة",
                    desc: "دمج الطقس ومواقيت الصلاة في مشهد متناسق",
                  },
                  {
                    id: "split-cards",
                    title: "🃏 البطاقات الكلاسيكية المطوّرة",
                    desc: "بطاقات منفصلة واضحة مع شريط الساعات القادمة",
                  },
                ] as { id: WeatherPrayerVisualStyle; title: string; desc: string }[]
              ).map((item) => {
                const active = weatherCfg.style === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void persistWeatherStyle(item.id, weatherCfg.fx)}
                    className={`flex flex-col items-start rounded-2xl border p-3.5 text-start transition ${
                      active
                        ? "border-primary-deep bg-primary text-[#111827] shadow-sm"
                        : "border-line bg-surface hover:border-primary-deep"
                    }`}
                  >
                    <span className="text-xs font-extrabold">{item.title}</span>
                    <span className="mt-1 text-[11px] font-semibold opacity-80">{item.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <p className="mb-2 text-xs font-extrabold text-ink">
                🌦️ التحكم بحالة أنيميشن المطر والطقس:
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "auto", label: "🤖 تلقائي حسب طقس رهط الحقيقي" },
                    { id: "rain", label: "🌧️ تفعيل أنيميشن المطر دائماً" },
                    { id: "storm", label: "⛈️ أنيميشن أمطار وبرق" },
                    { id: "clear", label: "☀️ أجواء مشمسة صافية" },
                    { id: "night", label: "🌙 أجواء ليلية ونجوم" },
                  ] as { id: WeatherFxOverride; label: string }[]
                ).map((fxOpt) => (
                  <button
                    key={fxOpt.id}
                    type="button"
                    onClick={() => void persistWeatherStyle(weatherCfg.style, fxOpt.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                      weatherCfg.fx === fxOpt.id
                        ? "border-sky-500 bg-sky-500 text-white shadow-xs"
                        : "border-line bg-paper text-ink hover:border-sky-400"
                    }`}
                  >
                    {fxOpt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Security & Copyright Protection Status Card */}
          <div className="stamp space-y-4 p-5 lg:col-span-5">
            <div className="flex items-center gap-2.5 border-b border-line pb-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-emerald-600 text-lg text-white">
                🛡️
              </span>
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  درع الأمان وحماية حقوق رهط بوست
                </h3>
                <p className="text-xs font-semibold text-muted">
                  تأمين الملفات والـ API وحفظ حقوق الملكية الفكرية للموقع والتطبيق
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs font-bold text-ink">
              <li className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-emerald-800">
                <span>✅</span>
                <span>حماية الصور والشعارات من السحب والسرقة (`user-drag: none`) مفعّلة</span>
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-emerald-800">
                <span>✅</span>
                <span>إرفاق رابط وحقوق «رهط بوست» تلقائياً عند نسخ أي نص من المقالات</span>
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-emerald-800">
                <span>✅</span>
                <span>تأمين مسارات الـ API ورفع الملفات (`X-Content-Type-Options`, `CSP`, `SameOrigin`)</span>
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-emerald-800">
                <span>✅</span>
                <span>بصمة ملكية فكرية رسمية محفوظة لموقع وتطبيق `rahatpost.com`</span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Draws a single 60fps animated frame on the 9:16 TikTok AI Video Canvas */
function drawAiTikTokFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: {
    headline: string;
    summary: string;
    badge: string;
    theme: "breaking-red" | "gold-night" | "cyber-neon";
    tiktokHandle: string;
    elapsedSec: number;
    totalSec: number;
  },
) {
  const { headline, summary, badge, theme, tiktokHandle, elapsedSec, totalSec } = opts;
  const progress = Math.min(1, Math.max(0, elapsedSec / Math.max(1, totalSec)));

  // 1. Dynamic Animated Background Gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (theme === "breaking-red") {
    grad.addColorStop(0, "#1a0505");
    grad.addColorStop(0.5, "#450a0a");
    grad.addColorStop(1, "#0f172a");
  } else if (theme === "cyber-neon") {
    grad.addColorStop(0, "#090d16");
    grad.addColorStop(0.5, "#0f2942");
    grad.addColorStop(1, "#1e1b4b");
  } else {
    grad.addColorStop(0, "#0b1120");
    grad.addColorStop(0.5, "#151f32");
    grad.addColorStop(1, "#0f172a");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2. Animated Radar / Studio Rings
  ctx.save();
  ctx.strokeStyle =
    theme === "breaking-red"
      ? "rgba(239, 68, 68, 0.16)"
      : theme === "cyber-neon"
        ? "rgba(56, 189, 248, 0.16)"
        : "rgba(242, 201, 76, 0.15)";
  ctx.lineWidth = 2;
  for (let r = 1; r <= 4; r++) {
    const radius = ((elapsedSec * 45 + r * 95) % 420) + 40;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.34, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Top Brand Header Bar (رهط بوست · RAHAT POST)
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  roundRect(ctx, 32, 48, w - 64, 72, 22);
  ctx.fill();

  ctx.fillStyle = "#f2c94c";
  roundRect(ctx, w - 104, 60, 56, 48, 14);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = "900 18px Tahoma, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("رهط", w - 76, 82);
  ctx.font = "800 13px Tahoma, Arial, sans-serif";
  ctx.fillText("بوست", w - 76, 99);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "right";
  ctx.font = "800 22px Tahoma, Arial, sans-serif";
  ctx.fillText("منصة رهط بوست الإخبارية", w - 118, 82);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 14px Tahoma, Arial, sans-serif";
  ctx.fillText(`RAHATPOST.COM · ${tiktokHandle}`, w - 118, 104);
  ctx.restore();

  // 4. Breaking / Category Pill with Pulse
  const pulse = 1 + Math.sin(elapsedSec * 6) * 0.03;
  ctx.save();
  ctx.translate(w / 2, 175);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = theme === "breaking-red" ? "#dc2626" : "#f2c94c";
  roundRect(ctx, -150, -24, 300, 48, 24);
  ctx.fill();
  ctx.fillStyle = theme === "breaking-red" ? "#ffffff" : "#111827";
  ctx.font = "900 22px Tahoma, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`🔴 ${badge}`, 0, 8);
  ctx.restore();

  // 5. Main Headline Card with Kinetic Word Reveal
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.strokeStyle = "rgba(242, 201, 76, 0.45)";
  ctx.lineWidth = 2.5;
  roundRect(ctx, 32, 235, w - 64, 310, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 31px Tahoma, Arial, sans-serif";
  ctx.textAlign = "center";
  const headLines = wrapArabicLines(ctx, headline, w - 110);
  headLines.slice(0, 5).forEach((line, idx) => {
    const lineAppear = Math.min(1, Math.max(0, (elapsedSec - idx * 0.22) * 2.5));
    ctx.globalAlpha = lineAppear;
    ctx.fillText(line, w / 2, 300 + idx * 50);
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  // 6. Summary / AI Captions Box
  ctx.save();
  ctx.fillStyle = "rgba(242, 201, 76, 0.14)";
  roundRect(ctx, 36, 575, w - 72, 195, 24);
  ctx.fill();

  ctx.fillStyle = "#fde68a";
  ctx.font = "700 22px Tahoma, Arial, sans-serif";
  ctx.textAlign = "center";
  const sumLines = wrapArabicLines(ctx, summary, w - 112);
  sumLines.slice(0, 4).forEach((line, idx) => {
    ctx.fillText(line, w / 2, 622 + idx * 38);
  });
  ctx.restore();

  // 7. Audio Waveform Bars Animation
  ctx.save();
  const bars = 24;
  const barW = 8;
  const gap = 6;
  const totalBarsW = bars * (barW + gap);
  const startX = (w - totalBarsW) / 2;
  for (let i = 0; i < bars; i++) {
    const barH = 10 + Math.abs(Math.sin(elapsedSec * 8 + i * 0.55)) * 36;
    ctx.fillStyle = i % 2 === 0 ? "#f2c94c" : "#38bdf8";
    roundRect(ctx, startX + i * (barW + gap), 815 - barH / 2, barW, barH, 4);
    ctx.fill();
  }
  ctx.restore();

  // 8. Bottom Call-To-Action & Progress Bar
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 20px Tahoma, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("تابعوا التفاصيل الكاملة عبر تطبيق وموقع رهط بوست", w / 2, 885);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  roundRect(ctx, 40, 912, w - 80, 12, 6);
  ctx.fill();

  ctx.fillStyle = "#f2c94c";
  roundRect(ctx, 40, 912, Math.max(16, (w - 80) * progress), 12, 6);
  ctx.fill();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapArabicLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = (text || "").trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
