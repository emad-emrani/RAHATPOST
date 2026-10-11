/**
 * Directory guides: hand-checked, structured service guides (post office, National
 * Insurance, municipality…). Content lives in code so it is reviewed in PRs and easy to
 * update: edit the guide file, bump `checkedAt`, keep every link to an official source.
 */

export type GuideLink = {
  label: string;
  href: string;
  /** Short hint shown under the link, e.g. "بالعبرية". */
  note?: string;
};

export type GuideBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: string[] }
  | { kind: "note"; text: string; tone?: "info" | "alert" }
  | { kind: "links"; links: GuideLink[] };

/** One accordion row. */
export type GuideItem = {
  id: string;
  title: string;
  blocks: GuideBlock[];
};

export type GuideHours = { day: string; time: string };

/** A physical location (branch/office) with officially published details. */
export type GuideBranch = {
  id: string;
  name: string;
  /** Name exactly as published by the official source. */
  officialName: string;
  kind: string;
  address: string;
  officialAddress: string;
  phone?: string;
  fax?: string;
  hours: GuideHours[];
  services: string[];
  notes?: string[];
  /** Official page for this branch (hours, appointments). */
  url: string;
  appointmentUrl?: string;
  directionsUrl: string;
};

export type GuideSection = {
  id: string;
  title: string;
  /** lucide icon key, resolved by the page. */
  icon: "receipt" | "map-pin" | "landmark" | "info";
  intro?: string;
  items?: GuideItem[];
  branches?: GuideBranch[];
  /** Links shown under the section (e.g. official locator). */
  links?: GuideLink[];
};

export type Guide = {
  slug: string;
  /** H1 and card title. */
  title: string;
  /** One line under the card title in the directory. */
  cardSubtitle: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  /** ISO date (YYYY-MM-DD) when every fact and link was last checked. */
  checkedAt: string;
  sections: GuideSection[];
  disclaimer: string;
  sources: GuideLink[];
  /** Directory place slugs (OSM/owner) whose page should link to this guide. */
  relatedPlaces?: string[];
};
