import { adTypes } from "@/data/content";

export const adPostTypes = adTypes.filter((t) => t !== "الكل") as Exclude<
  (typeof adTypes)[number],
  "الكل"
>[];
export type AdType = (typeof adPostTypes)[number];
export type AdStatus = "pending" | "approved" | "rejected";

/** An approved ad as shown publicly (no user id, no internal fields). */
export type PublicAd = {
  id: string;
  type: string;
  title: string;
  description: string;
  price: string | null;
  neighborhood: string;
  phone: string;
  posterName: string;
  createdAt: string;
};

/** The owner's / admin's view of an ad. */
export type OwnAd = PublicAd & { status: AdStatus; updatedAt: string };

export type AdInput = {
  type: string;
  title: string;
  description: string;
  price: string;
  neighborhood: string;
  phone: string;
};

export const AD_STATUS_LABEL: Record<AdStatus, string> = {
  pending: "بانتظار المراجعة",
  approved: "منشور",
  rejected: "مرفوض",
};

export const AD_ID_RE = /^[a-f0-9]{16}$/;
