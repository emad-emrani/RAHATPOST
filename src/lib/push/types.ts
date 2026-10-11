export type PushTopic = "alerts" | "news" | "pharmacy";

export const PUSH_TOPICS: { key: PushTopic; label: string; hint: string }[] = [
  { key: "alerts", label: "تنبيهات عاجلة", hint: "انقطاع مياه أو كهرباء، طوارئ وإغلاقات" },
  { key: "news", label: "أخبار القراء الجديدة", hint: "عند نشر خبر جديد من أهالي رهط" },
  { key: "pharmacy", label: "صيدلية المناوبة", hint: "عند تحديث صيدلية الحراسة" },
];

export type PushTopics = Record<PushTopic, boolean>;

export type PushPayload = { title: string; body: string; url: string; tag?: string };

export type SendResult = {
  ok: boolean;
  sent: number;
  removed: number;
  failed: number;
  message?: string;
};
