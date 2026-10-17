import {
  BarChart3,
  Bell,
  Flag,
  Globe,
  Sparkles,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  PenSquare,
  Pill,
  Rss,
  Settings,
  ShoppingBag,
  Siren,
  Store,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { PhotoStrip } from "@/components/photo-picker";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { CommentsAdmin } from "@/components/admin/comments-admin";
import { AlertsAdmin, DutyAdmin, PushAdmin, ReportsAdmin } from "@/components/admin/content-admin";
import { adminDecideAd, adminListAds } from "@/lib/ads/api";
import type { OwnAd } from "@/lib/ads/types";
import { adminDecide, adminList, adminLogin, adminLogout } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";
import { AutoNewsAdmin } from "@/components/admin/auto-news-admin";
import { SiteSettingsAdmin } from "@/components/admin/site-settings-admin";
import { MembersAdmin } from "@/components/admin/members-admin";
import { adminWhoami } from "@/lib/team/api";
import type { AdminLevel } from "@/lib/admin-auth";
import { PublishAdmin } from "@/components/admin/publish-admin";
import { StoreAdmin } from "@/components/admin/store-admin";
import { StatsAdmin } from "@/components/admin/stats-admin";
import { LanguagesAdmin } from "@/components/admin/languages-admin";
import { GeminiAdmin } from "@/components/admin/gemini-admin";
import { adminDecideNews, adminListNews } from "@/lib/reader-news/api";
import type { OwnReaderNews } from "@/lib/reader-news/types";
import { tr, trv } from "@/lib/i18n/core";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: tr("إدارة · رهط بوست") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

const STATUS: Record<BusinessSubmission["status"], string> = {
  pending: "بانتظار المراجعة",
  approved: "موافَق عليه",
  rejected: "مرفوض",
};

type Section =
  | "stats"
  | "store"
  | "settings"
  | "auto"
  | "publish"
  | "members"
  | "news"
  | "ads"
  | "directory"
  | "comments"
  | "reports"
  | "duty"
  | "alerts"
  | "push"
  | "languages"
  | "gemini";

const ALL_TABS: { key: Section; label: string; icon: LucideIcon }[] = [
  { key: "stats", label: "الإحصائيات", icon: BarChart3 },
  { key: "publish", label: "نشر خبر", icon: PenSquare },
  { key: "auto", label: "الأخبار التلقائية", icon: Rss },
  { key: "news", label: "أخبار القراء", icon: Newspaper },
  { key: "ads", label: "الإعلانات", icon: Megaphone },
  { key: "store", label: "المتجر", icon: ShoppingBag },
  { key: "directory", label: "طلبات الدليل", icon: Store },
  { key: "comments", label: "التعليقات", icon: MessageSquare },
  { key: "reports", label: "البلاغات", icon: Flag },
  { key: "duty", label: "صيدلية المناوبة", icon: Pill },
  { key: "alerts", label: "التنبيهات", icon: Siren },
  { key: "push", label: "الإشعارات", icon: Bell },
  { key: "members", label: "الأعضاء والصلاحيات", icon: Users },
  { key: "settings", label: "إعدادات الموقع", icon: Settings },
  { key: "languages", label: "اللغات", icon: Globe },
  { key: "gemini", label: "الذكاء الاصطناعي والترجمة", icon: Sparkles },
];

function AdminMenu({
  tabs,
  section,
  onSelect,
  onLogout,
  level,
  name,
}: {
  tabs: typeof ALL_TABS;
  section: Section;
  onSelect: (key: Section) => void;
  onLogout: () => void;
  level: AdminLevel | null;
  name: string;
}) {
  return (
    <nav aria-label={tr("أقسام الإدارة")} className="flex flex-col gap-1">
      <p className="px-3 pb-2 text-sm font-semibold text-muted">
        {level === "owner" ? tr("المالك") : `${name} · ${level === "writer" ? tr("كاتب") : tr("مشرف")}`}
      </p>
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          aria-current={section === key ? "page" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start font-bold transition-colors ${
            section === key ? "bg-primary text-ink" : "hover:bg-primary-soft"
          }`}
          onClick={() => onSelect(key)}
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          {trv(label)}
        </button>
      ))}
      <hr className="my-2 border-line" />
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start font-bold hover:bg-primary-soft"
        onClick={onLogout}
      >
        <LogOut className="size-5 shrink-0" aria-hidden />
        {tr("خروج")}
      </button>
    </nav>
  );
}

function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [items, setItems] = useState<BusinessSubmission[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [tab, setTab] = useState<BusinessSubmission["status"]>("pending");
  const [section, setSection] = useState<Section>("news");
  const [level, setLevel] = useState<AdminLevel | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const [who, setWho] = useState({ name: "", signedIn: false });

  const refresh = useCallback(async () => {
    const me = await adminWhoami();
    setLevel(me.level);
    setWho({ name: me.name, signedIn: me.signedIn });
    if (!me.level) {
      setState("login");
      return;
    }
    if (me.level === "writer") {
      setSection("publish");
      setState("ready");
      return;
    }
    const res = await adminList();
    if (!res.authed) {
      setState("login");
      return;
    }
    setItems(res.items);
    setError(res.ok ? "" : tr("تعذّر تحميل الطلبات من التخزين."));
    setState("ready");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === "loading") {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      </Shell>
    );
  }

  if (state === "login") {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold">{tr("الإدارة")}</h1>
        <form
          className="stamp flex flex-col gap-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const password = String(new FormData(event.currentTarget).get("password") ?? "");
            const res = await adminLogin({ data: { password } });
            if (res.ok) {
              setError("");
              await refresh();
            } else setError(res.message ?? tr("تعذّر الدخول."));
          }}
        >
          <label className="block font-bold">
            {tr("كلمة المرور")}
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="field mt-1"
              dir="ltr"
            />
          </label>
          {error ? <p className="font-bold">{trv(error)}</p> : null}
          <button type="submit" className="btn">
            {tr("دخول")}
          </button>
        </form>
        <div className="stamp mt-4 flex flex-col gap-2 p-4">
          <p className="font-bold">{tr("أعضاء الفريق (مشرف / كاتب)")}</p>
          {who.signedIn ? (
            <p className="font-semibold text-muted">
              {tr("حسابك ليس له صلاحية في لوحة الإدارة. اطلب من مالك الموقع إضافتك.")}
            </p>
          ) : (
            <a className="btn btn-ghost" href="/login?redirect=%2Fadmin">
              {tr("دخول بحساب Google")}
            </a>
          )}
        </div>
      </Shell>
    );
  }

  const act = async (id: string, action: "approved" | "rejected" | "pending" | "delete") => {
    if (action === "delete" && !confirm(tr("حذف الطلب نهائياً؟"))) return;
    setBusyId(id);
    try {
      await adminDecide({ data: { id, action } });
      await refresh();
    } catch {
      setError(tr("تعذّر تنفيذ العملية."));
    } finally {
      setBusyId("");
    }
  };

  const list = items.filter((i) => i.status === tab);
  const tabs = ALL_TABS.filter(({ key }) =>
    level === "writer"
      ? key === "publish"
      : (key !== "members" && key !== "settings") || level === "owner",
  );
  const current: Section = tabs.some((t) => t.key === section) ? section : (tabs[0]?.key ?? "news");
  const logout = async () => {
    setMenuOpen(false);
    await adminLogout();
    setState("login");
  };

  return (
    <Shell wide>
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <div className="stamp sticky top-24 p-3">
            <AdminMenu
              tabs={tabs}
              section={current}
              onSelect={setSection}
              onLogout={logout}
              level={level}
              name={who.name}
            />
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              className="btn btn-ghost px-3 lg:hidden"
              aria-label={tr("فتح القائمة")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-muted">{tr("الإدارة")}</p>
              <h1 className="truncate text-2xl font-bold">
                {trv(tabs.find((t) => t.key === current)?.label ?? "الإدارة")}
              </h1>
            </div>
          </div>
          {menuOpen ? (
            <div
              className="fixed inset-0 z-50 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={tr("قائمة الإدارة")}
            >
              <button
                type="button"
                className="absolute inset-0 h-full w-full bg-black/40"
                aria-label={tr("إغلاق القائمة")}
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-paper p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between px-2">
                  <p className="text-lg font-bold">{tr("لوحة التحكم")}</p>
                  <button
                    type="button"
                    className="btn btn-ghost px-3"
                    aria-label={tr("إغلاق")}
                    onClick={() => setMenuOpen(false)}
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
                <AdminMenu
                  tabs={tabs}
                  section={current}
                  onSelect={(k) => {
                    setSection(k);
                    setMenuOpen(false);
                  }}
                  onLogout={logout}
                  level={level}
                  name={who.name}
                />
              </div>
            </div>
          ) : null}
          {current === "publish" ? (
            <PublishAdmin />
          ) : current === "languages" ? (
            <LanguagesAdmin />
          ) : current === "gemini" ? (
            <GeminiAdmin />
          ) : current === "stats" ? (
            <StatsAdmin />
          ) : current === "store" ? (
            <StoreAdmin isOwner={level === "owner"} />
          ) : current === "settings" ? (
            <SiteSettingsAdmin />
          ) : current === "auto" ? (
            <AutoNewsAdmin />
          ) : current === "members" ? (
            <MembersAdmin />
          ) : current === "comments" ? (
            <CommentsAdmin />
          ) : current === "reports" ? (
            <ReportsAdmin />
          ) : current === "duty" ? (
            <DutyAdmin />
          ) : current === "alerts" ? (
            <AlertsAdmin />
          ) : current === "push" ? (
            <PushAdmin />
          ) : current === "ads" ? (
            <AdsAdmin />
          ) : current === "news" ? (
            <NewsAdmin />
          ) : (
            <>
              <div className="scroll-row mb-4">
                {(Object.keys(STATUS) as BusinessSubmission["status"][]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
                    onClick={() => setTab(s)}
                  >
                    {trv(STATUS[s])} ({trv(items.filter((i) => i.status === s).length)})
                  </button>
                ))}
              </div>
              {error ? <p className="stamp mb-3 p-3 font-bold">{trv(error)}</p> : null}
              {list.length === 0 ? (
                <p className="stamp p-4 font-semibold">{tr("لا طلبات هنا.")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {list.map((item) => (
                    <li key={item.id} className="stamp p-4">
                      <span className="chip">{trv(item.category)}</span>
                      <h2 className="mt-2 text-xl font-bold">{trv(item.name)}</h2>
                      <p className="font-semibold">{trv(item.area)}</p>
                      <p className="mt-1">{trv(item.about)}</p>
                      <PhotoStrip keys={item.photo ? [item.photo] : []} />
                      <p className="mt-1 font-bold" dir="ltr">
                        {trv(item.phone)}
                      </p>
                      <p className="text-sm font-semibold text-muted">
                        {item.posterName ? `${item.posterName} · ` : ""}
                        {new Date(item.createdAt).toLocaleString("ar-u-nu-latn", {
                          timeZone: "Asia/Jerusalem",
                        })}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {item.status !== "approved" ? (
                          <button
                            type="button"
                            className="btn"
                            disabled={busyId === item.id}
                            onClick={() => act(item.id, "approved")}
                          >
                            {tr("موافقة")}
                          </button>
                        ) : null}
                        {item.status !== "rejected" ? (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={busyId === item.id}
                            onClick={() => act(item.id, "rejected")}
                          >
                            {tr("رفض")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busyId === item.id}
                          onClick={() => act(item.id, "delete")}
                        >
                          {tr("حذف")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}

function AdsAdmin() {
  const [items, setItems] = useState<OwnAd[] | null>(null);
  const [tab, setTab] = useState<OwnAd["status"]>("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const res = await adminListAds();
    setItems(res.items);
    setError(
      !res.authed ? tr("انتهت الجلسة. سجّل الدخول من جديد.") : res.ok ? "" : tr("تعذّر تحميل الإعلانات."),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (id: string, action: "approved" | "rejected" | "delete") => {
    if (action === "delete" && !confirm(tr("حذف الإعلان نهائياً؟"))) return;
    setBusyId(id);
    try {
      await adminDecideAd({ data: { id, action } });
      await refresh();
    } catch {
      setError(tr("تعذّر تنفيذ العملية."));
    } finally {
      setBusyId("");
    }
  };

  if (!items) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  const list = items.filter((i) => i.status === tab);

  return (
    <>
      <div className="scroll-row mb-4">
        {(Object.keys(STATUS) as OwnAd["status"][]).map((s) => (
          <button
            key={s}
            type="button"
            className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0"}
            onClick={() => setTab(s)}
          >
            {trv(STATUS[s])} ({trv(items.filter((i) => i.status === s).length)})
          </button>
        ))}
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{trv(error)}</p> : null}
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لا إعلانات هنا.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((ad) => (
            <li key={ad.id} className="stamp p-4">
              <span className="chip">{trv(ad.type)}</span>
              <h2 className="mt-2 text-xl font-bold">{trv(ad.title)}</h2>
              <p className="font-semibold">
                {trv(ad.neighborhood)}
                {ad.price ? ` · ${ad.price}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-line">{trv(ad.description)}</p>
              <PhotoStrip keys={ad.photos} />
              <p className="mt-1 font-bold" dir="ltr">
                {trv(ad.phone)}
              </p>
              <p className="text-sm font-semibold text-muted">
                {trv(ad.posterName)} ·{" "}
                {new Date(ad.updatedAt).toLocaleString("ar-u-nu-latn", {
                  timeZone: "Asia/Jerusalem",
                })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ad.status !== "approved" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busyId === ad.id}
                    onClick={() => act(ad.id, "approved")}
                  >
                    {tr("موافقة")}
                  </button>
                ) : null}
                {ad.status !== "rejected" ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === ad.id}
                    onClick={() => act(ad.id, "rejected")}
                  >
                    {tr("رفض")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === ad.id}
                  onClick={() => act(ad.id, "delete")}
                >
                  {tr("حذف")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NewsAdmin() {
  const [items, setItems] = useState<OwnReaderNews[] | null>(null);
  const [tab, setTab] = useState<OwnReaderNews["status"]>("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const res = await adminListNews();
    setItems(res.items);
    setError(
      !res.authed ? tr("انتهت الجلسة. سجّل الدخول من جديد.") : res.ok ? "" : tr("تعذّر تحميل الأخبار."),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (id: string, action: "approved" | "rejected" | "delete") => {
    if (action === "delete" && !confirm(tr("حذف الخبر نهائياً؟"))) return;
    setBusyId(id);
    try {
      await adminDecideNews({ data: { id, action } });
      await refresh();
    } catch {
      setError(tr("تعذّر تنفيذ العملية."));
    } finally {
      setBusyId("");
    }
  };

  if (!items) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  const list = items.filter((i) => i.status === tab);

  return (
    <>
      <div className="scroll-row mb-4">
        {(Object.keys(STATUS) as OwnReaderNews["status"][]).map((s) => (
          <button
            key={s}
            type="button"
            className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0"}
            onClick={() => setTab(s)}
          >
            {trv(STATUS[s])} ({trv(items.filter((i) => i.status === s).length)})
          </button>
        ))}
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{trv(error)}</p> : null}
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لا أخبار هنا.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((item) => (
            <li key={item.id} className="stamp p-4">
              <span className="chip">{trv(item.neighborhood)}</span>
              <h2 className="mt-2 text-xl font-bold">{trv(item.title)}</h2>
              <p className="mt-1 whitespace-pre-line">{trv(item.body)}</p>
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-1 block break-all text-sm font-bold underline"
                  dir="ltr"
                >
                  {trv(item.sourceUrl)}
                </a>
              ) : null}
              <p className="mt-1 text-sm font-semibold text-muted">
                {trv(item.posterName)} ·{" "}
                {new Date(item.updatedAt).toLocaleString("ar-u-nu-latn", {
                  timeZone: "Asia/Jerusalem",
                })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.status !== "approved" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busyId === item.id}
                    onClick={() => act(item.id, "approved")}
                  >
                    {tr("موافقة")}
                  </button>
                ) : null}
                {item.status !== "rejected" ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === item.id}
                    onClick={() => act(item.id, "rejected")}
                  >
                    {tr("رفض")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, "delete")}
                >
                  {tr("حذف")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
