#!/usr/bin/env python3
"""
Regenerate src/data/bus-schedule.ts from the Israel Ministry of Transport GTFS feed.

Keeps only Galim (agency 23) lines that serve Rahat and are listed in src/data/buses.ts,
for the next DAYS days. Run daily by .github/workflows/update-buses.yml.

Usage: python3 scripts/update-bus-schedule.py [path/to/israel-public-transportation.zip]
"""
import csv
import datetime as dt
import io
import json
import os
import re
import sys
import urllib.request
import zipfile
from collections import Counter, defaultdict
from zoneinfo import ZoneInfo

GTFS_URL = "https://gtfs.mot.gov.il/gtfsfiles/israel-public-transportation.zip"
AGENCY = "23"  # גלים / Galim in the MOT GTFS
DAYS = 14
TZ = ZoneInfo("Asia/Jerusalem")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "bus-schedule.ts")
LINES_TS = os.path.join(ROOT, "src", "data", "buses.ts")
SHAPES_DIR = os.path.join(ROOT, "public", "data", "bus-shapes")


def wanted_lines():
    text = open(LINES_TS, encoding="utf-8").read()
    return re.findall(r'number:\s*"([^"]+)"', text)


def rows(z, name):
    with z.open(name) as fh:
        yield from csv.DictReader(io.TextIOWrapper(fh, "utf-8-sig", newline=""))


def to_min(hhmmss):
    h, m, *_ = hhmmss.split(":")
    return int(h) * 60 + int(m)


def fmt(minutes):
    return f"{(minutes // 60) % 24:02d}:{minutes % 60:02d}"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/israel-public-transportation.zip"
    if not os.path.exists(path):
        print("downloading", GTFS_URL, flush=True)
        req = urllib.request.Request(GTFS_URL, headers={"User-Agent": "Mozilla/5.0 (rahatpost.com bus schedule)"})
        with urllib.request.urlopen(req, timeout=600) as res, open(path, "wb") as out:
            while chunk := res.read(1 << 20):
                out.write(chunk)
    z = zipfile.ZipFile(path)
    lines = wanted_lines()

    routes = {}
    for r in rows(z, "routes.txt"):
        # GTFS uses Hebrew letters in line names (4א); the site uses Arabic (4أ).
        name = r["route_short_name"].replace("א", "أ").replace("ב", "ب")
        if r["agency_id"] == AGENCY and name in lines and "רהט" in r["route_long_name"]:
            parts = r["route_desc"].split("-")
            routes[r["route_id"]] = {"line": name, "dir": parts[1] if len(parts) > 1 else "1"}
    if not routes:
        sys.exit("no Galim Rahat routes found — feed format changed?")

    trips = {}
    trip_shape = {}
    for t in rows(z, "trips.txt"):
        if t["route_id"] in routes:
            trips[t["trip_id"]] = (t["route_id"], t["service_id"])
            trip_shape[t["trip_id"]] = t.get("shape_id", "")
    services = {sid for _, sid in trips.values()}

    calendar = {}
    for c in rows(z, "calendar.txt"):
        if c["service_id"] in services:
            calendar[c["service_id"]] = c

    stop_times = defaultdict(list)
    for st in rows(z, "stop_times.txt"):
        if st["trip_id"] in trips:
            stop_times[st["trip_id"]].append((int(st["stop_sequence"]), st["stop_id"], to_min(st["departure_time"])))

    used_stops = {s for seq in stop_times.values() for _, s, _ in seq}
    stops = {}
    for s in rows(z, "stops.txt"):
        if s["stop_id"] in used_stops:
            city = re.search(r"עיר:\s*(.*?)\s*רציף:", s["stop_desc"] or "")
            stops[s["stop_id"]] = {
                "code": s["stop_code"],
                "he": s["stop_name"],
                "city": city.group(1) if city else "",
                "lat": round(float(s["stop_lat"]), 6),
                "lon": round(float(s["stop_lon"]), 6),
            }
    names = {v["he"] for v in stops.values()}
    arabic = {}
    for tr in rows(z, "translations.txt"):
        if tr["lang"] == "AR" and tr["trans_id"] in names:
            arabic[tr["trans_id"]] = tr["translation"]

    # Departures (from the first stop) per route-direction per service, and stop offsets.
    by_dir = defaultdict(lambda: defaultdict(list))  # (line, dir) -> service_id -> [start minutes]
    patterns = defaultdict(Counter)  # (line, dir) -> Counter(tuple(stop_ids))
    offsets = defaultdict(dict)  # (line, dir) -> pattern -> [offsets]
    shape_votes = defaultdict(Counter)  # (line, dir) -> Counter(shape_id)
    for trip_id, seq in stop_times.items():
        seq.sort()
        route_id, sid = trips[trip_id]
        key = (routes[route_id]["line"], routes[route_id]["dir"])
        start = seq[0][2]
        by_dir[key][sid].append(start)
        pat = tuple(s for _, s, _ in seq)
        patterns[key][pat] += 1
        offsets[key].setdefault(pat, [m - start for _, _, m in seq])
        if trip_shape.get(trip_id):
            shape_votes[key][trip_shape[trip_id]] += 1

    out_lines = []
    for line in lines:
        dirs = []
        for (l, d) in sorted(k for k in by_dir if k[0] == line):
            ranked = [p for p, _ in patterns[(l, d)].most_common()]
            seen, stop_list = set(), []
            for pat in ranked:  # main pattern first, then stops only other variants serve
                for sid, off in zip(pat, offsets[(l, d)][pat]):
                    code = stops[sid]["code"]
                    if code not in seen:
                        seen.add(code)
                        stop_list.append([code, off])
            first, last = stops[ranked[0][0]], stops[ranked[0][-1]]
            dirs.append({"dir": d, "from": first["code"], "to": last["code"], "stops": stop_list})
        if dirs:
            out_lines.append({"number": line, "dirs": dirs})

    today = dt.datetime.now(TZ).date()
    weekday_cols = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    pattern_ids, pattern_list = {}, []
    days = {}
    for i in range(DAYS):
        day = today + dt.timedelta(days=i)
        ymd = day.strftime("%Y%m%d")
        col = weekday_cols[day.weekday()]
        active = {sid for sid, c in calendar.items() if c[col] == "1" and c["start_date"] <= ymd <= c["end_date"]}
        entry = {}
        for (line, d), per_service in by_dir.items():
            starts = sorted({m for sid in active for m in per_service.get(sid, [])})
            if not starts:
                continue
            key = json.dumps(starts)
            if key not in pattern_ids:
                pattern_ids[key] = len(pattern_list)
                pattern_list.append([fmt(m) for m in starts])
            entry.setdefault(line, {})[d] = pattern_ids[key]
        days[day.isoformat()] = entry

    write_shapes(z, shape_votes)

    stop_out = {}
    for v in stops.values():
        stop_out[v["code"]] = {"he": v["he"], "ar": arabic.get(v["he"], ""), "city": v["city"], "lat": v["lat"], "lon": v["lon"]}

    data = {
        "source": "Israel Ministry of Transport GTFS (gtfs.mot.gov.il)",
        "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "agency": AGENCY,
        "lines": out_lines,
        "days": days,
        "patterns": pattern_list,
        "stops": dict(sorted(stop_out.items())),
    }
    # Only rewrite when the schedule itself changed (ignore generatedAt), to avoid daily no-op commits.
    if os.path.exists(OUT):
        try:
            old = json.loads(open(OUT, encoding="utf-8").read().split(" = ", 1)[1].rstrip().rstrip(";"))
            if {k: v for k, v in old.items() if k != "generatedAt"} == {k: v for k, v in data.items() if k != "generatedAt"}:
                print("schedule unchanged")
                return
        except Exception:
            pass
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("// Generated by scripts/update-bus-schedule.py from the MOT GTFS feed. Do not edit by hand.\n")
        fh.write('import type { BusSchedule } from "./bus-schedule-types";\n\n')
        fh.write("export const busSchedule: BusSchedule = ")
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
    print(f"wrote {OUT}: {len(out_lines)} lines, {len(stop_out)} stops, {len(pattern_list)} patterns, days {min(days)}..{max(days)}")


