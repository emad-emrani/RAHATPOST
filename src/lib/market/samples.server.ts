import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";

/** One example listing per category, owned by a dedicated «مثال» member. Removable in one action. */
export const SAMPLE_USER_ID = "haraj-sample-seller";

type Sample = {
  n: number;
  title: string;
  category: string;
  priceMode: "price" | "negotiable" | "free";
  price: number | null;
  condition: string;
  area: string;
  description: string;
  specs: Record<string, string | number>;
  photos: string[];
};

const SAMPLES: Sample[] = [
  { n: 1, title: "فيات 500 موديل 2017 أوتوماتيك", category: "سيارات", priceMode: "price", price: 38500, condition: "مستعمل", area: "رهط، حي 15", description: "سيارة صغيرة واقتصادية، صيانة دورية في الوكالة، بدون حوادث. فحص عند أي كراج مسموح.", specs: { make: "فيات", model: "500", year: 2017, km: 96000, transmission: "أوتوماتيك", fuel: "بنزين", color: "أزرق فاتح", hand: "يد ثانية", test: "2027-04" }, photos: ["car"] },
  { n: 2, title: "آيفون 13 برو 256GB", category: "هواتف", priceMode: "price", price: 2400, condition: "شبه جديد", area: "رهط، حي 3", description: "الجهاز نظيف جداً بدون خدوش، مع العلبة والشاحن الأصلي. البطارية ممتازة.", specs: { brand: "آيفون", model: "13 Pro", storage: "256GB", battery: 88, color: "فضي", warranty: "بدون كفالة" }, photos: ["phone1", "phone2"] },
  { n: 3, title: "لابتوب ماك بوك إير M1", category: "إلكترونيات", priceMode: "negotiable", price: 2900, condition: "مستعمل", area: "رهط، حي 22", description: "مناسب للدراسة والعمل، 8GB رام و256GB تخزين. شاشة سليمة 100٪.", specs: { kind: "لابتوب", brand: "أبل", model: "MacBook Air M1", warranty: "بدون كفالة" }, photos: ["laptop"] },
  { n: 4, title: "كنبة مخمل خضراء 3 مقاعد + كراسي بار", category: "أثاث", priceMode: "price", price: 1200, condition: "شبه جديد", area: "رهط، حي 8", description: "كنبة مريحة جداً استعمال سنة، مع كرسيين بار خشب هدية. الاستلام من البيت.", specs: { kind: "كنب", material: "قماش", dimensions: "210×90×85 سم" }, photos: ["sofa", "stool"] },
  { n: 5, title: "غسالة 8 كغم تحميل أمامي", category: "أجهزة منزلية", priceMode: "price", price: 850, condition: "مستعمل", area: "رهط، حي 12", description: "تعمل بشكل ممتاز، سبب البيع الانتقال لبيت جديد. التوصيل داخل رهط ممكن.", specs: { kind: "غسالة", brand: "سامسونج", warranty: "بدون كفالة" }, photos: ["washer"] },
  { n: 6, title: "قمصان قطن رجالي جديدة (3 قطع)", category: "ملابس", priceMode: "price", price: 90, condition: "جديد", area: "رهط، حي 5", description: "ثلاث قمصان قطن 100٪ بالكيس، مقاس L، ألوان أبيض وأسود ورمادي.", specs: { gender: "رجالي", size: "L", brand: "—" }, photos: ["tshirt"] },
  { n: 7, title: "مجموعة ألعاب أطفال وكتب", category: "أطفال", priceMode: "free", price: null, condition: "مستعمل", area: "تل السبع", description: "ألعاب ودمى وكتب أطفال بحالة جيدة، مجاناً لمن يحتاجها. يفضّل الاستلام هذا الأسبوع.", specs: { kind: "ألعاب", age: "1–4 سنوات" }, photos: ["toys"] },
  { n: 8, title: "دراجة هوائية كلاسيكية", category: "رياضة", priceMode: "price", price: 650, condition: "شبه جديد", area: "رهط، حي 27", description: "دراجة خفيفة للمدينة، مقاس 54، فرامل جديدة وإطارات جديدة.", specs: { kind: "دراجة", brand: "—" }, photos: ["bike"] },
  { n: 9, title: "بيت للبيع 5 غرف مع ساحة", category: "عقارات", priceMode: "negotiable", price: 1650000, condition: "مستعمل", area: "رهط، حي 30", description: "بيت طابقين على قسيمة 500 م²، مطبخ حديث وصالون واسع، قريب من المدارس.", specs: { deal: "للبيع", kind: "بيت", rooms: 5, size: 220, floor: 0, furnished: "غير مفروش" }, photos: ["house", "living"] },
  { n: 10, title: "خروفان عواسي للبيع", category: "حيوانات", priceMode: "price", price: 1800, condition: "جديد", area: "النقب، قرب رهط", description: "خروفان عواسي بصحة ممتازة، عمر سنة تقريباً، السعر للاثنين. (الصورة: Wikimedia Commons، CC BY-SA 4.0)", specs: { kind: "أغنام", breed: "عواسي", age: "سنة", sex: "ذكر" }, photos: ["sheep"] },
  { n: 11, title: "تنظيف بيوت ومكاتب", category: "خدمات", priceMode: "negotiable", price: null, condition: "جديد", area: "رهط والمنطقة", description: "تنظيف شامل للبيوت والمكاتب والشبابيك، مواد تنظيف علينا. مواعيد مرنة.", specs: { kind: "تنظيف" }, photos: ["cleaning"] },
  { n: 12, title: "سماعات رأس لاسلكية", category: "أخرى", priceMode: "price", price: 220, condition: "شبه جديد", area: "رهط، حي 9", description: "سماعات بلوتوث بعزل ضوضاء، البطارية تدوم طويلاً، مع كابل الشحن.", specs: {}, photos: ["headphones"] },
];

