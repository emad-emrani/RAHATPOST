import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileSearch,
  Mail,
  MessageCircle,
  Package,
  PackageCheck,
  ShoppingBag,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { tr, trv } from "@/lib/i18n/core";
import { confirmMyPayment, getStore, listMyOrders } from "@/lib/store/api";
import {
  formatPrice,
  ORDER_STATUS,
  waDigits,
  type Order,
  type PublicProduct,
  type PublicStoreSettings,
} from "@/lib/store/types";

export const Route = createFileRoute("/my-orders")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { order?: string; pay?: string } => ({
    order:
      typeof s.order === "string" && /^[a-z0-9]{12,32}$/.test(s.order)
        ? s.order
        : undefined,
    pay:
      s.pay === "done" || s.pay === "failed" || s.pay === "manual"
        ? s.pay
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: tr("طلباتي ومتابعة حالة الطلب · رهط بوست") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyOrdersPage,
});

export type ExtendedOrderStage =
  | "pending"
  | "reviewing"
  | "paid"
  | "delivered"
  | "received"
  | "cancelled";

export const EXTENDED_STAGE_LABEL: Record<ExtendedOrderStage, string> = {
  pending: "⏳ بانتظار الدفع",
  reviewing: "🔍 الطلب قيد المراجعة",
  paid: "💳 تم الدفع والتجهيز",
  delivered: "📦 تم الإرسال / التسليم",
  received: "✅ تم الاستلام",
  cancelled: "✕ ملغى",
};

const EXTENDED_CHIP_CLS: Record<ExtendedOrderStage, string> = {
  pending: "bg-amber-100 text-amber-900 border border-amber-300",
  reviewing: "bg-sky-100 text-sky-900 border border-sky-300",
  paid: "bg-emerald-100 text-emerald-900 border border-emerald-300",
  delivered: "bg-emerald-600 text-white",
  received: "bg-[#16A34A] text-white shadow-xs",
  cancelled: "bg-red-100 text-red-800 border border-red-300",
};

function parseOrderStagesFromStore(
  products: PublicProduct[],
): Record<string, ExtendedOrderStage> {
  const cfgRow = products.find((p) => p.slug === "hub-cfg-main");
  if (!cfgRow?.description) return {};
  try {
    const parsed = JSON.parse(cfgRow.description) as {
      orderStages?: Record<string, ExtendedOrderStage>;
    };
    return parsed.orderStages ?? {};
  } catch {
    return {};
  }
}

function resolveOrderStage(
  o: Order,
  stageMap: Record<string, ExtendedOrderStage>,
): ExtendedOrderStage {
  if (o.status === "cancelled") return "cancelled";
  const custom = stageMap[o.id];
  if (custom === "received") return "received";
  if (custom === "reviewing") return "reviewing";
  if (o.status === "delivered") return "delivered";
  if (o.status === "paid") return "paid";
  return custom || "pending";
}

/** Plain text with https links made clickable (no HTML is ever injected). */
function Delivery({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s]+)/g);
  return (
    <div className="mt-2 rounded-2xl border border-[#16A34A]/40 bg-[#16A34A]/5 p-3">
      <p className="mb-1 text-xs font-extrabold text-[#16A34A]">
        {tr("🎁 محتوى التسليم الفوري (أكواد / روابط اشتراكك):")}
      </p>
      <p
        className="whitespace-pre-wrap break-all rounded-xl bg-paper p-3 font-mono text-sm font-bold text-ink shadow-2xs"
        dir="auto"
      >
        {parts.map((s, i) =>
          /^https:\/\/[^\s]+$/.test(s) ? (
            <a
              key={i}
              href={s}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary-ink underline"
            >
              {trv(s)}
            </a>
          ) : (
            s
          ),
        )}
      </p>
    </div>
  );
}

