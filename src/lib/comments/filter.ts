import { COMMENT_MAX, COMMENT_MIN } from "./types";
import { tr } from "@/lib/i18n/core";

/**
 * Small curated filter for comments (Arabic incl. Palestinian/Negev dialect spellings, Hebrew,
 * English). Words are matched as whole tokens after normalisation, so innocent words that merely
 * contain a short bad word (e.g. «كسر», «كسب») pass. Phrases are matched on the normalised text.
 */
const BAD_WORDS = [
  // Arabic
  "كس",
  "كسك",
  "كسها",
  "كسمك",
  "كسامك",
  "كسختك",
  "زب",
  "زبي",
  "زبك",
  "طيز",
  "طيزك",
  "شرموط",
  "شرموطه",
  "شراميط",
  "قحبه",
  "قحاب",
  "عرص",
  "معرص",
  "منيوك",
  "منيوكه",
  "منيك",
  "نيك",
  "انيك",
  "بنيك",
  "خول",
  "لوطي",
  "متناك",
  "متناكه",
  "عاهره",
  "حقير",
  "تفو",
  // Hebrew
  "זונה",
  "זונות",
  "שרמוטה",
  "שרמוטות",
  "כוסית",
  "כוסאמק",
  "כוסעמק",
  "מניאק",
  "מזדיין",
  "תזדיין",
  "זין",
  "קוקסינל",
  "מטומטם",
  "אידיוט",
  "חרא",
  // English
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "pussy",
  "whore",
  "slut",
  "bastard",
  "nigger",
  "nigga",
  "faggot",
  "retard",
];

const BAD_PHRASES = [
  "كس امك",
  "كس اختك",
  "ابن الشرموطه",
  "ابن القحبه",
  "يلعن ابوك",
  "يلعن دينك",
  "يلعن امك",
  "ابن الكلب",
  "يا كلب",
  "يا حمار",
  "بن זונה",
  "כוס אמק",
  "כוס אמא שלך",
  "לך תזדיין",
  "בן זונה",
  "son of a bitch",
];

const SPAM_PHRASES = [
  "واتساب فقط",
  "اربح المال",
  "ربح سريع",
  "تداول العملات",
  "استثمار مضمون",
  "قروض سريعه",
  "casino",
  "forex",
  "telegram.me",
  "t.me/",
];

/** Lower-case, strip Arabic diacritics/tatweel, unify letter variants and squeeze repeats. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\p{Mn}/gu, "") // harakat, Hebrew niqqud and other combining marks
    .replace(/\u0640/g, "") // tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[@$0*]/g, (c) => ({ "@": "a", $: "s", "0": "o", "*": "" })[c] ?? c)
    .replace(/(\p{L})\1{2,}/gu, "$1"); // "شرمووووط" → "شرموط"
}

const BAD_SET = new Set(BAD_WORDS.map(normalize));
const PREFIXES = ["وال", "بال", "يا", "ال", "و", "ب", "ل", "ف", "ה", "ו", "ש"];

function badToken(token: string): boolean {
  if (BAD_SET.has(token)) return true;
  for (const p of PREFIXES) {
    if (token.startsWith(p) && token.length - p.length >= 2 && BAD_SET.has(token.slice(p.length)))
      return true;
  }
  return /^(fuck|motherfuck)/.test(token);
}

const URL_RE =
  /(https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(com|net|org|info|io|co|me|ly|xyz|online|site|shop|app|il|ps)(\/\S*)?)/gi;

export function countLinks(text: string): number {
  return (text.match(URL_RE) ?? []).length;
}

/** Arabic error message for a comment that can't be posted, or "" when it is fine. */
export function checkComment(body: string): string {
  const len = [...body].length;
  if (len < COMMENT_MIN) return tr("التعليق قصير جداً.");
  if (len > COMMENT_MAX) return tr("التعليق طويل. الحد {0} حرف.", COMMENT_MAX);
  if (countLinks(body) > 1) return tr("يُسمح برابط واحد فقط في التعليق.");
  const norm = normalize(body);
  const tokens = norm.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const spaced = ` ${tokens.join(" ")} `;
  if (tokens.some(badToken) || BAD_PHRASES.some((p) => spaced.includes(` ${normalize(p)} `)))
    return tr("التعليق يحتوي على كلمات غير لائقة. عدّله وحاول مجدداً.");
  if (SPAM_PHRASES.some((p) => norm.includes(normalize(p))))
    return tr("يبدو التعليق كإعلان أو رسالة مزعجة. للإعلانات استخدم قسم الإعلانات.");
  if (/(.)\1{9,}/u.test(body)) return tr("التعليق يحتوي على تكرار كثير.");
  if ((body.match(/\d/g) ?? []).length >= 9 && /0\d[\d\s-]{7,}/.test(body))
    return tr("لا تنشر أرقام هواتف في التعليقات. للإعلانات استخدم قسم الإعلانات.");
  return "";
}
