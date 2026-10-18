/** Member e-mails (welcome, password reset): editable texts, shared by admin UI and server. */
export type EmailLang = "ar" | "he" | "en";
export const EMAIL_KINDS = ["welcome", "reset", "verify", "listing_approved", "listing_rejected", "listing_expiring", "listing_expired", "comment_approved", "news_approved", "news_rejected", "role_changed", "blocked", "unblocked", "password_changed"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];
export const KIND_LABEL: Record<EmailKind, string> = {"welcome": "رسالة الترحيب", "reset": "إعادة تعيين كلمة المرور", "verify": "تأكيد البريد الإلكتروني", "listing_approved": "قبول إعلان في الحراج", "listing_rejected": "رفض إعلان في الحراج", "listing_expiring": "قرب انتهاء إعلان", "listing_expired": "انتهاء إعلان", "comment_approved": "قبول تعليق", "news_approved": "قبول خبر قارئ", "news_rejected": "رفض خبر قارئ", "role_changed": "تغيير الدور", "blocked": "إيقاف الحساب", "unblocked": "إعادة تفعيل الحساب", "password_changed": "تأكيد تغيير كلمة المرور"};
export type EmailText = { subject: string; heading: string; body: string; button: string };
export type EmailTemplates = { enabled: Record<EmailKind, boolean>; texts: Record<EmailKind, Record<EmailLang, EmailText>> };

export const EMAIL_LANGS: EmailLang[] = ["ar", "he", "en"];
export const PLACEHOLDERS = ["{name}", "{site}", "{link}", "{detail}"] as const;

