import { osmPlaces } from "@/data/directory";

/** One directory card: either a real OSM place or an owner-submitted, admin-approved business. */
export type DirectoryEntry = {
  slug: string;
  name: string;
  altName?: string;
  category: string;
  source: "osm" | "owner";
  /** Only owner entries the admin approved are verified. */
  verified: boolean;
  lat?: number;
  lon?: number;
  osm?: string;
  address?: string;
  area?: string;
  description?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type BusinessSubmission = {
  id: string;
  name: string;
  category: string;
  area: string;
  about: string;
  phone: string;
  status: SubmissionStatus;
  createdAt: string;
  decidedAt?: string;
};

/** Categories offered in the submit form and used for owner entries. */
export const ownerCategories = [
  "مطاعم ومقاهي",
  "بقالات",
  "صحة",
  "تعليم",
  "ملابس",
  "ورش",
  "سيارات ووقود",
  "مناسبات",
  "بنوك وصرّافات",
  "رياضة وترفيه",
  "خدمات",
] as const;

/** Display order for category chips (only categories that have entries are shown). */
export const categoryOrder = [
  "مطاعم ومقاهي",
  "بقالات",
  "صحة",
  "تعليم",
  "مساجد",
  "ملابس",
  "بنوك وصرّافات",
  "سيارات ووقود",
  "ورش",
  "مناسبات",
  "رياضة وترفيه",
  "خدمات عامة",
  "خدمات",
];

export function osmEntries(): DirectoryEntry[] {
  return osmPlaces.map((p) => ({ ...p, source: "osm" as const, verified: false }));
}

export function ownerEntry(s: BusinessSubmission): DirectoryEntry {
  return {
    slug: `biz-${s.id}`,
    name: s.name,
    category: s.category,
    source: "owner",
    verified: true,
    area: s.area,
    description: s.about,
    phone: s.phone,
  };
}

export function mapsUrl(entry: DirectoryEntry): string {
  if (entry.lat !== undefined && entry.lon !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entry.name} رهط`)}`;
}
