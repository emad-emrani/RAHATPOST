import { Bell, BellOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  currentSubscription,
  DEFAULT_TOPICS,
  disablePush,
  enablePush,
  loadTopics,
  pushSupport,
  saveTopics,
  type PushSupport,
} from "@/lib/push/client";
import { PUSH_TOPICS, type PushTopics } from "@/lib/push/types";
import { tr, trv } from "@/lib/i18n/core";

type State =
  | { kind: "loading" }
  | { kind: "unsupported"; support: PushSupport }
  | { kind: "denied" }
  | { kind: "off" }
  | { kind: "on"; topics: PushTopics };

async function readState(): Promise<State> {
  const support = pushSupport();
  if (support !== "supported") return { kind: "unsupported", support };
  if (Notification.permission === "denied") return { kind: "denied" };
  const topics = await loadTopics().catch(() => null);
  return topics ? { kind: "on", topics } : { kind: "off" };
}

/** «الإشعارات» card: enable/disable web push and choose topics (used on /app). */
export function NotificationsCard() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void readState().then(setState);
  }, []);

  const enable = async () => {
    setBusy(true);
    setError("");
    try {
      const message = await enablePush(DEFAULT_TOPICS);
      if (message) setError(message);
      setState(await readState());
    } catch {
      setError(tr("تعذّر تفعيل الإشعارات الآن."));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (key: keyof PushTopics, value: boolean) => {
    if (state.kind !== "on") return;
    const topics = { ...state.topics, [key]: value };
    setState({ kind: "on", topics });
    const sub = await currentSubscription();
    if (sub) {
      const message = await saveTopics(sub, topics);
      if (message) setError(message);
    }
  };

  return (
    <section className="stamp p-4" aria-labelledby="notify-title">
      <div className="flex items-start gap-3">
        <span className="icon-badge shrink-0">
          {state.kind === "on" ? (
            <Bell className="size-6" aria-hidden />
          ) : (
            <BellOff className="size-6" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <h2 id="notify-title" className="text-xl font-bold">
            {tr("الإشعارات")}
          </h2>
          <p className="font-semibold text-muted">
            {tr("تنبيهات عاجلة لرهط (انقطاع مياه أو كهرباء، طوارئ) تصلك حتى والتطبيق مغلق.")}
          </p>
        </div>
      </div>

      {state.kind === "loading" ? null : state.kind === "unsupported" ? (
        <p className="mt-3 rounded-xl bg-surface p-3 font-semibold">
          {state.support === "ios-needs-install"
            ? tr("على آيفون (iOS 16.4 أو أحدث): ثبّت رهط بوست على الشاشة الرئيسية أولاً، ثم افتحه من الأيقونة وفعّل الإشعارات من هنا.")
            : tr("هذا المتصفح لا يدعم الإشعارات. جرّب Chrome على أندرويد أو ثبّت التطبيق.")}
        </p>
      ) : state.kind === "denied" ? (
        <p className="mt-3 rounded-xl bg-surface p-3 font-semibold">
          {tr("الإشعارات محظورة لهذا الموقع. افتح إعدادات المتصفح ← إعدادات الموقع ← الإشعارات، واسمح لرهط بوست.")}
        </p>
      ) : state.kind === "off" ? (
        <button type="button" className="btn mt-4 w-full" onClick={enable} disabled={busy}>
          <Bell className="size-4" aria-hidden />
          {busy ? tr("جاري التفعيل…") : tr("فعّل الإشعارات")}
        </button>
      ) : (
        <>
          <fieldset className="mt-4 flex flex-col gap-2">
            <legend className="mb-1 font-bold">{tr("ما الذي تريد أن يصلك؟")}</legend>
            {PUSH_TOPICS.map((t) => (
              <label
                key={t.key}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2"
              >
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-[var(--color-ink)]"
                  checked={state.topics[t.key]}
                  onChange={(e) => void toggle(t.key, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block font-bold">{trv(t.label)}</span>
                  <span className="block text-sm font-semibold text-muted">{trv(t.hint)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="btn btn-ghost mt-3 w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await disablePush();
              setState({ kind: "off" });
              setBusy(false);
            }}
          >
            <BellOff className="size-4" aria-hidden />
            {tr("إيقاف الإشعارات")}
          </button>
        </>
      )}
      {error ? (
        <p role="alert" className="mt-3 font-bold">
          {trv(error)}
        </p>
      ) : null}
    </section>
  );
}

const DISMISS_KEY = "rp-notify-dismissed";

/** Gentle one-time prompt in the installed app (standalone) while notifications are undecided. */
export function NotifyPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone || pushSupport() !== "supported") return;
    if (Notification.permission !== "default" || localStorage.getItem(DISMISS_KEY)) return;
    setShow(true);
  }, []);
  if (!show) return null;
  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };
  return (
    <section className="stamp flex flex-col gap-3 p-4" aria-label={tr("الإشعارات")}>
      <div className="flex items-start gap-3">
        <span className="icon-badge shrink-0">
          <Bell className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{tr("تريد أن تصلك التنبيهات العاجلة؟")}</p>
          <p className="text-sm font-semibold text-muted">
            {tr("انقطاع مياه أو كهرباء وطوارئ في رهط فقط، بلا إزعاج.")}
          </p>
        </div>
        <button
          type="button"
          className="grid size-12 shrink-0 place-items-center rounded-xl"
          aria-label={tr("لاحقاً")}
          onClick={dismiss}
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        className="btn w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await enablePush(DEFAULT_TOPICS).catch(() => "");
          dismiss();
        }}
      >
        {tr("فعّل الإشعارات")}
      </button>
    </section>
  );
}
