import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Package } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { confirmMyPayment, getStore, listMyOrders } from "@/lib/store/api";
import { formatPrice, ORDER_STATUS, type Order, type PublicStoreSettings } from "@/lib/store/types";
import { tr, trv } from "@/lib/i18n/core";

export const Route = createFileRoute("/my-orders")({
  validateSearch: (s: Record<string, unknown>): { order?: string; pay?: string } => ({
    order: typeof s.order === "string" && /^[a-z0-9]{12,32}$/.test(s.order) ? s.order : undefined,
    pay: s.pay === "done" || s.pay === "failed" || s.pay === "manual" ? s.pay : undefined,
  }),
  head: () => ({ meta: [{ title: tr("طلباتي · رهط بوست") }, { name: "robots", content: "noindex" }] }),
  component: MyOrdersPage,
});

const CHIP: Record<Order["status"], string> = {
  pending: "chip chip-deep",
  paid: "chip chip-ok",
  delivered: "chip chip-ok",
  cancelled: "chip chip-alert",
};

/** Plain text with https links made clickable (no HTML is ever injected). */
function Delivery({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s]+)/g);
  return (
    <p
      className="mt-1 whitespace-pre-wrap break-all rounded-xl bg-surface p-3 font-mono text-sm font-bold"
      dir="auto"
    >
      {parts.map((s, i) =>
        /^https:\/\/[^\s]+$/.test(s) ? (
          <a
            key={i}
            href={s}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline"
          >
            {trv(s)}
          </a>
        ) : (
          s
        ),
      )}
    </p>
  );
}

export function ManualContact({ s }: { s: PublicStoreSettings }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold">{tr("الدفع اليدوي: سيتم التواصل معك لإتمام الدفع.")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {s.whatsapp ? (
          <a
            className="btn"
            href={`https://wa.me/${s.whatsapp.replace(/^\+/, "").replace(/^0/, "972")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden />
            {tr("واتساب")}
          </a>
        ) : null}
        {s.email ? (
          <a className="btn btn-ghost" href={`mailto:${s.email}`}>
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
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    const [o, s] = await Promise.all([listMyOrders(), getStore()]);
    setOrders(o);
    setSettings(s.settings);
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    void (async () => {
      if (search.order && search.pay === "done") {
        setChecking(true);
        // The return URL proves nothing: the server asks the payment company.
        await confirmMyPayment({ data: { orderId: search.order } }).catch(() => null);
        setChecking(false);
      }
      await refresh();
    })();
  }, [userId, search.order, search.pay, refresh]);

  if (isPending)
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      </Shell>
    );
  if (!user)
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold">{tr("طلباتي")}</h1>
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="font-semibold">{tr("سجّل الدخول لترى طلباتك ومشترياتك.")}</p>
          <Link to="/login" search={{ redirect: "/my-orders" }} className="btn">
            {tr("تسجيل الدخول")}
          </Link>
        </div>
      </Shell>
    );

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">{tr("طلباتي")}</h1>
      {checking ? <p className="stamp mb-3 p-3 font-bold">{tr("نتحقق من الدفع لدى شركة الدفع…")}</p> : null}
      {search.pay === "failed" ? (
        <p className="stamp mb-3 p-3 font-bold">
          {tr("لم تكتمل عملية الدفع. لم يُخصم شيء، ويمكنك المحاولة لاحقاً.")}
        </p>
      ) : null}
      {!orders ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : orders.length === 0 ? (
        <div className="stamp flex flex-col items-center gap-3 p-8 text-center">
          <Package className="size-10 text-primary-ink" aria-hidden />
          <p className="font-bold">{tr("لا طلبات بعد.")}</p>
          <Link to="/store" className="btn">
            {tr("إلى المتجر")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className={`stamp p-4 ${o.id === search.order ? "ring-2 ring-primary-deep" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={CHIP[o.status]}>{trv(ORDER_STATUS[o.status])}</span>
                <span className="font-bold" dir="ltr">
                  {formatPrice(o.totalAgorot, o.currency)}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-muted">
                {tr("طلب")} {o.id.slice(0, 8)} ·{" "}
                {new Date(o.createdAt).toLocaleString("ar-u-nu-latn", {
                  timeZone: "Asia/Jerusalem",
                })}
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {o.items.map((i) => (
                  <li key={i.productId}>
                    <p className="font-bold">
                      {trv(i.name)}
                      {i.qty > 1 ? ` × ${i.qty}` : ""}
                    </p>
                    {i.delivery ? <Delivery text={i.delivery} /> : null}
                  </li>
                ))}
              </ul>
              {o.status === "pending" && settings ? (
                <div className="mt-3 rounded-xl bg-primary-soft p-3">
                  {o.provider === "manual" ? (
                    <ManualContact s={settings} />
                  ) : (
                    <p className="font-bold">{tr("بانتظار تأكيد الدفع من شركة الدفع.")}</p>
                  )}
                </div>
              ) : null}
              {o.status === "paid" ? (
                <p className="mt-2 text-sm font-bold">{tr("تم الدفع، ونجهّز طلبك.")}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