const DEFAULT_TEXTS: Record<EmailKind, Record<EmailLang, EmailText>> = {
  welcome: {
    ar: {
      subject: "أهلاً بك في {site} يا {name}",
      heading: "أهلاً وسهلاً، {name}",
      body: "يسعدنا انضمامك إلى {site}، موقع رهط والنقب.\n\nمن الآن يمكنك نشر إعلاناتك في «حراج رهط» وبيع وشراء الأغراض المستعملة، وإرسال أخبار من حيّك، والتعليق ومتابعة كل ما تنشره من صفحة «منشوراتي».\n\nنتمنى لك تجربة طيبة، ونسعد بملاحظاتك دائماً.",
      button: "تصفّح حراج رهط",
    },
    he: {
      subject: "ברוך הבא ל{site}, {name}",
      heading: "ברוך הבא, {name}",
      body: "שמחים שהצטרפת ל{site}, האתר של רהט והנגב.\n\nמעכשיו אפשר לפרסם מודעות ביד שנייה, לשלוח חדשות מהשכונה, להגיב ולעקוב אחרי כל מה שפרסמת.\n\nנשמח לשמוע ממך.",
      button: "ליד שנייה",
    },
    en: {
      subject: "Welcome to {site}, {name}",
      heading: "Welcome, {name}",
      body: "We're glad you joined {site}, the website for Rahat and the Negev.\n\nYou can now post listings on Rahat Haraj, buy and sell used items, send news from your neighbourhood, comment, and follow everything you post.\n\nWe'd love to hear your feedback.",
      button: "Browse Rahat Haraj",
    },
  },
  reset: {
    ar: {
      subject: "إعادة تعيين كلمة المرور · {site}",
      heading: "إعادة تعيين كلمة المرور",
      body: "مرحباً {name}،\n\nوصلنا طلب لإعادة تعيين كلمة مرور حسابك في {site}. اضغط الزر لاختيار كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة.\n\nإن لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغير شيء.",
      button: "تعيين كلمة مرور جديدة",
    },
    he: {
      subject: "איפוס סיסמה · {site}",
      heading: "איפוס סיסמה",
      body: "שלום {name},\n\nקיבלנו בקשה לאפס את הסיסמה לחשבונך ב{site}. לחץ על הכפתור כדי לבחור סיסמה חדשה. הקישור תקף לשעה.\n\nאם לא ביקשת, התעלם מהודעה זו.",
      button: "בחירת סיסמה חדשה",
    },
    en: {
      subject: "Reset your password · {site}",
      heading: "Reset your password",
      body: "Hi {name},\n\nWe received a request to reset the password for your {site} account. Tap the button to choose a new one. The link is valid for one hour.\n\nIf you didn't ask for this, just ignore this email.",
      button: "Choose a new password",
    },
  },
  verify: { ar: { subject: "أكّد بريدك الإلكتروني · {site}", heading: "تأكيد البريد الإلكتروني", body: "مرحباً {name}،\n\nاضغط الزر لتأكيد بريدك الإلكتروني في {site}.\n\nإن لم تنشئ حساباً فتجاهل هذه الرسالة.", button: "تأكيد البريد" }, he: { subject: "אימות כתובת אימייל · {site}", heading: "אימות אימייל", body: "שלום {name},\n\nלחץ על הכפתור כדי לאמת את האימייל שלך ב{site}.\n\nאם לא נרשמת, התעלם מהודעה זו.", button: "אימות" }, en: { subject: "Confirm your email · {site}", heading: "Confirm your email", body: "Hi {name},\n\nTap the button to confirm your email on {site}.\n\nIf you didn't sign up, ignore this email.", button: "Confirm email" } },
  listing_approved: { ar: { subject: "نُشر إعلانك: {detail}", heading: "تم نشر إعلانك", body: "مرحباً {name}،\n\nيسعدنا إبلاغك بأن إعلانك «{detail}» قد نُشر في حراج رهط وأصبح ظاهراً للجميع.\n\nبالتوفيق في البيع!", button: "عرض الإعلان" }, he: { subject: "המודעה שלך פורסמה: {detail}", heading: "המודעה פורסמה", body: "שלום {name},\n\nהמודעה «{detail}» פורסמה ומוצגת לכולם.\n\nבהצלחה!", button: "צפייה במודעה" }, en: { subject: "Your listing is live: {detail}", heading: "Your listing is live", body: "Hi {name},\n\nYour listing “{detail}” is now published on Rahat Haraj.\n\nGood luck with the sale!", button: "View listing" } },
  listing_rejected: { ar: { subject: "لم يُنشر إعلانك: {detail}", heading: "لم يُنشر إعلانك", body: "مرحباً {name}،\n\nنأسف لإبلاغك بأن إعلانك «{detail}» لم يُنشر لأنه لا يتوافق مع شروط النشر في حراج رهط.\n\nيمكنك تعديله وإعادة إرساله في أي وقت.", button: "إعلاناتي" }, he: { subject: "המודעה לא פורסמה: {detail}", heading: "המודעה לא פורסמה", body: "שלום {name},\n\nהמודעה «{detail}» לא פורסמה כי אינה תואמת את תנאי הפרסום.\n\nאפשר לערוך ולשלוח שוב.", button: "המודעות שלי" }, en: { subject: "Your listing wasn't published: {detail}", heading: "Listing not published", body: "Hi {name},\n\nYour listing “{detail}” wasn't published because it doesn't meet our posting rules.\n\nYou can edit and resubmit it anytime.", button: "My listings" } },
  listing_expiring: { ar: { subject: "إعلانك ينتهي قريباً: {detail}", heading: "إعلانك على وشك الانتهاء", body: "مرحباً {name}،\n\nسينتهي ظهور إعلانك «{detail}» خلال أيام قليلة. جدّده بضغطة واحدة ليبقى ظاهراً.", button: "تجديد الإعلان" }, he: { subject: "המודעה שלך עומדת לפוג: {detail}", heading: "המודעה עומדת לפוג", body: "שלום {name},\n\nהמודעה «{detail}» תפוג בעוד כמה ימים. חדש אותה בלחיצה.", button: "חידוש המודעה" }, en: { subject: "Your listing expires soon: {detail}", heading: "Your listing expires soon", body: "Hi {name},\n\nYour listing “{detail}” will expire in a few days. Renew it with one tap to keep it visible.", button: "Renew listing" } },
  listing_expired: { ar: { subject: "انتهى إعلانك: {detail}", heading: "انتهت مدة إعلانك", body: "مرحباً {name}،\n\nانتهت مدة ظهور إعلانك «{detail}» في حراج رهط. إن كان ما زال متاحاً فجدّده الآن.", button: "تجديد الإعلان" }, he: { subject: "המודעה פגה: {detail}", heading: "המודעה פגה", body: "שלום {name},\n\nתוקף המודעה «{detail}» הסתיים. אם היא עדיין רלוונטית, חדש אותה.", button: "חידוש המודעה" }, en: { subject: "Your listing expired: {detail}", heading: "Your listing expired", body: "Hi {name},\n\nYour listing “{detail}” has expired. If it's still available, renew it now.", button: "Renew listing" } },
  comment_approved: { ar: { subject: "نُشر تعليقك في {site}", heading: "تم نشر تعليقك", body: "مرحباً {name}،\n\nتمت الموافقة على تعليقك وأصبح ظاهراً:\n\n«{detail}»\n\nشكراً لمشاركتك.", button: "عرض التعليق" }, he: { subject: "התגובה שלך פורסמה", heading: "התגובה פורסמה", body: "שלום {name},\n\nהתגובה שלך אושרה:\n\n«{detail}»", button: "צפייה" }, en: { subject: "Your comment is live", heading: "Your comment is published", body: "Hi {name},\n\nYour comment was approved:\n\n“{detail}”\n\nThanks for taking part.", button: "View comment" } },
  news_approved: { ar: { subject: "نُشر خبرك: {detail}", heading: "شكراً، نُشر خبرك", body: "مرحباً {name}،\n\nتمت مراجعة خبرك «{detail}» ونشره في أخبار القراء. شكراً لمساهمتك في نقل أخبار رهط.", button: "قراءة الخبر" }, he: { subject: "הידיעה שלך פורסמה: {detail}", heading: "הידיעה פורסמה", body: "שלום {name},\n\nהידיעה «{detail}» פורסמה בחדשות הקוראים. תודה!", button: "לקריאה" }, en: { subject: "Your news was published: {detail}", heading: "Your news is published", body: "Hi {name},\n\nYour story “{detail}” was reviewed and published in reader news. Thank you!", button: "Read it" } },
  news_rejected: { ar: { subject: "لم يُنشر خبرك: {detail}", heading: "لم يُنشر خبرك", body: "مرحباً {name}،\n\nشكراً لإرسالك «{detail}». بعد المراجعة لم نتمكن من نشره هذه المرة. نرحب دائماً بأخبارك القادمة.", button: "منشوراتي" }, he: { subject: "הידיעה לא פורסמה: {detail}", heading: "הידיעה לא פורסמה", body: "שלום {name},\n\nתודה ששלחת «{detail}». לאחר בדיקה לא נוכל לפרסם אותה הפעם.", button: "הפרסומים שלי" }, en: { subject: "Your news wasn't published: {detail}", heading: "Not published this time", body: "Hi {name},\n\nThanks for sending “{detail}”. After review we couldn't publish it this time. We'd welcome your next story.", button: "My posts" } },
  role_changed: { ar: { subject: "تغيّر دورك في {site}", heading: "تحديث صلاحيات حسابك", body: "مرحباً {name}،\n\nتم تغيير دورك في {site} إلى: {detail}.\n\nإن كان لديك أي استفسار فتواصل معنا.", button: "فتح الموقع" }, he: { subject: "התפקיד שלך עודכן", heading: "עדכון הרשאות", body: "שלום {name},\n\nהתפקיד שלך ב{site} שונה ל: {detail}.", button: "לאתר" }, en: { subject: "Your role changed on {site}", heading: "Your account role was updated", body: "Hi {name},\n\nYour role on {site} is now: {detail}.\n\nGet in touch if you have questions.", button: "Open site" } },
  blocked: { ar: { subject: "تم إيقاف حسابك في {site}", heading: "تم إيقاف حسابك", body: "مرحباً {name}،\n\nتم إيقاف حسابك في {site} مؤقتاً لمخالفة شروط الاستخدام، ولن تتمكن من تسجيل الدخول.\n\nإن كنت تعتقد أن ذلك حدث بالخطأ فتواصل معنا.", button: "تواصل معنا" }, he: { subject: "החשבון שלך הושעה", heading: "החשבון הושעה", body: "שלום {name},\n\nהחשבון שלך ב{site} הושעה בשל הפרת תנאי השימוש.\n\nאם זו טעות, צור קשר.", button: "צור קשר" }, en: { subject: "Your {site} account is suspended", heading: "Account suspended", body: "Hi {name},\n\nYour {site} account has been suspended for breaking the terms of use, and you can't sign in.\n\nIf you think this is a mistake, contact us.", button: "Contact us" } },
  unblocked: { ar: { subject: "أُعيد تفعيل حسابك في {site}", heading: "أهلاً بعودتك", body: "مرحباً {name}،\n\nتمت إعادة تفعيل حسابك في {site}، ويمكنك تسجيل الدخول من جديد.", button: "تسجيل الدخول" }, he: { subject: "החשבון שלך הופעל מחדש", heading: "ברוך שובך", body: "שלום {name},\n\nהחשבון שלך ב{site} הופעל מחדש.", button: "כניסה" }, en: { subject: "Your {site} account is active again", heading: "Welcome back", body: "Hi {name},\n\nYour {site} account is active again and you can sign in.", button: "Sign in" } },
  password_changed: { ar: { subject: "تم تغيير كلمة المرور · {site}", heading: "تم تغيير كلمة المرور", body: "مرحباً {name}،\n\nنؤكد أن كلمة مرور حسابك في {site} قد تغيّرت للتو.\n\nإن لم تقم بذلك فأعد تعيين كلمة المرور فوراً وتواصل معنا.", button: "إعادة تعيين" }, he: { subject: "הסיסמה שונתה · {site}", heading: "הסיסמה שונתה", body: "שלום {name},\n\nהסיסמה לחשבונך ב{site} שונתה כעת.\n\nאם לא אתה עשית זאת, אפס אותה מיד.", button: "איפוס" }, en: { subject: "Your password was changed · {site}", heading: "Password changed", body: "Hi {name},\n\nThe password for your {site} account was just changed.\n\nIf this wasn't you, reset it right away and contact us.", button: "Reset password" } },
};

