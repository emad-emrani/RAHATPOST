import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import {
  clip,
  DURATIONS,
  SECTION_ICONS,
  effectivePrice,
  ID_RE,
  SLUG_RE,
  slugify,
  toAgorot,
  type AdminProduct,
  type Currency,
  type Duration,
  type Order,
  type OrderStatus,
  type ProviderId,
  type PublicProduct,
  type StoreCategory,
} from "./types";

export const newId = () => randomBytes(10).toString("hex");
export const LOW_CODES = 3;

type Row = Record<string, any>;

const toPublic = (r: Row): PublicProduct => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  categoryId: r.category_id ?? null,
  priceAgorot: Number(r.price_agorot),
  saleAgorot: r.sale_agorot == null ? null : Number(r.sale_agorot),
  imageKey: r.image_key ?? null,
  shortDesc: r.short_desc,
  description: r.description,
  duration: (r.duration in DURATIONS ? r.duration : "none") as Duration,
  badges: Array.isArray(r.badges) ? r.badges.map(String) : [],
  isSample: Boolean(r.is_sample),
  inStock:
    r.delivery_type === "codes"
      ? Number(r.free_codes ?? 0) > 0
      : r.stock == null || Number(r.stock) > 0,
});

const PRODUCT_COLS = `p.*, (select count(*) from store_codes c where c.product_id = p.id and c.order_id is null)::int as free_codes`;

/* ------------------------------------------------------------------ public */

export async function listCategories(): Promise<StoreCategory[]> {
  const sql = await getSql();
  const rows = await sql<Row>`
    select c.*, (select count(*) from store_products p
      where p.active and (p.category_id = c.id
        or p.category_id in (select k.id from store_categories k where k.parent_id = c.id)))::int as n
    from store_categories c order by c.sort, c.name`;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sort: Number(r.sort),
    imageKey: r.image_key ?? null,
    icon: (r.icon in SECTION_ICONS ? r.icon : "bag") as StoreCategory["icon"],
    description: r.description ?? "",
    color: /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : "#f2c94c",
    active: Boolean(r.active),
    showSoon: Boolean(r.show_soon),
    parentId: r.parent_id ?? null,
    productCount: Number(r.n ?? 0),
  }));
}

export async function listPublicProducts(limit = 200): Promise<PublicProduct[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `select ${PRODUCT_COLS} from store_products p where p.active order by p.sort, p.created_at desc limit $1`,
    [limit],
  );
  return rows.map(toPublic);
}

export async function getPublicProduct(slug: string): Promise<PublicProduct | null> {
  if (!SLUG_RE.test(slug)) return null;
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `select ${PRODUCT_COLS} from store_products p where p.active and p.slug = $1`,
    [slug],
  );
  return rows[0] ? toPublic(rows[0]) : null;
}

export async function isProductImage(key: string): Promise<boolean> {
  const sql = await getSql();
  return (
    (await sql`select 1 from store_products where image_key = ${key} limit 1`).length > 0 ||
    (await sql`select 1 from store_categories where image_key = ${key} limit 1`).length > 0
  );
}

/* ------------------------------------------------------------------- admin */

export type AdminProductRow = AdminProduct & {
  deliveryType: "fixed" | "codes";
  freeCodes: number;
  usedCodes: number;
};

export async function listAdminProducts(): Promise<AdminProductRow[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `select ${PRODUCT_COLS},
       (select count(*) from store_codes c where c.product_id = p.id and c.order_id is not null)::int as used_codes
     from store_products p order by p.sort, p.created_at desc`,
  );
  return rows.map((r) => {
    const { inStock: _i, ...pub } = toPublic(r);
    return {
      ...pub,
      stock: r.stock == null ? null : Number(r.stock),
      active: Boolean(r.active),
      sort: Number(r.sort),
      delivery: r.delivery,
      deliveryType: r.delivery_type === "codes" ? "codes" : "fixed",
      freeCodes: Number(r.free_codes ?? 0),
      usedCodes: Number(r.used_codes ?? 0),
    };
  });
}

