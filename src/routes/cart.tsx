import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { ProductImage, WhatsAppCashButton } from "@/components/store-parts";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { checkout, getCartProducts } from "@/lib/store/api";
import { clearCart, removeFromCart, setCart, setQty, useCart } from "@/lib/store/cart";
import {
  effectivePrice,
  formatPrice,
  type PublicProduct,
  type PublicStoreSettings,
} from "@/lib/store/types";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "السلة · رهط بوست" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
});

function CartPage() {
  const lines = useCart();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    products: PublicProduct[];
    settings: PublicStoreSettings;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idsKey = lines.map((l) => l.id).join(",");

  useEffect(() => {
    if (!idsKey) {
      setData({
        products: [],
        settings: { currency: "ILS", whatsapp: "", email: "", provider: "manual" },
      });
      return;
    }
    void getCartProducts({ data: { ids: idsKey.split(",") } })
      .then(setData)
      .catch(() => setError("تعذّر تحميل السلة."));
  }, [idsKey]);

  // Drop lines whose product is gone or inactive.
  useEffect(() => {
    if (!data || !idsKey) return;
    const valid = lines.filter((l) => data.products.some((p) => p.id === l.id));
    if (valid.length !== lines.length) setCart(valid);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = lines
    .map((l) => ({ l, p: data?.products.find((p) => p.id === l.id) }))
    .filter((r): r is { l: (typeof lines)[number]; p: PublicProduct } => Boolean(r.p));
  const currency = data?.settings.currency ?? "ILS";
  const total = rows.reduce((n, r) => n + effectivePrice(r.p) * r.l.qty, 0);

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await checkout({
        data: { items: rows.map((r) => ({ id: r.p.id, qty: r.l.qty })) },
      });
      if (!r.ok) return setError(r.message);
      clearCart();
      if (r.next === "redirect" && r.url) window.location.assign(r.url);
      else void navigate({ to: "/my-orders", search: { order: r.orderId, pay: "manual" } });
    } catch {
      setError("تعذّر إتمام الطلب. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">السلة</h1>
      {!data ? (
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      ) : rows.length === 0 ? (
        <div className="stamp flex flex-col items-center gap-3 p-8 text-center">
          <ShoppingCart className="size-10 text-primary-ink" aria-hidden />
          <p className="text-lg font-bold">سلتك فارغة</p>
          <Link to="/store" className="btn">
            تصفّح المتجر
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {rows.map(({ l, p }) => (
              <li key={p.id} className="stamp flex gap-3 p-3">
                <ProductImage p={p} className="size-20 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Link
                    to="/store/$slug"
                    params={{ slug: p.slug }}
                    className="font-bold leading-snug"
                  >
                    {p.name}
                  </Link>
                  <span className="text-sm font-semibold text-muted" dir="ltr">
                    {formatPrice(effectivePrice(p), currency)} × {l.qty}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost size-10 p-0"
                      aria-label="زيادة"
                      onClick={() => setQty(p.id, l.qty + 1)}
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                    <span className="min-w-6 text-center font-bold">{l.qty}</span>
                    <button
                      type="button"
                      className="btn btn-ghost size-10 p-0"
                      aria-label="إنقاص"
                      disabled={l.qty <= 1}
                      onClick={() => setQty(p.id, l.qty - 1)}
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost ms-auto size-10 p-0"
                      aria-label="حذف"
                      onClick={() => removeFromCart(p.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="stamp mt-4 flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>المجموع</span>
              <span dir="ltr">{formatPrice(total, currency)}</span>
            </div>
            {data.settings.provider === "manual" ? (
              <p className="rounded-xl bg-primary-soft p-3 text-sm font-bold">
                الدفع الإلكتروني غير مفعّل بعد: يُحفظ طلبك وسيتم التواصل معك لإتمام الدفع. لا يُخصم
                أي مبلغ الآن.
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted">
                ستنتقل إلى صفحة دفع آمنة لدى شركة الدفع.
              </p>
            )}
            {error ? <p className="font-bold text-red-700">{error}</p> : null}
            {isPending ? null : user ? (
              <button type="button" className="btn" disabled={busy} onClick={pay}>
                {busy
                  ? "جاري إنشاء الطلب…"
                  : data.settings.provider === "manual"
                    ? "أرسل الطلب"
                    : "إلى الدفع"}
              </button>
            ) : null}
            {!isPending && user ? (
              <WhatsAppCashButton
                items={rows.map((r) => ({ id: r.p.id, qty: r.l.qty }))}
                redirect="/cart"
                onDone={clearCart}
              />
            ) : null}
            {isPending || user ? null : (
              <Link to="/login" search={{ redirect: "/cart" }} className="btn">
                سجّل الدخول بحساب Google لإتمام الطلب
              </Link>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