// verify: kept ready, not sent (password accounts stay unverified by design; see auth/server.ts).
export const DEFAULT_TEMPLATES: EmailTemplates = {
  enabled: Object.fromEntries(EMAIL_KINDS.map((k) => [k, k !== "verify"])) as Record<EmailKind, boolean>,
  texts: DEFAULT_TEXTS,
};

const s = (v: unknown, n: number, f: string) => (typeof v === "string" && v.trim() ? v.replace(/[<>]/g, "").slice(0, n) : f);
export function sanitizeTemplates(input: unknown): EmailTemplates {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const texts = (i.texts ?? i) as Record<string, any>; // older shape: { welcomeEnabled, welcome, reset }
  const part = (kind: EmailKind) =>
    Object.fromEntries(
      EMAIL_LANGS.map((l) => {
        const d = DEFAULT_TEXTS[kind][l];
        const x = (texts[kind]?.[l] ?? {}) as Record<string, unknown>;
        return [l, { subject: s(x.subject, 150, d.subject), heading: s(x.heading, 120, d.heading), body: s(x.body, 3000, d.body), button: s(x.button, 50, d.button) }];
      }),
    ) as Record<EmailLang, EmailText>;
  const en = (i.enabled ?? {}) as Record<string, unknown>;
  return {
    enabled: Object.fromEntries(
      EMAIL_KINDS.map((k) => [k, typeof en[k] === "boolean" ? en[k] : k === "welcome" && i.welcomeEnabled === false ? false : DEFAULT_TEMPLATES.enabled[k]]),
    ) as Record<EmailKind, boolean>,
    texts: Object.fromEntries(EMAIL_KINDS.map((k) => [k, part(k)])) as Record<EmailKind, Record<EmailLang, EmailText>>,
  };
}
