/** A real place in Rahat from OpenStreetMap (see scripts/update-directory.py). */
export type OsmPlace = {
  slug: string;
  name: string;
  altName?: string;
  category: string;
  lat: number;
  lon: number;
  osm: string;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
};
