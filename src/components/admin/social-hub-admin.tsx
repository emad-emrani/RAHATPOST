import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_VIP_POSTS,
  SocialVipFeedAndTrendsSection,
  encodeLocalTrackedFigures,
  makeAvatarSvgDataUri,
  parseCustomVipPosts,
  parseLocalTrackedFigures,
  parseSocialHubConfig,
  toBase64UrlSafe,
  type LocalTrackedFigure,
  type SocialVipPostItem,
  WORLD_VIP_PRESETS,
} from "@/components/social-vip-feed";
import { adminListAutoNews } from "@/lib/news/auto-admin";
import type { SiteSettings } from "@/lib/site-settings/types";

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
  const [subTab, setSubTab] = useState<"tiktok-ai" | "vip-feed" | "local-figures" | "pages">("tiktok-ai");
  const [toast, setToast] = useState<string>("");

  const hubCfg = useMemo(() => parseSocialHubConfig(draft.quickLinks), [draft.quickLinks]);
  const customVipPosts = useMemo(() => parseCustomVipPosts(draft.quickLinks), [draft.quickLinks]);
  const localFigures = useMemo(() => parseLocalTrackedFigures(draft.quickLinks), [draft.quickLinks]);

  const [fbPageName, setFbPageName] = useState(hubCfg.fbPageName);
  const [fbPageUrl, setFbPageUrl] = useState(hubCfg.fbPageUrl);
  const [fbPageId, setFbPageId] = useState(hubCfg.fbPageId);
  const [fbAutoPublish, setFbAutoPublish] = useState(hubCfg.fbAutoPublish);
  const [tiktokHandle, setTiktokHandle] = useState(hubCfg.tiktokHandle);
  const [telegramChannel, setTelegramChannel] = useState(hubCfg.telegramChannel);
  const [vipEnabled, setVipEnabled] = useState(hubCfg.vipSectionEnabled);
  const [trendScope, setTrendScope] = useState<"local" | "global">(hubCfg.defaultTrendScope);

  // Local Figures State
  const [newFigName, setNewFigName] = useState("");
  const [newFigFbUrl, setNewFigFbUrl] = useState("");
  const [newFigRole, setNewFigRole] = useState("شخصية ومؤسسة في رهط");

  // Custom VIP Post State
  const [newPlatform, setNewPlatform] = useState<"x" | "facebook">("facebook");
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorHandle, setNewAuthorHandle] = useState("");
  const [newAuthorRole, setNewAuthorRole] = useState("شخصية عامة في رهط والنقب");
  const [newCategory, setNewCategory] = useState<"politicians" | "celebrities" | "sports" | "local">("local");
  const [newOriginalLang, setNewOriginalLang] = useState<"he" | "en" | "ar">("ar");
  const [newOriginalText, setNewOriginalText] = useState("");
  const [newTranslatedAr, setNewTranslatedAr] = useState("");
  const [newTrendTag, setNewTrendTag] = useState("#رهط_بوست");

  // AI Video Studio State (TikTok + Facebook Reels + Instagram Reels)
  const [fetchedArticles, setFetchedArticles] = useState<PublishableArticleItem[]>([]);
  const [isFetchingArticles, setIsFetchingArticles] = useState<boolean>(false);
  const [videoPlatform, setVideoPlatform] = useState<"all" | "tiktok" | "facebook" | "instagram">("all");
  const [captionCopyNotice, setCaptionCopyNotice] = useState<string>("");

  const sampleArticles: PublishableArticleItem[] = useMemo(
    () => [
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
    ],
    [],
  );

  const combinedArticles: PublishableArticleItem[] = useMemo(() => {
    const list: PublishableArticleItem[] = [];
    const seen = new Set<string>();
    for (const a of [...fetchedArticles, ...(articles || [])]) {
      if (a && a.title && !seen.has(a.slug || a.title)) {
        seen.add(a.slug || a.title);
        list.push(a);
      }
    }
    return list.length > 0 ? list : sampleArticles;
  }, [fetchedArticles, articles, sampleArticles]);

  const [selectedArticleIdx, setSelectedArticleIdx] = useState(0);
  const [videoHeadline, setVideoHeadline] = useState(sampleArticles[0]?.title ?? "");
  const [videoSummary, setVideoSummary] = useState(sampleArticles[0]?.summary ?? "");
  const [videoBadge, setVideoBadge] = useState(sampleArticles[0]?.category ?? "عاجل · رهط بوست");
  const [videoTheme, setVideoTheme] = useState<"breaking-red" | "gold-night" | "cyber-neon">("breaking-red");
  const [videoDurationSec, setVideoDurationSec] = useState<number>(12);
  const [withVoiceAndSound, setWithVoiceAndSound] = useState<boolean>(true);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleFetchFreshNews = async () => {
    setIsFetchingArticles(true);
    try {
      const res = await adminListAutoNews();
      if (res && res.items && res.items.length > 0) {
        const mapped: PublishableArticleItem[] = res.items
          .filter((it) => !it.ov?.hidden)
          .map((it) => {
            const rawTitle = it.ov?.title || it.title;
            const category = it.ov?.category || it.category || "أخبار رهط";
            const summary = it.titleHe
              ? `متابعة إخبارية عاجلة ومحدثة من مصادر الإعلام: ${rawTitle} مع ترجمة فورية ورصد لأبرز التطورات الميدانية في النقب والجنوب.`
              : `تغطية إخبارية مفصلة ومباشرة من طاقم منصة وتطبيق رهط بوست لأهم المستجدات والتطورات الميدانية.`;
            return {
              slug: it.slug,
              title: rawTitle,
              summary,
              category,
              publishedAt: it.publishedAt,
            };
          });
        if (mapped.length > 0) {
          setFetchedArticles(mapped);
          setSelectedArticleIdx(0);
          setVideoHeadline(mapped[0].title);
          setVideoSummary(mapped[0].summary);
          setVideoBadge(mapped[0].category || "عاجل · رهط بوست");
          showToastMsg(`✅ تم جلب ${mapped.length} خبراً جديداً منشوراً من الموقع بنجاح!`);
        }
      }
    } catch {
      /* fallback to combinedArticles */
    } finally {
      setIsFetchingArticles(false);
    }
  };

  useEffect(() => {
    void handleFetchFreshNews();
  }, []);

  const handleCopyCaptions = (target: "all" | "tiktok" | "facebook" | "instagram") => {
    const cleanHeadline = videoHeadline.trim();
    const cleanSummary = videoSummary.trim();
    let text = `🚨 ${videoBadge}\n\n📢 ${cleanHeadline}\n\n🔹 ${cleanSummary}\n\n🌐 لمزيد من التفاصيل تابعوا منصة وتطبيق رهط بوست:\nhttps://www.rahatpost.com\n\n`;
    if (target === "tiktok") {
      text += `#رهط #النقب #رهط_بوست #أخبار_رهط #بئر_السبع #تيك_توك #foryou #fyp #rahatpost`;
    } else if (target === "facebook") {
      text += `#رهط_بوست #أخبار_رهط #رهط #النقب #بئر_السبع #ريلز #فيسبوك_ريلز #rahatpost`;
    } else if (target === "instagram") {
      text += `#rahatpost #rahat #negev #reels #instagramreels #explore #رهط #النقب #رهط_بوست`;
    } else {
      text += `#رهط #النقب #رهط_بوست #أخبار_رهط #بئر_السبع #تيك_توك #ريلز #rahatpost #explore #fyp`;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCaptionCopyNotice("📋 تم نسخ الوصف والهاشتاجات بنجاح!");
      setTimeout(() => setCaptionCopyNotice(""), 3500);
      showToastMsg("📋 تم نسخ الوصف والهاشتاجات!");
    }
  };

  // Continuous live preview animation on the 9:16 canvas
  useEffect(() => {
    if (subTab !== "tiktok-ai") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTs = performance.now();
    let active = true;

    const renderFrame = (nowTs: number) => {
      if (!active) return;
      const elapsedSec = ((nowTs - startTs) / 1000) % Math.max(1, videoDurationSec);
      drawAiTikTokFrame(ctx, canvas.width, canvas.height, {
        headline: videoHeadline || "رهط بوست · أخبار رهط والنقب أولاً بأول",
        summary: videoSummary || "تابعوا التغطية الكاملة والحصرية عبر موقع وتطبيق رهط بوست",
        badge: videoBadge || "عاجل · رهط بوست",
        theme: videoTheme,
        tiktokHandle: tiktokHandle || "@rahatpost",
        elapsedSec,
        totalSec: videoDurationSec,
        platform: videoPlatform,
      });
      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      active = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [subTab, videoHeadline, videoSummary, videoBadge, videoTheme, tiktokHandle, videoDurationSec, videoPlatform]);

  const handleGenerateAiTikTokVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setVideoProgress(0);
    if (generatedVideoUrl) {
      URL.revokeObjectURL(generatedVideoUrl);
      setGeneratedVideoUrl("");
    }

    try {
      const stream = canvas.captureStream(30);
      let audioCtx: AudioContext | null = null;

      if (withVoiceAndSound && typeof window !== "undefined") {
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            audioCtx = new AudioCtx();
            const dest = audioCtx.createMediaStreamDestination();
            const nowAudio = audioCtx.currentTime;
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
            dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
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
        mimeTypes.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) || "";

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
          if (elapsed >= totalMs) resolve();
          else setTimeout(step, 80);
        };
        step();
      });

      recorder.stop();
      if (audioCtx) void audioCtx.close().catch(() => {});
      const url = await donePromise;
      setGeneratedVideoUrl(url);
      showToastMsg("🎬 تم توليد فيديو 9:16 بالذكاء الاصطناعي بنجاح!");
    } catch {
      showToastMsg("تعذّر تسجيل الفيديو في هذا المتصفح.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const persistSocialHubSettings = async () => {
    const titlePart = `vip:${vipEnabled ? "1" : "0"}|scope:${trendScope}|open:1`;
    const subPart = `fbauto:${fbAutoPublish ? "1" : "0"}|fbid:${fbPageId.trim()}|tt:${tiktokHandle.trim()}`;
    const urlPayload = `/__shcfg?${toBase64UrlSafe(
      JSON.stringify({
        fbPageName: fbPageName.trim(),
        fbPageUrl: fbPageUrl.trim(),
        telegramChannel: telegramChannel.trim(),
      }),
    )}`;
    const others = (draft.quickLinks ?? []).filter((q) => q.id !== "socialhubcfg");
    const next: SiteSettings = {
      ...draft,
      quickLinks: [
        ...others,
        { id: "socialhubcfg", title: titlePart, subtitle: subPart, url: urlPayload },
      ],
    };
    setDraft(next);
    await saveNow(next, "تم حفظ إعدادات التواصل والتريند ✓");
    showToastMsg("✅ تم حفظ الإعدادات بنجاح!");
  };

  const handleAddCustomPost = async () => {
    if (!newAuthorName.trim() || !newOriginalText.trim()) return;
    const item: SocialVipPostItem = {
      id: `custom-${Date.now()}`,
      platform: newPlatform,
      authorName: newAuthorName.trim(),
      authorHandle: newAuthorHandle.trim() || "@rahatpost",
      authorRole: newAuthorRole.trim(),
      authorAvatar: makeAvatarSvgDataUri(newAuthorName.trim().slice(0, 2), newPlatform === "x" ? "#0f1419" : "#1877F2"),
      verified: true,
      category: newCategory,
      originalLang: newOriginalLang,
      originalText: newOriginalText.trim(),
      translatedAr: (newTranslatedAr.trim() || newOriginalText.trim()),
      publishedAgoAr: "الآن",
      likesCount: "120",
      commentsCount: "18",
      sharesCount: "9",
      sourceUrl: "https://www.rahatpost.com/social",
      trendTag: newTrendTag.trim() || "#رهط_بوست",
      sampleComments: [],
    };
    const nextList = [item, ...customVipPosts];
    const others = (draft.quickLinks ?? []).filter((q) => q.id !== "socialvipposts");
    const next: SiteSettings = {
      ...draft,
      quickLinks: [
        ...others,
        {
          id: "socialvipposts",
          title: "Custom Social Posts",
          subtitle: `${nextList.length}`,
          url: `/__svip?${toBase64UrlSafe(JSON.stringify(nextList))}`,
        },
      ],
    };
    setDraft(next);
    await saveNow(next, "تم نشر المنشور في صفحة التواصل ✓");
    setNewAuthorName("");
    setNewOriginalText("");
    setNewTranslatedAr("");
    showToastMsg("✅ تم إضافة المنشور بنجاح!");
  };

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-extrabold text-emerald-800">
          {toast}
        </div>
      ) : null}

      {/* Top Navigation Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-[#0f172a] via-[#1e293b] to-[#0f172a] p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">
              🎬 استوديو الفيديو الذكي AI وإدارة التواصل والتريند
            </h2>
            <p className="mt-1 text-xs font-semibold text-white/75">
              صناعة فيديوهات أنيميشن إخبارية 9:16 لـ (تيك توك · فيسبوك ريلز · إنستغرام) وإدارة صفحة التواصل والتريند
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: "tiktok-ai", label: "🎬 استوديو الفيديو بالذكاء الاصطناعي (تيك توك · فيسبوك · إنستغرام)" },
            { id: "vip-feed", label: "🌐 إدارة منشورات وتريند المشاهير والسياسيين" },
            { id: "local-figures", label: `👥 شخصيات ومؤسسات رهط (${localFigures.length})` },
            { id: "pages", label: "📘 ربط الحسابات والصفحات" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as typeof subTab)}
              className={`rounded-2xl px-4 py-2 text-xs font-extrabold transition ${
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

      {/* SUB-TAB 1: AI VIDEO STUDIO */}
      {subTab === "tiktok-ai" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="stamp space-y-4 p-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black text-ink sm:text-lg">
                  <span>🎬 استوديو الفيديو الذكي AI</span>
                  <span className="rounded-full bg-primary/25 px-2.5 py-0.5 text-[11px] font-extrabold text-primary-ink">
                    تيك توك + ريلز فيسبوك وإنستغرام
                  </span>
                </h3>
                <p className="mt-0.5 text-xs font-bold text-muted">
                  جلب أحدث الأخبار المنشورة في الموقع وتحويلها إلى فيديو أنيميشن مفصل (9:16 HD).
                </p>
              </div>
              <button
                type="button"
                disabled={isFetchingArticles}
                onClick={() => void handleFetchFreshNews()}
                className="btn border border-primary bg-primary/15 px-3 py-1.5 text-xs font-extrabold text-ink"
              >
                {isFetchingArticles ? "⏳ جاري التحديث…" : "🔄 جلب الأخبار المنشورة الآن"}
              </button>
            </div>

            {/* Platform Target Selector */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: "all", label: "🌐 كل المنصات", desc: "تيك توك + ريلز" },
                { id: "tiktok", label: "🎵 تيك توك", desc: "TikTok Studio" },
                { id: "facebook", label: "📘 فيسبوك ريلز", desc: "FB Reels" },
                { id: "instagram", label: "📸 إنستغرام", desc: "Insta Reels" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setVideoPlatform(p.id as typeof videoPlatform)}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                    videoPlatform === p.id
                      ? "border-primary bg-primary/20 font-black text-ink"
                      : "border-line bg-surface font-bold text-muted"
                  }`}
                >
                  <span className="text-xs">{p.label}</span>
                  <span className="text-[10px] opacity-75">{p.desc}</span>
                </button>
              ))}
            </div>

            {/* Article Dropdown */}
            <div>
              <label className="mb-1 block text-xs font-extrabold text-ink">
                اختر خبراً منشوراً لتحويله إلى فيديو ({combinedArticles.length} خبر متاح):
              </label>
              <select
                value={selectedArticleIdx}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setSelectedArticleIdx(idx);
                  const a = combinedArticles[idx];
                  if (a) {
                    setVideoHeadline(a.title);
                    setVideoSummary(a.summary);
                    setVideoBadge(a.category || "عاجل · رهط بوست");
                  }
                }}
                className="field text-xs font-extrabold"
              >
                {combinedArticles.map((a, i) => (
                  <option key={i} value={i}>
                    {i + 1}. [{a.category || "عام"}] {a.title.slice(0, 80)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-extrabold text-ink">عنوان الخبر في الفيديو:</label>
                <textarea
                  rows={2}
                  value={videoHeadline}
                  onChange={(e) => setVideoHeadline(e.target.value)}
                  className="field text-xs font-extrabold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-extrabold text-ink">شارة التصنيف:</label>
                <input
                  type="text"
                  value={videoBadge}
                  onChange={(e) => setVideoBadge(e.target.value)}
                  className="field text-xs font-extrabold"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-extrabold text-ink">
                تفاصيل الخبر والأنيميشن (تظهر كنقاط وموجز متحرك وشريط عاجل):
              </label>
              <textarea
                rows={3}
                value={videoSummary}
                onChange={(e) => setVideoSummary(e.target.value)}
                className="field text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-extrabold text-ink">مظهر الفيديو:</label>
                <select
                  value={videoTheme}
                  onChange={(e) =>
                    setVideoTheme(e.target.value as "breaking-red" | "gold-night" | "cyber-neon")
                  }
                  className="field text-xs font-extrabold"
                >
                  <option value="breaking-red">🔴 أحمر عاجل (Breaking Red)</option>
                  <option value="gold-night">🌙 ليلي ذهبي (Gold Night)</option>
                  <option value="cyber-neon">⚡ سايبر نيون (Cyber Neon)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-extrabold text-ink">مدة الفيديو:</label>
                <select
                  value={videoDurationSec}
                  onChange={(e) => setVideoDurationSec(Number(e.target.value))}
                  className="field text-xs font-extrabold"
                >
                  <option value={8}>8 ثوانٍ (سريع)</option>
                  <option value={12}>12 ثانية (مفصل - موصى به)</option>
                  <option value={16}>16 ثانية (تغطية موسعة)</option>
                </select>
              </div>
              <div className="col-span-2 flex items-end sm:col-span-1">
                <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface p-2 text-xs font-extrabold text-ink">
                  <input
                    type="checkbox"
                    checked={withVoiceAndSound}
                    onChange={(e) => setWithVoiceAndSound(e.target.checked)}
                  />
                  <span>🔊 نغمة وبث صوتي AI</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={isGeneratingVideo}
              onClick={() => void handleGenerateAiTikTokVideo()}
              className="btn w-full bg-primary py-3 text-sm font-black text-[#111827] shadow-md"
            >
              {isGeneratingVideo
                ? `⏳ جاري توليد الفيديو بالذكاء الاصطناعي (${videoProgress}%)…`
                : "🎬 توليد وصناعة فيديو 9:16 HD متحرك الآن"}
            </button>

            {generatedVideoUrl ? (
              <div className="space-y-3 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-emerald-800">
                    ✅ الفيديو جاهز للتحميل والنشر المباشر:
                  </span>
                  <a
                    href={generatedVideoUrl}
                    download={`rahatpost-${Date.now()}.webm`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white"
                  >
                    ⬇️ تحميل ملف الفيديو (9:16 HD)
                  </a>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCaptions("tiktok")}
                    className="btn border border-line bg-paper px-2.5 py-1 text-xs font-extrabold"
                  >
                    🎵 نسخ لتيك توك
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCaptions("facebook")}
                    className="btn border border-line bg-paper px-2.5 py-1 text-xs font-extrabold"
                  >
                    📘 نسخ لفيسبوك ريلز
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCaptions("instagram")}
                    className="btn border border-line bg-paper px-2.5 py-1 text-xs font-extrabold"
                  >
                    📸 نسخ لإنستغرام ريلز
                  </button>
                  {captionCopyNotice ? (
                    <span className="text-xs font-extrabold text-emerald-700">{captionCopyNotice}</span>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <a
                    href="https://www.tiktok.com/tiktokstudio/upload"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-black text-white"
                  >
                    🎵 نشر على تيك توك ↗
                  </a>
                  <a
                    href="https://www.facebook.com/reels/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1877F2] px-3 py-2 text-xs font-black text-white"
                  >
                    📘 نشر على فيسبوك ريلز ↗
                  </a>
                  <a
                    href="https://business.facebook.com/creatorstudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-3 py-2 text-xs font-black text-white"
                  >
                    📸 نشر على إنستغرام ريلز ↗
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          <div className="stamp flex flex-col items-center justify-center p-5 lg:col-span-5">
            <div className="mb-2 flex w-full max-w-[292px] items-center justify-between text-xs font-black text-ink">
              <span>🔴 معاينة حية للأنيميشن (9:16)</span>
              <span className="text-[11px] text-muted">540 × 960 HD</span>
            </div>
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              className="h-[510px] w-[286px] rounded-2xl border-2 border-line bg-black shadow-xl"
            />
          </div>
        </div>
      ) : null}

      {/* SUB-TAB 2: VIP FEED & TRENDS */}
      {subTab === "vip-feed" ? (
        <div className="space-y-4">
          <div className="stamp space-y-3 p-4">
            <h3 className="text-base font-extrabold text-ink">➕ إضافة منشور أو تغريدة جديدة (فيسبوك / 𝕏)</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value as "x" | "facebook")}
                className="field text-xs font-extrabold"
              >
                <option value="facebook">📘 منصة فيسبوك (أزرق)</option>
                <option value="x">𝕏 منصة إكس / تويتر (أسود)</option>
              </select>
              <input
                type="text"
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                placeholder="اسم الشخصية أو المؤسسة"
                className="field text-xs font-bold"
              />
              <input
                type="text"
                value={newAuthorHandle}
                onChange={(e) => setNewAuthorHandle(e.target.value)}
                placeholder="المعرّف مثل @RahatMuni"
                className="field text-xs font-bold"
              />
            </div>
            <textarea
              rows={2}
              value={newOriginalText}
              onChange={(e) => setNewOriginalText(e.target.value)}
              placeholder="نص المنشور أو التغريدة..."
              className="field text-xs font-bold"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAddCustomPost()}
              className="btn bg-primary px-5 py-2 text-xs font-extrabold text-ink"
            >
              ➕ نشر في صفحة التواصل
            </button>
          </div>

          <SocialVipFeedAndTrendsSection forceShowForAdminPreview />
        </div>
      ) : null}

      {/* SUB-TAB 3: LOCAL FIGURES */}
      {subTab === "local-figures" ? (
        <div className="stamp space-y-4 p-4">
          <h3 className="text-base font-extrabold text-ink">👥 شخصيات ومؤسسات رهط والنقب المتابعة</h3>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <input
              type="text"
              value={newFigName}
              onChange={(e) => setNewFigName(e.target.value)}
              placeholder="اسم الشخصية أو المؤسسة في رهط"
              className="field text-xs font-bold"
            />
            <input
              type="url"
              value={newFigFbUrl}
              onChange={(e) => setNewFigFbUrl(e.target.value)}
              placeholder="رابط صفحة فيسبوك الرسمية"
              className="field text-xs font-bold"
            />
            <button
              type="button"
              onClick={async () => {
                if (!newFigName.trim()) return;
                const nextFigs: LocalTrackedFigure[] = [
                  ...localFigures,
                  {
                    id: `fig-${Date.now()}`,
                    name: newFigName.trim(),
                    fbUrl: newFigFbUrl.trim() || "https://www.facebook.com/rahat.muni",
                    role: newFigRole,
                    category: "local",
                    autoPublish: true,
                  },
                ];
                const others = (draft.quickLinks ?? []).filter((q) => q.id !== "sociallocalfigs");
                const next: SiteSettings = {
                  ...draft,
                  quickLinks: [
                    ...others,
                    {
                      id: "sociallocalfigs",
                      title: "Local Tracked Figures",
                      subtitle: `${nextFigs.length}`,
                      url: encodeLocalTrackedFigures(nextFigs),
                    },
                  ],
                };
                setDraft(next);
                await saveNow(next, "تم إضافة الشخصية المحلية ✓");
                setNewFigName("");
                setNewFigFbUrl("");
              }}
              className="btn bg-primary text-xs font-extrabold text-ink"
            >
              ➕ إضافة للمتابعة
            </button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {localFigures.map((fg) => (
              <div key={fg.id} className="flex items-center justify-between rounded-2xl border border-line bg-paper p-3">
                <div>
                  <p className="text-xs font-extrabold text-ink">{fg.name}</p>
                  <p className="text-[11px] font-semibold text-muted">{fg.role}</p>
                </div>
                <a
                  href={fg.fbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#1877F2] px-3 py-1 text-[11px] font-extrabold text-white"
                >
                  📘 الصفحة ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* SUB-TAB 4: PAGES CONFIG */}
      {subTab === "pages" ? (
        <div className="stamp space-y-4 p-4">
          <h3 className="text-base font-extrabold text-ink">📘 إعدادات صفحات رهط بوست الرسمية</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-extrabold">اسم صفحة فيسبوك:</label>
              <input
                type="text"
                value={fbPageName}
                onChange={(e) => setFbPageName(e.target.value)}
                className="field text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-extrabold">رابط صفحة فيسبوك:</label>
              <input
                type="url"
                value={fbPageUrl}
                onChange={(e) => setFbPageUrl(e.target.value)}
                className="field text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-extrabold">معرّف تيك توك:</label>
              <input
                type="text"
                value={tiktokHandle}
                onChange={(e) => setTiktokHandle(e.target.value)}
                className="field text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-extrabold">قناة تيليجرام:</label>
              <input
                type="url"
                value={telegramChannel}
                onChange={(e) => setTelegramChannel(e.target.value)}
                className="field text-xs font-bold"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void persistSocialHubSettings()}
            className="btn bg-primary px-6 py-2.5 text-xs font-extrabold text-ink"
          >
            💾 حفظ إعدادات الصفحات
          </button>
        </div>
      ) : null}
    </div>
  );
}

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
    platform?: "all" | "tiktok" | "facebook" | "instagram";
  },
) {
  const { headline, summary, badge, theme, tiktokHandle, elapsedSec, totalSec } = opts;
  const progress = Math.min(1, Math.max(0, elapsedSec / Math.max(1, totalSec)));

  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (theme === "breaking-red") {
    grad.addColorStop(0, "#1c0404");
    grad.addColorStop(0.4, "#3b0808");
    grad.addColorStop(1, "#09090b");
  } else if (theme === "cyber-neon") {
    grad.addColorStop(0, "#030f1e");
    grad.addColorStop(0.5, "#06233d");
    grad.addColorStop(1, "#020710");
  } else {
    grad.addColorStop(0, "#080c16");
    grad.addColorStop(0.5, "#131b2e");
    grad.addColorStop(1, "#030712");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.fillRect(24, 38, w - 48, 84);
  ctx.fillStyle = "#f2c94c";
  ctx.fillRect(w - 96, 48, 58, 64);
  ctx.fillStyle = "#111827";
  ctx.font = "900 19px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("رهط", w - 67, 74);
  ctx.font = "800 13px sans-serif";
  ctx.fillText("بوست", w - 67, 96);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "right";
  ctx.font = "900 19px sans-serif";
  ctx.fillText("منصة وتطبيق رهط بوست الإخبارية", w - 110, 74);
  ctx.fillStyle = "#f2c94c";
  ctx.font = "700 13px sans-serif";
  ctx.fillText(`RAHATPOST.COM · ${tiktokHandle}`, w - 110, 98);

  if (elapsedSec < 2.5) {
    // Phase 1: Radar Beacon
    const cx = w / 2;
    const cy = 330;
    for (let i = 0; i < 3; i++) {
      const ph = (elapsedSec * 1.4 + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 24 + ph * 125, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${(1 - ph) * 0.75})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚨 تنبيه إخباري عاجل", cx, 520);
    ctx.fillStyle = "#fde68a";
    ctx.font = "800 21px sans-serif";
    ctx.fillText(`📍 ${badge}`, cx, 575);
  } else if (elapsedSec < 6.5) {
    // Phase 2: Kinetic Headline Card
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fillRect(32, 165, w - 64, 430);
    ctx.strokeStyle = "#f2c94c";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(32, 165, w - 64, 430);

    ctx.fillStyle = "#dc2626";
    ctx.fillRect(54, 148, 220, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`⚡ ${badge}`, 164, 174);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 26px sans-serif";
    const words = headline.split(" ");
    for (let i = 0; i < Math.min(4, Math.ceil(words.length / 5)); i++) {
      ctx.fillText(words.slice(i * 5, (i + 1) * 5).join(" "), w / 2, 250 + i * 46);
    }
  } else if (elapsedSec < 10.5) {
    // Phase 3: Detailed Breakdown Bullets + Scrolling Ticker
    const sumParts = summary.split(/[،.]/).filter((s) => s.trim().length > 3);
    const bullets = [
      sumParts[0] || summary.slice(0, 55),
      sumParts[1] || "متابعة ميدانية حية وتغطية متواصلة لأهم المستجدات في رهط والنقب.",
      sumParts[2] || "التفاصيل الكاملة متوفرة الآن عبر موقع وتطبيق رهط بوست.",
    ];
    bullets.forEach((bTxt, idx) => {
      const by = 185 + idx * 165;
      ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
      ctx.fillRect(32, by, w - 64, 138);
      ctx.strokeStyle = "#f2c94c";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(32, by, w - 64, 138);

      ctx.fillStyle = "#fde68a";
      ctx.font = "900 17px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`🔹 تفصيل #${idx + 1}:`, w - 50, by + 36);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 17px sans-serif";
      const bw = bTxt.trim().split(" ");
      ctx.fillText(bw.slice(0, 6).join(" "), w - 50, by + 72);
      if (bw.length > 6) ctx.fillText(bw.slice(6, 13).join(" "), w - 50, by + 104);
    });

    // Bottom Ticker
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(0, 770, w, 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔴 شريط أخبار رهط والنقب العاجل · تغطية على مدار الساعة", w / 2, 798);
  } else {
    // Phase 4: Multi-Platform Outro
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.fillRect(32, 180, w - 64, 520);
    ctx.strokeStyle = "#f2c94c";
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 180, w - 64, 520);

    ctx.fillStyle = "#f2c94c";
    ctx.font = "900 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("تابعوا منصة وتطبيق رهط بوست", w / 2, 260);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 19px sans-serif";
    ctx.fillText("🎵 TikTok: " + (tiktokHandle || "@rahatpost"), w / 2, 340);
    ctx.fillText("📘 Facebook: رهط بوست - Rahat Post", w / 2, 400);
    ctx.fillText("📸 Instagram: @rahatpost", w / 2, 460);
    ctx.fillText("🌐 الموقع والتطبيق: www.rahatpost.com", w / 2, 520);
  }

  // Progress Bar
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(32, 912, w - 64, 12);
  ctx.fillStyle = "#f2c94c";
  ctx.fillRect(32, 912, Math.max(16, (w - 64) * progress), 12);
}
