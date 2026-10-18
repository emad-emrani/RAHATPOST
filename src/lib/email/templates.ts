/** Member e-mails (welcome, password reset): editable texts, shared by admin UI and server. */
export type EmailLang = "ar" | "he" | "en";
export type EmailKind = "welcome" | "reset";
export type EmailText = { subject: string; heading: string; body: string; button: string };
export type EmailTemplates = {
  welcomeEnabled: boolean;
  welcome: Record<EmailLang, EmailText>;
  reset: Record<EmailLang, EmailText>;
};

export const EMAIL_LANGS: EmailLang[] = ["ar", "he", "en"];
export const PLACEHOLDERS = ["{name}", "{site}", "{link}"] as const;

export const DEFAULT_TEMPLATES: EmailTemplates = {
  welcomeEnabled: true,
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
};

const s = (v: unknown, n: number, f: string) => (typeof v === "string" && v.trim() ? v.replace(/[<>]/g, "").slice(0, n) : f);
export function sanitizeTemplates(input: unknown): EmailTemplates {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const part = (kind: EmailKind) =>
    Object.fromEntries(
      EMAIL_LANGS.map((l) => {
        const d = DEFAULT_TEMPLATES[kind][l];
        const x = (i[kind]?.[l] ?? {}) as Record<string, unknown>;
        return [l, { subject: s(x.subject, 150, d.subject), heading: s(x.heading, 120, d.heading), body: s(x.body, 3000, d.body), button: s(x.button, 50, d.button) }];
      }),
    ) as Record<EmailLang, EmailText>;
  return { welcomeEnabled: i.welcomeEnabled !== false, welcome: part("welcome"), reset: part("reset") };
}