export function ManualContact({
  s,
  orderCode,
}: {
  s: PublicStoreSettings;
  orderCode?: string;
}) {
  const waText = orderCode
    ? `مرحباً إدارة متجر رهط بوست، أتابع طلبي رقم: #${orderCode}`
    : "مرحباً إدارة متجر رهط بوست، أتابع طلبي في المتجر.";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-extrabold text-ink">
        {tr("لإتمام الدفع أو الاستفسار السريع، تواصل معنا مع تزويدنا برقم الطلب:")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {s.whatsapp ? (
          <a
            className="btn flex items-center justify-center gap-1.5 text-xs font-extrabold"
            href={`https://wa.me/${waDigits(s.whatsapp)}?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden />
            {tr("إرسال رقم الطلب عبر واتساب")}
          </a>
        ) : null}
        {s.email ? (
          <a
            className="btn btn-ghost flex items-center justify-center gap-1.5 text-xs font-extrabold"
            href={`mailto:${s.email}?subject=${encodeURIComponent(`طلب رقم #${orderCode ?? ""}`)}`}
          >
            <Mail className="size-4" aria-hidden />
            {trv(s.email)}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MyOrdersPage() {
  const { user, isPending } = useCurrentUserState();
  const search = Route.useSearch();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [settings, setSettings] = useState<PublicStoreSettings | null>(null);
  const [storeProducts, setStoreProducts] = useState<PublicProduct[]>([]);
  const [checking, setChecking] = useState(false);
  const [copiedId, setCopiedId] = useState<string>("");
  const [filterStage, setFilterStage] = useState<ExtendedOrderStage | "all">(
    "all",
  );

  const refresh = useCallback(async () => {
    const [o, s] = await Promise.all([listMyOrders(), getStore()]);
    setOrders(o);
    setSettings(s.settings);
    setStoreProducts(s.products ?? []);
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    void (async () => {
      if (search.order && search.pay === "done") {
        setChecking(true);
        await confirmMyPayment({ data: { orderId: search.order } }).catch(
          () => null,
        );
        setChecking(false);
      }
      await refresh();
    })();
  }, [userId, search.order, search.pay, refresh]);

  const stageMap = useMemo(
    () => parseOrderStagesFromStore(storeProducts),
    [storeProducts],
  );

  const copyOrderCode = (code: string, id: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? "" : prev));
    }, 2200);
  };

  if (isPending)
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      </Shell>
    );

  if (!user)
    return (
      <Shell>
        <div className="rounded-3xl border border-line bg-paper p-6 text-center shadow-2xs">
          <Package className="mx-auto size-12 text-primary-ink" aria-hidden />
          <h1 className="mt-2 text-2xl font-extrabold">{tr("طلباتي ومتابعة الطلبات")}</h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            {tr("سجّل الدخول لعرض أرقام طلباتك، حالة المراجعة والتسليم، وأكواد اشتراكاتك.")}
          </p>
          <Link
            to="/login"
            search={{ redirect: "/my-orders" }}
            className="btn mt-4 inline-flex px-6"
          >
            {tr("تسجيل الدخول")}
          </Link>
        </div>
      </Shell>
    );

  const filteredOrders = (orders ?? []).filter((o) => {
    if (filterStage === "all") return true;
    return resolveOrderStage(o, stageMap) === filterStage;
  });

  return (
    <Shell>
      {/* Top User Profile Header + Store/Cart/Haraj Navigation */}
      <div className="mb-5 rounded-3xl border border-line bg-paper p-4 shadow-2xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {user.image ? (
              <img
                src={user.image}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="size-12 shrink-0 rounded-full border-2 border-primary object-cover shadow-2xs"
              />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary/20 text-lg font-extrabold text-ink">
                {user.displayName.slice(0, 1) || <UserRound className="size-6" />}
              </span>
            )}
            <div>
              <h1 className="text-xl font-extrabold sm:text-2xl">
                {tr("طلباتي ومتابعة حالة الطلب")}
              </h1>
              <p className="text-xs font-bold text-muted">
                {user.displayName}{" "}
                {user.email ? <span dir="ltr">({user.email})</span> : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/store"
              className="btn flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold"
            >
              <ShoppingBag className="size-4" aria-hidden />
              {tr("المتجر الرسمي")}
            </Link>
            <Link
              to="/cart"
              className="btn btn-ghost flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold"
            >
              <ShoppingCart className="size-4" aria-hidden />
              {tr("سلة المشتريات")}
            </Link>
          </div>
        </div>

        {/* Filter Chips for Order Stages */}
        <div className="scroll-row mt-4 gap-1.5 border-t border-line pt-3">
          {(
            [
              { key: "all", label: "كل الطلبات" },
              { key: "pending", label: "⏳ بانتظار الدفع" },
              { key: "reviewing", label: "🔍 قيد المراجعة" },
              { key: "paid", label: "💳 تم الدفع" },
              { key: "delivered", label: "📦 تم التسليم" },
              { key: "received", label: "✅ تم الاستلام" },
            ] as { key: ExtendedOrderStage | "all"; label: string }[]
          ).map((stTab) => (
            <button
              key={stTab.key}
              type="button"
              onClick={() => setFilterStage(stTab.key)}
              className={`shrink-0 rounded-2xl px-3 py-1.5 text-xs font-extrabold transition ${
                filterStage === stTab.key
                  ? "bg-ink text-paper shadow-2xs"
                  : "border border-line bg-surface text-ink hover:bg-primary-soft"
              }`}
            >
              {tr(stTab.label)}
            </button>
          ))}
        </div>
      </div>

      {checking ? (
        <p className="stamp mb-3 p-3 font-bold">
          {tr("نتحقق من الدفع لدى شركة الدفع…")}
        </p>
      ) : null}
      {search.pay === "failed" ? (
        <p className="stamp mb-3 p-3 font-bold text-alert">
          {tr("لم تكتمل عملية الدفع. لم يُخصم شيء، ويمكنك المحاولة لاحقاً.")}
        </p>
      ) : null}

      {!orders ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : filteredOrders.length === 0 ? (
        <div className="stamp flex flex-col items-center gap-3 p-8 text-center">
          <Package className="size-10 text-primary-ink" aria-hidden />
          <p className="font-bold">{tr("لا توجد طلبات في هذا القسم حالياً.")}</p>
          <Link to="/store" className="btn">
            {tr("تصفّح المتجر الرسمي")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {filteredOrders.map((o) => {
            const stage = resolveOrderStage(o, stageMap);
            const shortCode = o.id.slice(0, 8).toUpperCase();
            const isCopied = copiedId === o.id;

            const steps: { key: ExtendedOrderStage; label: string }[] = [
              { key: "pending", label: "بانتظار الدفع" },
              { key: "reviewing", label: "قيد المراجعة" },
              { key: "paid", label: "تم الدفع" },
              { key: "delivered", label: "تم التسليم" },
              { key: "received", label: "تم الاستلام" },
            ];
            const currentStepIdx = steps.findIndex((s) => s.key === stage);

            return (
              <li
                key={o.id}
                className={`rounded-3xl border bg-paper p-4 shadow-2xs sm:p-5 ${
                  o.id === search.order
                    ? "border-2 border-primary ring-2 ring-primary/30"
                    : "border-line"
                }`}
              >
                {/* Standalone Prominent Order Number Box with 1-Click Copy */}
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-primary/60 bg-primary/15 px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-muted">
                      {tr("رقم الطلب المرجعي:")}
                    </span>
                    <code
                      dir="ltr"
                      className="rounded-xl bg-paper px-3 py-1 font-mono text-base font-extrabold tracking-wider text-ink shadow-2xs"
                    >
                      #{shortCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyOrderCode(shortCode, o.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                        isCopied
                          ? "bg-[#16A34A] text-white"
                          : "bg-ink text-paper hover:opacity-90"
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3.5" aria-hidden />
                          <span>{tr("تم نسخ رقم الطلب ✓")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" aria-hidden />
                          <span>{tr("نسخ رقم الطلب")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${EXTENDED_CHIP_CLS[stage]}`}
                    >
                      {trv(EXTENDED_STAGE_LABEL[stage] ?? ORDER_STATUS[o.status])}
                    </span>
                    <span className="text-base font-extrabold text-ink" dir="ltr">
                      {formatPrice(o.totalAgorot, o.currency)}
                    </span>
                  </div>
                </div>

                {/* Visual 5-Stage Progress Bar */}
                {stage !== "cancelled" ? (
                  <div className="mb-3.5 grid grid-cols-5 gap-1.5 rounded-2xl bg-surface p-2.5 text-center">
                    {steps.map((stStep, idx) => {
                      const done = currentStepIdx >= idx;
                      const current = currentStepIdx === idx;
                      return (
                        <div
                          key={stStep.key}
                          className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-extrabold transition sm:text-xs ${
                            current
                              ? "bg-primary text-ink shadow-2xs"
                              : done
                                ? "bg-[#16A34A]/15 text-[#16A34A]"
                                : "text-muted opacity-60"
                          }`}
                        >
                          {stStep.key === "received" ? (
                            <PackageCheck className="size-4" aria-hidden />
                          ) : stStep.key === "reviewing" ? (
                            <FileSearch className="size-4" aria-hidden />
                          ) : done ? (
                            <CheckCircle2 className="size-4" aria-hidden />
                          ) : (
                            <Clock className="size-4" aria-hidden />
                          )}
                          <span className="truncate">{tr(stStep.label)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <p className="text-xs font-semibold text-muted">
                  {tr("تاريخ الطلب:")}{" "}
                  {new Date(o.createdAt).toLocaleString("ar-u-nu-latn", {
                    timeZone: "Asia/Jerusalem",
                  })}
                </p>

                <ul className="mt-2.5 flex flex-col gap-2 border-t border-line pt-2.5">
                  {o.items.map((i) => (
                    <li key={i.productId}>
                      <p className="font-extrabold text-ink">
                        • {trv(i.name)}
                        {i.qty > 1 ? ` × ${i.qty}` : ""}
                      </p>
                      {i.delivery ? <Delivery text={i.delivery} /> : null}
                    </li>
                  ))}
                </ul>

                {stage === "reviewing" ? (
                  <div className="mt-3 rounded-2xl border border-sky-300 bg-sky-50 p-3 text-xs font-extrabold text-sky-900">
                    🔍 {tr("طلبك الآن قيد المراجعة والتجهيز من قِبل إدارة متجر رهط بوست.")}
                  </div>
                ) : null}

                {stage === "received" ? (
                  <div className="mt-3 rounded-2xl border border-[#16A34A]/40 bg-[#16A34A]/10 p-3 text-xs font-extrabold text-[#16A34A]">
                    ✅ {tr("تم تأكيد استلام الطلب بنجاح. شكراً لتسوقك من متجر رهط بوست!")}
                  </div>
                ) : null}

                {(stage === "pending" || stage === "reviewing") && settings ? (
                  <div className="mt-3 rounded-2xl bg-primary-soft/60 p-3">
                    <ManualContact s={settings} orderCode={shortCode} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