/** Validate + save one product (insert when id is empty). Throws an Arabic message. */
export async function saveProduct(i: Row): Promise<string> {
  const name = clip(i.name, 120);
  if (name.length < 2) throw new Error("اكتب اسم المنتج.");
  const slug = slugify(String(i.slug || "")) || `p-${newId().slice(0, 8)}`;
  if (!SLUG_RE.test(slug))
    throw new Error("الرابط (slug) بالأحرف الإنجليزية والأرقام والشرطة فقط.");
  const price = toAgorot(i.price);
  if (price == null) throw new Error("السعر غير صحيح.");
  const saleRaw = String(i.sale ?? "").trim();
  const sale = saleRaw ? toAgorot(saleRaw) : null;
  if (saleRaw && sale == null) throw new Error("سعر التخفيض غير صحيح.");
  if (sale != null && sale >= price) throw new Error("سعر التخفيض يجب أن يكون أقل من السعر.");
  const duration = String(i.duration) in DURATIONS ? String(i.duration) : "none";
  const stockRaw = String(i.stock ?? "").trim();
  const stock = stockRaw === "" ? null : Number(stockRaw);
  if (stock != null && !(Number.isInteger(stock) && stock >= 0 && stock < 1e6))
    throw new Error("الكمية غير صحيحة (اتركها فارغة لغير محدود).");
  const imageKey = /^[a-f0-9]{32}\.(webp|jpg)$/.test(String(i.imageKey ?? ""))
    ? String(i.imageKey)
    : null;
  const badges = (Array.isArray(i.badges) ? i.badges : String(i.badges ?? "").split(","))
    .map((b: unknown) => clip(b, 24))
    .filter(Boolean)
    .slice(0, 4);
  const deliveryType = i.deliveryType === "codes" ? "codes" : "fixed";
  const isSample = i.isSample === true;
  const delivery =
    typeof i.delivery === "string"
      ? i.delivery.split(String.fromCharCode(0)).join("").trim().slice(0, 4000)
      : "";
  const categoryId = ID_RE.test(String(i.categoryId ?? "")) ? String(i.categoryId) : null;
  const sort = Math.max(-9999, Math.min(9999, Math.trunc(Number(i.sort) || 0)));
  const sql = await getSql();
  const dup = await sql<Row>`select id from store_products where slug = ${slug}`;
  const id = ID_RE.test(String(i.id ?? "")) ? String(i.id) : "";
  if (dup[0] && dup[0].id !== id) throw new Error("هذا الرابط مستخدم لمنتج آخر.");
  const vals = [
    slug,
    name,
    categoryId,
    price,
    sale,
    imageKey,
    clip(i.shortDesc, 200),
    clip(i.description, 4000, true),
    duration,
    JSON.stringify(badges),
    stock,
    i.active === true,
    sort,
    delivery,
    deliveryType,
    isSample,
  ];
  if (id) {
    const r = await sql.query<Row>(
      `update store_products set slug=$1, name=$2, category_id=$3, price_agorot=$4, sale_agorot=$5,
        image_key=$6, short_desc=$7, description=$8, duration=$9, badges=$10::jsonb, stock=$11,
        active=$12, sort=$13, delivery=$14, delivery_type=$15, is_sample=$16, updated_at=now() where id=$17 returning id`,
      [...vals, id],
    );
    if (!r.length) throw new Error("المنتج غير موجود.");
    return id;
  }
  const nid = newId();
  await sql.query(
    `insert into store_products (slug, name, category_id, price_agorot, sale_agorot, image_key, short_desc,
      description, duration, badges, stock, active, sort, delivery, delivery_type, is_sample, id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17)`,
    [...vals, nid],
  );
  return nid;
}

export async function deleteProduct(id: string) {
  const sql = await getSql();
  await sql`delete from store_products where id = ${id}`;
}

