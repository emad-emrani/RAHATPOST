import { classifieds } from "@/data/content";
import type { PublicAd } from "./types";

/** What list views need, for both real ads and the labelled samples. */
export type ListAd = {
  id: string;
  type: string;
  title: string;
  neighborhood: string;
  price?: string | null;
  sample?: boolean;
  quiet?: boolean;
  posterName?: string;
  /** First photo key, for the list thumbnail. */
  photo?: string;
};

/** Real approved ads, or the «نموذج» samples only while there are no real ones. */
export function listAds(res: { ads: PublicAd[]; showSamples: boolean }): ListAd[] {
  return res.showSamples
    ? classifieds
    : res.ads.map((ad) => (ad.photos[0] ? { ...ad, photo: ad.photos[0] } : ad));
}