def shape_file(line):
    """ASCII file name for a line (4أ → 4a); mirrored by shapeFile() in src/lib/buses/map.ts."""
    return line.replace("أ", "a").replace("ب", "b")


def write_shapes(z, shape_votes):
    """Route geometry (most used GTFS shape per line/direction), thinned to ~15 m steps."""
    wanted = {key: votes.most_common(1)[0][0] for key, votes in shape_votes.items() if votes}
    ids = set(wanted.values())
    pts = defaultdict(list)
    if "shapes.txt" not in z.namelist():
        print("no shapes.txt in feed — skipping shapes")
        return
    for row in rows(z, "shapes.txt"):
        if row["shape_id"] in ids:
            pts[row["shape_id"]].append((int(row["shape_pt_sequence"]), float(row["shape_pt_lat"]), float(row["shape_pt_lon"])))
    out = {}
    for (line, d), sid in sorted(wanted.items()):
        seq = sorted(pts.get(sid, []))
        kept = []
        for _, lat, lon in seq:
            if kept:
                dy = (lat - kept[-1][0]) * 111_000
                dx = (lon - kept[-1][1]) * 95_000
                if dx * dx + dy * dy < 15 * 15:
                    continue
            kept.append([round(lat, 5), round(lon, 5)])
        if seq and kept[-1] != [round(seq[-1][1], 5), round(seq[-1][2], 5)]:
            kept.append([round(seq[-1][1], 5), round(seq[-1][2], 5)])
        if len(kept) >= 2:
            out.setdefault(line, {})[d] = kept
    os.makedirs(SHAPES_DIR, exist_ok=True)
    changed = 0
    for line, dirs in out.items():
        path = os.path.join(SHAPES_DIR, f"{shape_file(line)}.json")
        text = json.dumps({"source": "Israel Ministry of Transport GTFS shapes.txt", "line": line, "dirs": dirs}, ensure_ascii=False, separators=(",", ":"))
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        if old != text:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(text)
            changed += 1
    print(f"shapes: {len(out)} lines, {changed} file(s) changed")

if __name__ == "__main__":
    main()