export async function saveCategory(i: Row): Promise<void> {
  const name = clip(i.name, 60);
  if (name.length < 2) throw new Error("اكتب اسم القسم.");
  const slug = slugify(String(i.slug || "")) || `c-${newId().slice(0, 6)}`;
  if (!/^[a-z0-9-]{2,60}$/.test(slug))
    throw new Error("الرابط بالأحرف الإنجليزية والأرقام والشرطة فقط.");
  const sort = Math.max(-9999, Math.min(9999, Math.trunc(Number(i.sort) || 0)));
  const icon = String(i.icon) in SECTION_ICONS ? String(i.icon) : "bag";
  const color = /^#[0-9a-f]{6}$/i.test(String(i.color)) ? String(i.color).toLowerCase() : "#f2c94c";
  const imageKey = /^[a-f0-9]{32}\.(webp|jpg)$/.test(String(i.imageKey ?? ""))
    ? String(i.imageKey)
    : null;
  const description = clip(i.description, 500, true);
  const active = i.active !== false;
  const showSoon = i.showSoon === true;
  const sql = await getSql();
  const id = ID_RE.test(String(i.id ?? "")) ? String(i.id) : "";
  let parentId = ID_RE.test(String(i.parentId ?? "")) ? String(i.parentId) : null;
  if (parentId) {
    // Two levels only (section > sub-section): the parent must be top-level and not itself.
    const p = await sql<Row>`select parent_id from store_categories where id = ${parentId}`;
    if (!p[0] || parentId === id) parentId = null;
    else if (p[0].parent_id) throw new Error("القسم الأب يجب أن يكون قسماً رئيسياً.");
    if (id && (await sql`select 1 from store_categories where parent_id = ${id} limit 1`).length)
      throw new Error("هذا القسم له أقسام فرعية، فلا يمكن جعله فرعياً.");
  }
  try {
    if (id)
      await sql`update store_categories set name=${name}, slug=${slug}, sort=${sort}, icon=${icon}, color=${color},
        image_key=${imageKey}, description=${description}, active=${active}, show_soon=${showSoon}, parent_id=${parentId}
        where id=${id}`;
    else
      await sql`insert into store_categories (id, name, slug, sort, icon, color, image_key, description, active, show_soon, parent_id)
        values (${newId()}, ${name}, ${slug}, ${sort}, ${icon}, ${color}, ${imageKey}, ${description}, ${active}, ${showSoon}, ${parentId})`;
  } catch {
    throw new Error("رابط القسم مستخدم أو غير صالح.");
  }
}

/** Delete every «مثال» sample product (their images stop being served). */
export async function deleteSamples(): Promise<number> {
  const sql = await getSql();
  return (await sql<Row>`delete from store_products where is_sample returning id`).length;
}

export async function deleteCategory(id: string) {
  const sql = await getSql();
  await sql`delete from store_categories where id = ${id}`;
}

/** Bulk import codes (one per line). Returns how many new codes were added. */
export async function addCodes(productId: string, text: string): Promise<number> {
  const codes = [
    ...new Set(
      String(text ?? "")
        .split(/\r?\n/)
        .map((c) => c.trim())
        .filter((c) => c && c.length <= 500),
    ),
  ].slice(0, 2000);
  if (!codes.length) return 0;
  const sql = await getSql();
  const r = await sql.query<Row>(
    `insert into store_codes (product_id, code) select $1, unnest($2::text[])
     on conflict (product_id, code) do nothing returning id`,
    [productId, codes],
  );
  return r.length;
}

/** Remove unused codes of a product (assigned ones are kept for the buyers). */
export async function clearFreeCodes(productId: string): Promise<number> {
  const sql = await getSql();
  const r =
    await sql<Row>`delete from store_codes where product_id = ${productId} and order_id is null returning id`;
  return r.length;
}

/* ------------------------------------------------------------------ orders */

export async function createOrder(
  user: { id: string; name: string; email: string | null },
  items: { id: string; qty: number }[],
  currency: Currency,
  provider: ProviderId,
): Promise<{ id: string; totalAgorot: number; names: string[] }> {
  const sql = await getSql();
  const ids = items.map((i) => i.id);
  const rows = await sql.query<Row>(
    `select ${PRODUCT_COLS} from store_products p where p.active and p.id = any($1::text[])`,
    [ids],
  );
  let total = 0;
  const lines: { p: PublicProduct; qty: number }[] = [];
  for (const it of items) {
    const r = rows.find((x) => x.id === it.id);
    if (!r) throw new Error("أحد المنتجات لم يعد متوفراً. حدّث السلة.");
    const p = toPublic(r);
    if (p.isSample) throw new Error(`«${p.name}» منتج تجريبي (مثال) ولا يمكن شراؤه.`);
    const available =
      r.delivery_type === "codes"
        ? Number(r.free_codes)
        : r.stock == null
          ? Infinity
          : Number(r.stock);
    if (available < it.qty) throw new Error(`الكمية المتوفرة من «${p.name}» غير كافية.`);
    total += effectivePrice(p) * it.qty;
    lines.push({ p, qty: it.qty });
  }
  const id = newId();
  await sql`insert into store_orders (id, user_id, user_name, user_email, total_agorot, currency, provider)
    values (${id}, ${user.id}, ${clip(user.name, 120)}, ${clip(user.email ?? "", 200)}, ${total}, ${currency}, ${provider})`;
  for (const l of lines)
    await sql`insert into store_order_items (order_id, product_id, name, unit_agorot, qty)
      values (${id}, ${l.p.id}, ${l.p.name}, ${effectivePrice(l.p)}, ${l.qty})`;
  return { id, totalAgorot: total, names: lines.map((l) => l.p.name) };
}

