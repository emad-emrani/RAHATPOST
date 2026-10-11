import { getSql } from "@/lib/db";
import type { PushTopic, PushTopics } from "./types";

export type SubscriptionRow = { endpoint: string; p256dh: string; auth: string };

const TOPIC_COLUMN: Record<PushTopic, string> = {
  alerts: "topic_alerts",
  news: "topic_news",
  pharmacy: "topic_pharmacy",
  replies: "topic_replies",
};

export async function upsertSubscription(
  sub: SubscriptionRow,
  topics: PushTopics,
  userId: string | null,
): Promise<void> {
  const sql = await getSql();
  await sql`insert into push_subscriptions (endpoint, p256dh, auth, user_id, topic_alerts, topic_news, topic_pharmacy, topic_replies)
    values (${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${userId}, ${topics.alerts}, ${topics.news}, ${topics.pharmacy}, ${topics.replies})
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
      user_id = coalesce(excluded.user_id, push_subscriptions.user_id),
      topic_alerts = excluded.topic_alerts, topic_news = excluded.topic_news,
      topic_pharmacy = excluded.topic_pharmacy,
      topic_replies = excluded.topic_replies, updated_at = now()`;
}

export async function getTopics(endpoint: string): Promise<PushTopics | null> {
  const sql = await getSql();
  const rows = await sql<{
    topic_alerts: boolean;
    topic_news: boolean;
    topic_pharmacy: boolean;
    topic_replies: boolean;
  }>`
    select topic_alerts, topic_news, topic_pharmacy, topic_replies from push_subscriptions
    where endpoint = ${endpoint}`;
  const r = rows[0];
  return r
    ? {
        alerts: r.topic_alerts,
        news: r.topic_news,
        pharmacy: r.topic_pharmacy,
        replies: r.topic_replies,
      }
    : null;
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from push_subscriptions where endpoint = ${endpoint}`;
}

export async function subscribersFor(topic: PushTopic): Promise<SubscriptionRow[]> {
  const sql = await getSql();
  return sql.query<SubscriptionRow>(
    `select endpoint, p256dh, auth from push_subscriptions where ${TOPIC_COLUMN[topic]} = true`,
  );
}

/** Subscriptions of one signed-in user that opted into `topic` (e.g. replies to my comments). */
export async function subscribersForUser(
  userId: string,
  topic: PushTopic,
): Promise<SubscriptionRow[]> {
  const sql = await getSql();
  return sql.query<SubscriptionRow>(
    `select endpoint, p256dh, auth from push_subscriptions
     where user_id = $1 and ${TOPIC_COLUMN[topic]} = true limit 20`,
    [userId],
  );
}

export type TopicCounts = {
  total: number;
  alerts: number;
  news: number;
  pharmacy: number;
  replies: number;
};

export async function countByTopic(): Promise<TopicCounts> {
  const sql = await getSql();
  const rows = await sql<TopicCounts>`
    select count(*)::int as total, count(*) filter (where topic_alerts)::int as alerts,
      count(*) filter (where topic_news)::int as news, count(*) filter (where topic_pharmacy)::int as pharmacy,
      count(*) filter (where topic_replies and user_id is not null)::int as replies
    from push_subscriptions`;
  const r = rows[0];
  return {
    total: Number(r?.total ?? 0),
    alerts: Number(r?.alerts ?? 0),
    news: Number(r?.news ?? 0),
    pharmacy: Number(r?.pharmacy ?? 0),
    replies: Number(r?.replies ?? 0),
  };
}