const idOf = (n: number) => `5a3d1e0000000${n.toString(16).padStart(3, "0")}`;
const keyOf = (name: string) => `${createHash("md5").update(`haraj-sample-${name}`).digest("hex")}.jpg`;

export async function samplesRemoved(): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ key: string }>(`select key from haraj_flags where key = 'samples_removed'`);
  return rows.length > 0;
}

/** Insert the examples (idempotent: fixed ids/keys). */
export async function seedSamples(): Promise<number> {
  const sql = await getSql();
  await sql.query(`delete from haraj_flags where key = 'samples_removed'`);
  await sql.query(
    `insert into "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
     values ($1, 'حراج رهط — مثال', 'haraj-sample@rahatpost.invalid', false, null, now(), now()) on conflict ("id") do nothing`,
    [SAMPLE_USER_ID],
  );
  const { SAMPLE_PHOTOS } = await import("./sample-photos.server");
  const { putMedia } = await import("@/lib/media/storage.server");
  let added = 0;
  for (const s of SAMPLES) {
    const id = idOf(s.n);
    const rows = await sql.query<{ id: string }>(
      `insert into classifieds (id, user_id, title, category, price_mode, price_num, condition, neighborhood, description, phone, hide_phone, specs, status, is_sample, renewed_at, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, '0500000000', true, $10::jsonb, 'hidden', true, now() - ($11 || ' hours')::interval, now(), now())
       on conflict (id) do nothing returning id`,
      [id, SAMPLE_USER_ID, s.title, s.category, s.priceMode, s.price, s.condition, s.area, s.description, JSON.stringify(s.specs), String(s.n * 3)],
    );
    if (!rows.length) continue;
    added++;
    for (const [pos, name] of s.photos.entries()) {
      const key = keyOf(`${s.n}-${name}`);
      const bytes = Buffer.from(SAMPLE_PHOTOS[name], "base64");
      await putMedia(key, bytes, "image/jpeg");
      await sql.query(
        `insert into media_uploads (key, user_id, kind, content_type, size, width, height, owner_id, position)
         values ($1, $2, 'ad', 'image/jpeg', $3, 720, 720, $4, $5) on conflict (key) do nothing`,
        [key, SAMPLE_USER_ID, bytes.length, id, pos],
      );
    }
  }
  return added;
}

/** Remove every example listing + its photos, and stop the preview from re-adding them. */
export async function removeSamples(): Promise<number> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(`select id from classifieds where is_sample`);
  const { deleteOwnerMedia } = await import("@/lib/media/store.server");
  for (const r of rows) await deleteOwnerMedia("ad", r.id);
  await sql.query(`delete from classifieds where is_sample`);
  await sql.query(`insert into haraj_flags (key) values ('samples_removed') on conflict do nothing`);
  return rows.length;
}

let ensured = false;
/** Preview / local only: add the examples once, unless an admin removed them. Never on production. */
export async function ensureSamplesOnPreview(): Promise<void> {
  if (ensured || process.env.VERCEL_ENV === "production") return;
  ensured = true;
  try {
    const sql = await getSql();
    const rows = await sql.query<{ n: number }>(`select count(*)::int as n from classifieds where is_sample`);
    if (Number(rows[0]?.n ?? 0) === 0 && !(await samplesRemoved())) await seedSamples();
  } catch (error) {
    ensured = false;
    console.error("[haraj] sample seed failed", error);
  }
}