const toOrder = (o: Row, items: Row[], withDelivery: boolean, admin: boolean): Order => ({
  id: o.id,
  status: o.status,
  totalAgorot: Number(o.total_agorot),
  currency: o.currency,
  provider: o.provider,
  createdAt: new Date(o.created_at).toISOString(),
  items: items
    .filter((i) => i.order_id === o.id)
    .map((i) => ({
      productId: i.product_id,
      name: i.name,
      unitAgorot: Number(i.unit_agorot),
      qty: Number(i.qty),
      delivery:
        withDelivery && (admin || ((o.status === "paid" || o.status === "delivered") && !i.revoked))
          ? i.delivery || undefined
          : undefined,
      ...(admin ? { revoked: Boolean(i.revoked) } : {}),
    })),
  ...(admin ? { userName: o.user_name, userEmail: o.user_email, note: o.note } : {}),
});

async function itemsOf(ids: string[]): Promise<Row[]> {
  if (!ids.length) return [];
  const sql = await getSql();
  return sql.query<Row>(
    `select * from store_order_items where order_id = any($1::text[]) order by name`,
    [ids],
  );
}

export async function myOrders(userId: string): Promise<Order[]> {
  const sql = await getSql();
  const orders =
    await sql<Row>`select * from store_orders where user_id = ${userId} order by created_at desc limit 100`;
  const items = await itemsOf(orders.map((o) => o.id));
  return orders.map((o) => toOrder(o, items, true, false));
}

export async function getOrderRow(id: string): Promise<Row | null> {
  if (!ID_RE.test(id)) return null;
  const sql = await getSql();
  return (await sql<Row>`select * from store_orders where id = ${id}`)[0] ?? null;
}

export async function orderDescription(id: string): Promise<string> {
  const items = await itemsOf([id]);
  return items.map((i) => (Number(i.qty) > 1 ? `${i.name} ×${i.qty}` : i.name)).join("، ") || "طلب";
}

export async function adminOrders(
  status?: OrderStatus,
): Promise<(Order & { log: { action: string; detail: string; at: string }[] })[]> {
  const sql = await getSql();
  const orders = status
    ? await sql<Row>`select * from store_orders where status = ${status} order by created_at desc limit 200`
    : await sql<Row>`select * from store_orders order by created_at desc limit 200`;
  const ids = orders.map((o) => o.id);
  const items = await itemsOf(ids);
  const logs = ids.length
    ? await sql.query<Row>(
        `select order_id, action, detail, created_at from store_deliveries where order_id = any($1::text[])
         union all select order_id, case when verified then 'payment' else 'callback' end, detail, created_at
           from store_payment_events where order_id = any($1::text[])
         order by created_at`,
        [ids],
      )
    : [];
  return orders.map((o) => ({
    ...toOrder(o, items, true, true),
    log: logs
      .filter((l) => l.order_id === o.id)
      .map((l) => ({
        action: l.action,
        detail: l.detail,
        at: new Date(l.created_at).toISOString(),
      })),
  }));
}

export async function addNote(id: string, note: string) {
  const sql = await getSql();
  await sql`update store_orders set note = trim(both ' ' from note || ' ' || ${note}) where id = ${id}`;
}

export async function orderLines(id: string): Promise<{ name: string; qty: number }[]> {
  return (await itemsOf([id])).map((i) => ({ name: i.name, qty: Number(i.qty) }));
}

export async function setProviderRef(id: string, provider: ProviderId, ref: string) {
  const sql = await getSql();
  await sql`update store_orders set provider = ${provider}, provider_ref = ${ref}, updated_at = now() where id = ${id} and status = 'pending'`;
}

export async function logPaymentEvent(
  orderId: string | null,
  provider: string,
  verified: boolean,
  detail: string,
) {
  const sql = await getSql();
  await sql`insert into store_payment_events (order_id, provider, verified, detail)
    values (${orderId}, ${provider}, ${verified}, ${detail.slice(0, 500)})`;
}

async function logDelivery(orderId: string, action: string, detail: string) {
  const sql = await getSql();
  await sql`insert into store_deliveries (order_id, action, detail) values (${orderId}, ${action}, ${detail.slice(0, 500)})`;
}

/**
 * pending → paid exactly once (conditional update), then deliver. Used by verified provider
 * callbacks and by the admin «تم الدفع» button. Returns false if the order was not pending.
 */
