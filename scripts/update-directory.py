#!/usr/bin/env python3
"""
Regenerate src/data/directory.ts with real named places inside Rahat's municipal
boundary from OpenStreetMap (Overpass API). Only facts present in OSM are kept:
no invented phones, hours, neighbourhoods or descriptions.

Run weekly by .github/workflows/update-directory.yml. Data © OpenStreetMap contributors (ODbL).
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

RAHAT_RELATION = 1379225  # boundary=administrative, name=רהט, admin_level=8
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
KEYS = ["amenity", "shop", "craft", "office", "healthcare", "leisure", "tourism", "club", "sport", "historic"]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "directory.ts")

SKIP = {
    "amenity": {"parking", "parking_entrance", "parking_space", "bench", "toilets", "waste_basket", "waste_disposal",
                "recycling", "shelter", "drinking_water", "fountain", "grave_yard", "bicycle_parking", "vending_machine",
                "telephone", "loading_dock", "motorcycle_parking"},
    "leisure": {"picnic_table", "slipway", "track"},
}

FOOD = {"restaurant", "fast_food", "cafe", "ice_cream", "bar", "food_court", "pub"}
GROCERY = {"supermarket", "convenience", "grocery", "greengrocer", "butcher", "bakery", "confectionery", "deli",
           "beverages", "kiosk", "pastry", "spices", "seafood", "dairy", "frozen_food", "nuts", "coffee", "water"}
HEALTH_AMENITY = {"pharmacy", "clinic", "doctors", "dentist", "hospital", "veterinary"}
EDU = {"school", "kindergarten", "college", "university", "childcare", "library", "language_school",
       "driving_school", "music_school", "training", "prep_school"}
MONEY = {"bank", "atm", "bureau_de_change", "money_transfer", "payment_centre"}
CARS_AMENITY = {"fuel", "car_wash", "charging_station", "car_rental"}
CARS_SHOP = {"car", "car_repair", "car_parts", "tyres", "motorcycle"}
CLOTHES = {"clothes", "shoes", "fabric", "tailor", "jewelry", "boutique", "bag", "fashion_accessories", "watches"}
WORKSHOP_SHOP = {"hardware", "doityourself", "building_materials", "paint", "trade", "glaziery"}
EVENTS = {"events_venue", "wedding_hall", "conference_centre"}
PUBLIC = {"police", "fire_station", "post_office", "townhall", "community_centre", "marketplace", "social_facility",
          "courthouse", "public_building", "social_centre", "arts_centre"}


def category(t):
    a, s = t.get("amenity"), t.get("shop")
    if a in FOOD:
        return "مطاعم ومقاهي"
    if s in GROCERY or s == "mall":
        return "بقالات"
    if a in HEALTH_AMENITY or "healthcare" in t or s in {"optician", "chemist", "medical_supply", "hearing_aids"}:
        return "صحة"
    if a in EDU:
        return "تعليم"
    if a == "place_of_worship":
        return "مساجد"
    if a in MONEY:
        return "بنوك وصرّافات"
    if a in CARS_AMENITY or s in CARS_SHOP:
        return "سيارات ووقود"
    if s in CLOTHES:
        return "ملابس"
    if "craft" in t or s in WORKSHOP_SHOP:
        return "ورش"
    if a in EVENTS or s == "wedding":
        return "مناسبات"
    if a in PUBLIC or t.get("office") == "government":
        return "خدمات عامة"
    if "leisure" in t or "sport" in t or "tourism" in t or "club" in t or "historic" in t:
        return "رياضة وترفيه"
    return "خدمات"


def query():
    parts = "".join(f'nwr["name"]["{k}"](area.a);' for k in KEYS)
    q = f"[out:json][timeout:180];area(id:{3600000000 + RAHAT_RELATION})->.a;({parts});out center tags;"
    body = urllib.parse.urlencode({"data": q}).encode()
    last = None
    for attempt in range(3):
        for ep in ENDPOINTS:
            try:
                req = urllib.request.Request(ep, data=body, headers={
                    "User-Agent": "rahatpost.com directory updater (github.com/emad-emrani/RAHATPOST)"})
                with urllib.request.urlopen(req, timeout=240) as res:
                    data = json.load(res)
                if "elements" in data:
                    return data
            except Exception as e:  # try the next mirror
                last = e
                print("overpass failed:", ep, e, file=sys.stderr)
        time.sleep(30)
    sys.exit(f"all Overpass endpoints failed: {last}")


def main():
    data = query()
    seen, places = set(), []
    for e in data["elements"]:
        t = e.get("tags", {})
        if any(t.get(k) in v for k, v in SKIP.items()):
            continue
        if not any(k in t for k in KEYS):
            continue
        name = t.get("name:ar") or t.get("name") or t.get("name:he")
        if not name:
            continue
        lat = e.get("lat", e.get("center", {}).get("lat"))
        lon = e.get("lon", e.get("center", {}).get("lon"))
        if lat is None or lon is None:
            continue
        slug = f"osm-{e['type'][0]}{e['id']}"
        if slug in seen:
            continue
        seen.add(slug)
        alt = [t[k] for k in ("name:he", "name") if t.get(k) and t[k] != name]
        street = t.get("addr:street")
        address = f"{street} {t.get('addr:housenumber', '')}".strip() if street else ""
        place = {
            "slug": slug,
            "name": name.strip(),
            "category": category(t),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "osm": f"https://www.openstreetmap.org/{e['type']}/{e['id']}",
        }
        if alt:
            place["altName"] = alt[0].strip()
        if address:
            place["address"] = address
        phone = t.get("phone") or t.get("contact:phone")
        if phone:
            place["phone"] = phone.split(";")[0].strip()
        site = t.get("website") or t.get("contact:website")
        if site:
            place["website"] = site.strip()
        if t.get("opening_hours"):
            place["openingHours"] = t["opening_hours"].strip()
        places.append(place)
    places.sort(key=lambda p: (p["category"], p["name"]))

    body = json.dumps(places, ensure_ascii=False, indent=1)
    header = (
        "// Generated by scripts/update-directory.py from OpenStreetMap (Overpass API). Do not edit by hand.\n"
        "// Data © OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright\n"
        'import type { OsmPlace } from "./directory-types";\n\n'
    )
    content = f"{header}export const osmPlaces: OsmPlace[] = {body};\n"
    if os.path.exists(OUT) and open(OUT, encoding="utf-8").read() == content:
        print(f"directory unchanged ({len(places)} places)")
        return
    if len(places) < 20:
        sys.exit(f"only {len(places)} places — refusing to overwrite (Overpass glitch?)")
    open(OUT, "w", encoding="utf-8").write(content)
    print(f"wrote {OUT}: {len(places)} places")


if __name__ == "__main__":
    main()