export async function markPaid(id: string, by: string, ref = ""): Promise<boolean> {
  const sql = await getSql();
  const r =
    await sql<Row>`update store_orders set status = 'paid', paid_at = now(), updated_at = now(),
      note = trim(both ' ' from note || ' ' || ${by}), provider_ref = case when ${ref} = '' then provider_ref else ${ref} end
    where id = ${id} and status = 'pending' returning id`;
  if (!r.length) return false;
  await deliver(id);
  return true;
}

/**
 * Fill every undelivered line of a paid order: fixed content, or `qty` codes claimed atomically
 * (UPDATE … FOR UPDATE SKIP LOCKED, so two orders can never get the same code). A line without
 * enough codes is left empty and logged («نقص») until the admin adds codes and retries.
 */
export async function deliver(id: string): Promise<{ delivered: boolean; short: string[] }> {
  const sql = await getSql();
  const order = await getOrderRow(id);
  if (!order || (order.status !== "paid" && order.status !== "delivered"))
    return { delivered: false, short: [] };
  const items = await sql<Row>`select i.*, p.delivery as p_delivery, p.delivery_type, p.stock
    from store_order_items i left join store_products p on p.id = i.product_id
    where i.order_id = ${id} and i.delivery = ''`;
  const short: string[] = [];
  for (const it of items) {
    let content = "";
    if (it.delivery_type === "codes") {
      const got = await sql.query<Row>(
        `update store_codes set order_id = $1, assigned_at = now() where id in (
           select id from store_codes where product_id = $2 and order_id is null
           order by id limit $3 for update skip locked) returning code`,
        [id, it.product_id, Number(it.qty)],
      );
      if (got.length < Number(it.qty)) {
        await sql`update store_codes set order_id = null, assigned_at = null where order_id = ${id} and product_id = ${it.product_id}`;
        short.push(it.name);
        await logDelivery(id, "short", `${it.name}: codes ${got.length}/${it.qty}`);
        continue;
      }
      content = got.map((g) => g.code).join("\n");
    } else {
      content = String(it.p_delivery ?? "").trim();
      if (!content) {
        short.push(it.name);
        await logDelivery(id, "short", `${it.name}: no delivery content`);
        continue;
      }
      if (it.stock != null)
        await sql`update store_products set stock = greatest(stock - ${Number(it.qty)}, 0) where id = ${it.product_id}`;
    }
    await sql`update store_order_items set delivery = ${content}, revoked = false where order_id = ${id} and product_id = ${it.product_id}`;
    await logDelivery(id, "deliver", it.name);
  }
  if (short.length) return { delivered: false, short };
  const done = await sql<Row>`update store_orders set status = 'delivered', updated_at = now()
    where id = ${id} and status = 'paid' returning user_email`;
  if (done.length) await emailOrder(id, "email");
  return { delivered: true, short };
}

async function emailOrder(id: string, action: "email" | "resend") {
  const { sendDeliveryEmail, emailConfigured } = await import("./email.server");
  const order = await getOrderRow(id);
  if (!order) return;
  if (!emailConfigured()) {
    await logDelivery(id, action, "no email sender configured (shown in طلباتي only)");
    return;
  }
  const items = (await itemsOf([id])).filter((i) => i.delivery && !i.revoked);
  const ok = await sendDeliveryEmail(
    order.user_email,
    id,
    items.map((i) => ({ name: i.name, delivery: i.delivery })),
  );
  await logDelivery(id, action, ok ? `sent to ${order.user_email}` : "email failed");
}

export async function resend(id: string) {
  const sql = await getSql();
  await sql`update store_order_items set revoked = false where order_id = ${id}`;
  await logDelivery(id, "resend", "visible again in طلباتي");
  await emailOrder(id, "resend");
}

export async function revoke(id: string) {
  const sql = await getSql();
  await sql`update store_order_items set revoked = true where order_id = ${id}`;
  await logDelivery(id, "revoke", "hidden from buyer");
}

export async function setStatus(id: string, status: OrderStatus): Promise<boolean> {
  if (status === "paid") return markPaid(id, "[admin]");
  const sql = await getSql();
  if (status === "delivered") {
    const r = await deliver(id);
    return r.delivered;
  }
  const r =
    await sql<Row>`update store_orders set status = ${status}, updated_at = now() where id = ${id} returning id`;
  return r.length > 0;
}

export async function lowStock(): Promise<{ name: string; freeCodes: number }[]> {
  return (await listAdminProducts())
    .filter((p) => p.active && p.deliveryType === "codes" && p.freeCodes <= LOW_CODES)
    .map((p) => ({ name: p.name, freeCodes: p.freeCodes }));
}
