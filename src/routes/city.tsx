import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  House,
  LocateFixed,
  Plus,
  Search,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { adminWhoami } from "@/lib/team/api";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr } from "@/lib/i18n/core";

export interface GridCoord {
  x: number;
  y: number;
}

export const RESERVED_CENTER_COORDS: GridCoord[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function getNextSpiralCoordinate(occupiedList: GridCoord[]): GridCoord {
  let x = 0;
  let y = 0;
  let dx = 0;
  let dy = -1;
  for (let i = 0; i < 10000; i++) {
    const isOccupied =
      RESERVED_CENTER_COORDS.some((c) => c.x === x && c.y === y) ||
      occupiedList.some((c) => c.x === x && c.y === y);
    if (!isOccupied) return { x, y };
    if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
      const temp = dx;
      dx = -dy;
      dy = temp;
    }
    x += dx;
    y += dy;
  }
  return { x: 2, y: 2 };
}

export interface Resident {
  id: number;
  resident_number: number;
  username: string;
  display_name: string;
  neighborhood: string;
  tier: "founder" | "pioneer" | "resident" | "vip";
  house_style: "modern" | "heritage_tent" | "villa";
  grid_x: number;
  grid_y: number;
  social_platform: "app" | "facebook" | "instagram" | "x" | "tiktok";
  is_visible: boolean;
  created_at: string;
}

export interface Landmark {
  id: number;
  title: string;
  subtitle: string;
  landmark_type: "mosque" | "sponsor_shop" | "heritage_council";
  sponsor_url: string;
  badge_text: string;
  grid_x: number;
  grid_y: number;
  is_active: boolean;
}

export interface CitySettings {
  id: number;
  last_update_text: string;
  next_update_text: string;
  default_view_mode: "3D" | "2.5D";
  max_founders: number;
  announcement_text: string;
}

const INITIAL_LANDMARKS: Landmark[] = [
  {
    id: 1,
    title: "مسجد التقوى المركزي",
    subtitle: "قلب مدينة رهط بوست ونقطة التقاء الأهالي",
    landmark_type: "mosque",
    sponsor_url: "https://www.rahatpost.com/today",
    badge_text: "🕌 معلم مركزي",
    grid_x: 0,
    grid_y: 0,
    is_active: true,
  },
  {
    id: 2,
    title: "مضافة النقب (الشق)",
    subtitle: "مجلس الأصالة والقهوة العربية لأهل رهط والنقب",
    landmark_type: "heritage_council",
    sponsor_url: "https://www.rahatpost.com/social",
    badge_text: "⛺ تراثنا",
    grid_x: -1,
    grid_y: 0,
    is_active: true,
  },
  {
    id: 3,
    title: "دكان الأسبوع (مساحة راعية)",
    subtitle: "خصم 20% لزوار مدينة رهط بوست — اضغط للتصفح",
    landmark_type: "sponsor_shop",
    sponsor_url: "https://www.rahatpost.com/directory",
    badge_text: "🏪 دكان الأسبوع ✨",
    grid_x: 1,
    grid_y: 0,
    is_active: true,
  },
];

const INITIAL_SETTINGS: CitySettings = {
  id: 1,
  last_update_text: "اليوم",
  next_update_text: "مباشر",
  default_view_mode: "3D",
  max_founders: 1000,
  announcement_text:
    "أهلاً بكم في مدينة رهط بوست التفاعلية! لكل متابع ومشترك بيت باسمه في قلب المدينة.",
};

function generateInitialResidents(): Resident[] {
  const sample = [
    { u: "rahatpost", d: "رهط بوست الرسمي", style: "villa", tier: "vip", n: "وسط المدينة", p: "app" },
    { u: "coemad", d: "عماد أبو غيث", style: "heritage_tent", tier: "founder", n: "حارة المؤسسين", p: "app" },
    { u: "ahmed_negev", d: "أحمد الهزيل", style: "modern", tier: "founder", n: "حارة النور", p: "facebook" },
    { u: "khaled_rahat", d: "خالد القريناوي", style: "villa", tier: "founder", n: "حارة السلام", p: "instagram" },
    { u: "omar_99", d: "عمر الزيادنة", style: "heritage_tent", tier: "founder", n: "مضارب النقب", p: "x" },
    { u: "sami_alatawna", d: "سامي العطاونة", style: "modern", tier: "founder", n: "وسط المدينة", p: "tiktok" },
    { u: "yousef_abu_syam", d: "يوسف أبو صيام", style: "villa", tier: "vip", n: "حارة المؤسسين", p: "facebook" },
    { u: "mahmoud_alkamlat", d: "محمود الكملات", style: "heritage_tent", tier: "founder", n: "مضارب النقب", p: "instagram" },
  ];
  const occupied: GridCoord[] = [];
  return sample.map((item, idx) => {
    const coord = getNextSpiralCoordinate(occupied);
    occupied.push(coord);
    return {
      id: idx + 1,
      resident_number: idx + 1,
      username: item.u,
      display_name: item.d,
      neighborhood: item.n,
      tier: item.tier as Resident["tier"],
      house_style: item.style as Resident["house_style"],
      grid_x: coord.x,
      grid_y: coord.y,
      social_platform: item.p as Resident["social_platform"],
      is_visible: true,
      created_at: new Date().toISOString(),
    };
  });
}

const getSocialProfileUrl = (platform: string, username: string) => {
  const clean = username.replace("@", "").trim();
  switch (platform) {
    case "facebook":
      return `https://facebook.com/${clean}`;
    case "instagram":
      return `https://instagram.com/${clean}`;
    case "x":
      return `https://x.com/${clean}`;
    case "tiktok":
      return `https://tiktok.com/@${clean}`;
    default:
      return "https://www.rahatpost.com";
  }
};

const PLATFORM_BADGE: Record<Resident["social_platform"], { icon: string; label: string }> = {
  app: { icon: "📱", label: "تطبيق رهط بوست" },
  facebook: { icon: "📘", label: "Facebook" },
  instagram: { icon: "📸", label: "Instagram" },
  x: { icon: "𝕏", label: "X.com" },
  tiktok: { icon: "🎵", label: "TikTok" },
};

export const Route = createFileRoute("/city")({
  head: () =>
    seo({
      title: tr("مدينة رهط بوست التفاعلية 3D · لكل متابع بيت باسمه · رهط بوست"),
      description: tr(
        "استكشف مدينة رهط بوست التفاعلية ثلاثية الأبعاد (3D / 2.5D): مسجد التقوى المركزي، مضافة النقب، دكان الأسبوع، وبيوت متابعي ومؤسسي مجتمع رهط والنقب.",
      ),
      path: "/city",
      keywords: [
        "مدينة رهط بوست",
        "خريطة رهط ثلاثية الأبعاد",
        "مجتمع رهط والنقب",
        "رهط بوست 3D",
      ],
      jsonLd: [breadcrumbLd([{ name: tr("مدينة رهط بوست التفاعلية"), path: "/city" }])],
    }),
  component: CityPage,
});

export function CityPage() {
  const [residents, setResidents] = useState<Resident[]>(() => generateInitialResidents());
  const [landmarks, setLandmarks] = useState<Landmark[]>(() => INITIAL_LANDMARKS);
  const [settings, setSettings] = useState<CitySettings>(() => INITIAL_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  const [viewMode, setViewMode] = useState<"3D" | "2.5D">("3D");
  const [searchQuery, setSearchQuery] = useState("");
  const [notFoundAlert, setNotFoundAlert] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [activeTab, setActiveTab] = useState<"residents" | "bulk" | "landmarks" | "settings">("residents");
  const [saveToast, setSaveToast] = useState("");

  // Camera Pan, Zoom & 3D Rotation State
  const [camOffset, setCamOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [camZoom, setCamZoom] = useState<number>(1.05);
  const [camAngle, setCamAngle] = useState<number>(0.78); // 45 deg isometric angle
  const [camPitch, setCamPitch] = useState<number>(0.55); // vertical tilt
  const draggingRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Admin Form States
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [neighborhood, setNeighborhood] = useState("وسط المدينة");
  const [houseStyle, setHouseStyle] = useState<Resident["house_style"]>("modern");
  const [tierInput, setTierInput] = useState<Resident["tier"]>("founder");
  const [platform, setPlatform] = useState<Resident["social_platform"]>("app");
  const [bulkText, setBulkText] = useState("");

  // Hydrate from localStorage + Cloud PostgreSQL (/api/media?kind=rahat-city)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedRes = window.localStorage.getItem("rp_city_residents");
      if (savedRes) {
        const parsed = JSON.parse(savedRes);
        if (Array.isArray(parsed) && parsed.length > 0) setResidents(parsed);
      }
      const savedLand = window.localStorage.getItem("rp_city_landmarks");
      if (savedLand) {
        const parsed = JSON.parse(savedLand);
        if (Array.isArray(parsed) && parsed.length > 0) setLandmarks(parsed);
      }
      const savedSet = window.localStorage.getItem("rp_city_settings");
      if (savedSet) {
        const parsed = JSON.parse(savedSet);
        if (parsed && typeof parsed === "object") {
          setSettings((prev) => ({ ...prev, ...parsed }));
          if (parsed.default_view_mode === "2.5D" || parsed.default_view_mode === "3D") {
            setViewMode(parsed.default_view_mode);
          }
        }
      }
    } catch {}
    setHydrated(true);

    // Check if logged in as Owner Admin
    void adminWhoami()
      .then((r) => {
        if (r?.level === "owner") setAdminUnlocked(true);
      })
      .catch(() => {});

    // Fetch shared cloud city state from PostgreSQL
    void fetch(`/api/media?kind=rahat-city&_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const cd = d?.cityData;
        if (!cd || typeof cd !== "object") return;
        if (Array.isArray(cd.residents) && cd.residents.length > 0) {
          setResidents(cd.residents);
          try {
            window.localStorage.setItem("rp_city_residents", JSON.stringify(cd.residents));
          } catch {}
        }
        if (Array.isArray(cd.landmarks) && cd.landmarks.length > 0) {
          setLandmarks(cd.landmarks);
          try {
            window.localStorage.setItem("rp_city_landmarks", JSON.stringify(cd.landmarks));
          } catch {}
        }
        if (cd.settings && typeof cd.settings === "object") {
          setSettings((prev) => ({ ...prev, ...cd.settings }));
          try {
            window.localStorage.setItem("rp_city_settings", JSON.stringify(cd.settings));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const syncCityToCloud = useCallback(
    async (nextRes: Resident[], nextLand: Landmark[], nextSet: CitySettings) => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("rp_city_residents", JSON.stringify(nextRes));
          window.localStorage.setItem("rp_city_landmarks", JSON.stringify(nextLand));
          window.localStorage.setItem("rp_city_settings", JSON.stringify(nextSet));
        } catch {}
      }
      try {
        await fetch("/api/media?kind=rahat-city", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cityData: {
              residents: nextRes,
              landmarks: nextLand,
              settings: nextSet,
            },
          }),
        });
        setSaveToast("تم حفظ وتحديث المدينة مباشرة ✓");
        setTimeout(() => setSaveToast(""), 2600);
      } catch {}
    },
    [],
  );

  // Project 3D grid coordinate (gx, gy, gz) onto 2D screen offset relative to viewport center
  const projectIso = useCallback(
    (gx: number, gy: number, gz = 0) => {
      const tilePx = 78 * camZoom;
      const cosA = Math.cos(camAngle);
      const sinA = Math.sin(camAngle);
      const pitch = viewMode === "3D" ? camPitch : 0.65;
      const rx = gx * cosA - gy * sinA;
      const ry = (gx * sinA + gy * cosA) * pitch;
      const sx = rx * tilePx + camOffset.x;
      const sy = ry * tilePx - gz * (tilePx * 0.65) + camOffset.y;
      const depth = gx * sinA + gy * cosA;
      return { sx, sy, depth, scale: camZoom };
    },
    [camAngle, camOffset.x, camOffset.y, camPitch, camZoom, viewMode],
  );

  // Center camera on a grid coordinate
  const focusGridCoord = useCallback(
    (gx: number, gy: number) => {
      const tilePx = 78 * camZoom;
      const cosA = Math.cos(camAngle);
      const sinA = Math.sin(camAngle);
      const pitch = viewMode === "3D" ? camPitch : 0.65;
      const rx = gx * cosA - gy * sinA;
      const ry = (gx * sinA + gy * cosA) * pitch;
      setCamOffset({ x: -rx * tilePx, y: -ry * tilePx });
    },
    [camAngle, camPitch, camZoom, viewMode],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.replace("@", "").trim().toLowerCase();
    if (!q) return;
    const found = residents.find(
      (r) =>
        r.is_visible &&
        (r.username.toLowerCase() === q ||
          r.display_name.toLowerCase().includes(q) ||
          String(r.resident_number) === q),
    );
    if (found) {
      setSelectedLandmark(null);
      setSelectedResident(found);
      setNotFoundAlert(false);
      focusGridCoord(found.grid_x, found.grid_y);
    } else {
      setSelectedResident(null);
      setNotFoundAlert(true);
    }
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const occupied = residents.map((r) => ({ x: r.grid_x, y: r.grid_y }));
    const nextCoord = getNextSpiralCoordinate(occupied);
    const nextNum =
      residents.length > 0 ? Math.max(...residents.map((r) => r.resident_number)) + 1 : 1;
    const cleanUser = username.replace("@", "").trim();
    const newItem: Resident = {
      id: Date.now(),
      resident_number: nextNum,
      username: cleanUser,
      display_name: displayName.trim() || cleanUser,
      neighborhood,
      tier: tierInput,
      house_style: houseStyle,
      grid_x: nextCoord.x,
      grid_y: nextCoord.y,
      social_platform: platform,
      is_visible: true,
      created_at: new Date().toISOString(),
    };
    const nextList = [...residents, newItem];
    setResidents(nextList);
    await syncCityToCloud(nextList, landmarks, settings);
    setUsername("");
    setDisplayName("");
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    const occupied = residents.map((r) => ({ x: r.grid_x, y: r.grid_y }));
    let maxNum = residents.length > 0 ? Math.max(...residents.map((r) => r.resident_number)) : 0;
    const added: Resident[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split("|").map((p) => p.trim());
      const cleanUser = parts[0].replace("@", "").trim();
      if (!cleanUser) return;
      const dName = parts[1] || cleanUser;
      const plat = (parts[2] as Resident["social_platform"]) || platform;
      const coord = getNextSpiralCoordinate(occupied);
      occupied.push(coord);
      maxNum += 1;
      added.push({
        id: Date.now() + idx,
        resident_number: maxNum,
        username: cleanUser,
        display_name: dName,
        neighborhood,
        tier: "founder",
        house_style: idx % 3 === 0 ? "villa" : idx % 2 === 0 ? "heritage_tent" : "modern",
        grid_x: coord.x,
        grid_y: coord.y,
        social_platform: plat,
        is_visible: true,
        created_at: new Date().toISOString(),
      });
    });
    const nextList = [...residents, ...added];
    setResidents(nextList);
    await syncCityToCloud(nextList, landmarks, settings);
    setBulkText("");
    setActiveTab("residents");
  };

  const handleToggleResidentVis = async (id: number) => {
    const nextList = residents.map((r) =>
      r.id === id ? { ...r, is_visible: !r.is_visible } : r,
    );
    setResidents(nextList);
    await syncCityToCloud(nextList, landmarks, settings);
  };

  const handleDeleteResident = async (id: number) => {
    const nextList = residents.filter((r) => r.id !== id);
    setResidents(nextList);
    await syncCityToCloud(nextList, landmarks, settings);
  };

  // Sort all 3D entities back-to-front (Painter's algorithm) so 3D overlapping is 100% accurate
  const sortedSceneEntities = useMemo(() => {
    type SceneEntity =
      | { kind: "plot"; key: string; gx: number; gy: number; depth: number; sx: number; sy: number }
      | { kind: "landmark"; key: string; gx: number; gy: number; depth: number; sx: number; sy: number; data: Landmark }
      | { kind: "resident"; key: string; gx: number; gy: number; depth: number; sx: number; sy: number; data: Resident };

    const items: SceneEntity[] = [];
    const occupiedSet = new Set<string>();

    for (const l of landmarks) {
      if (!l.is_active) continue;
      occupiedSet.add(`${l.grid_x},${l.grid_y}`);
      const p = projectIso(l.grid_x, l.grid_y, 0);
      items.push({
        kind: "landmark",
        key: `land-${l.id}`,
        gx: l.grid_x,
        gy: l.grid_y,
        depth: p.depth + 0.1,
        sx: p.sx,
        sy: p.sy,
        data: l,
      });
    }

    for (const r of residents) {
      if (!r.is_visible) continue;
      occupiedSet.add(`${r.grid_x},${r.grid_y}`);
      const p = projectIso(r.grid_x, r.grid_y, 0);
      items.push({
        kind: "resident",
        key: `res-${r.id}`,
        gx: r.grid_x,
        gy: r.grid_y,
        depth: p.depth + 0.1,
        sx: p.sx,
        sy: p.sy,
        data: r,
      });
    }

    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        if (occupiedSet.has(`${x},${y}`)) continue;
        const p = projectIso(x, y, 0);
        items.push({
          kind: "plot",
          key: `plot-${x}-${y}`,
          gx: x,
          gy: y,
          depth: p.depth - 1,
          sx: p.sx,
          sy: p.sy,
        });
      }
    }

    return items.sort((a, b) => a.depth - b.depth);
  }, [landmarks, residents, projectIso]);

  if (showAdmin) {
    const requiredPin = "2026";
    if (!adminUnlocked) {
      return (
        <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
            <Shield className="mx-auto size-12 text-amber-400" />
            <h2 className="text-xl font-extrabold">لوحة تحكم مدينة رهط بوست</h2>
            <p className="text-xs font-semibold text-slate-400">
              أدخل رمز الإدارة لتعديل البيوت والمعالم والرعاة
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="رمز الدخول (2026)"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-center font-mono text-sm text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pinInput.trim() === requiredPin) setAdminUnlocked(true);
                }}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 font-extrabold text-slate-950"
              >
                دخول
              </button>
              <button
                type="button"
                onClick={() => setShowAdmin(false)}
                className="rounded-xl bg-slate-800 px-4 py-2.5 font-bold"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-amber-400">
                🏙️ إدارة مدينة رهط بوست التفاعلية
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                أي بيت أو معلم تضيفه هنا يُحفظ مباشرة في قاعدة البيانات ويظهر لجميع زوار الموقع والتطبيق
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saveToast ? (
                <span className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-extrabold text-emerald-300">
                  {saveToast}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setShowAdmin(false)}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950"
              >
                <ArrowRight className="size-4" /> العودة للمدينة 3D
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "residents" as const, label: `🏠 إدارة السكان (${residents.length})` },
              { id: "bulk" as const, label: "⚡ إضافة جماعية (Bulk)" },
              { id: "landmarks" as const, label: "🕌 المعالم والرعاة" },
              { id: "settings" as const, label: "⚙️ إعدادات المدينة" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold sm:text-sm ${
                  activeTab === t.id ? "bg-amber-500 text-slate-950" : "bg-slate-900 text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "residents" ? (
            <div className="space-y-4">
              <form
                onSubmit={handleAddSingle}
                className="grid grid-cols-1 gap-2.5 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-7"
              >
                <input
                  type="text"
                  placeholder="@username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="الاسم الظاهر فوق البيت"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Resident["social_platform"])}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="app">تطبيق رهط بوست</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="x">X.com</option>
                  <option value="tiktok">TikTok</option>
                </select>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="وسط المدينة">وسط المدينة</option>
                  <option value="حارة المؤسسين">حارة المؤسسين</option>
                  <option value="حارة السلام">حارة السلام</option>
                  <option value="حارة النور">حارة النور</option>
                  <option value="مضارب النقب">مضارب النقب</option>
                </select>
                <select
                  value={houseStyle}
                  onChange={(e) => setHouseStyle(e.target.value as Resident["house_style"])}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="modern">🏢 بيت عصري</option>
                  <option value="villa">🏡 فيلا فاخرة</option>
                  <option value="heritage_tent">⛺ بيت شعر (شق)</option>
                </select>
                <select
                  value={tierInput}
                  onChange={(e) => setTierInput(e.target.value as Resident["tier"])}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="founder">⭐ مؤسس</option>
                  <option value="vip">👑 VIP</option>
                  <option value="resident">🏠 ساكن</option>
                </select>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950"
                >
                  + إضافة بيت
                </button>
              </form>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {residents.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-white">
                        <span className="font-mono text-amber-400">#{r.resident_number}</span>{" "}
                        {r.display_name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        @{r.username} · {r.neighborhood} · {PLATFORM_BADGE[r.social_platform]?.icon}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleToggleResidentVis(r.id)}
                        className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-white"
                        title={r.is_visible ? "إخفاء" : "إظهار"}
                      >
                        {r.is_visible ? <Eye className="size-4" /> : <EyeOff className="size-4 text-red-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteResident(r.id)}
                        className="rounded-lg bg-slate-800 p-2 text-red-400 hover:bg-red-500/20"
                        title="حذف"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "bulk" ? (
            <form
              onSubmit={handleBulkAdd}
              className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-xs font-bold text-slate-300">
                ضع كل حساب في سطر مستقل بصيغة:{" "}
                <code className="rounded bg-slate-950 px-2 py-0.5 text-amber-400">
                  username | الاسم الظاهر | facebook/instagram/x/tiktok/app
                </code>
              </p>
              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-sm text-white"
                placeholder={"@ahmed | أحمد الهزيل | facebook\n@sami | سامي القريناوي | tiktok"}
                required
              />
              <button
                type="submit"
                className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-extrabold text-slate-950"
              >
                ⚡ بناء البيوت تلقائياً وحفظها
              </button>
            </form>
          ) : activeTab === "landmarks" ? (
            <div className="space-y-3">
              {landmarks.map((l, idx) => (
                <div
                  key={l.id}
                  className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-4"
                >
                  <input
                    type="text"
                    value={l.title}
                    onChange={(e) => {
                      const next = landmarks.map((item, i) =>
                        i === idx ? { ...item, title: e.target.value } : item,
                      );
                      setLandmarks(next);
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-bold text-white"
                  />
                  <input
                    type="text"
                    value={l.subtitle}
                    onChange={(e) => {
                      const next = landmarks.map((item, i) =>
                        i === idx ? { ...item, subtitle: e.target.value } : item,
                      );
                      setLandmarks(next);
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={l.sponsor_url}
                    onChange={(e) => {
                      const next = landmarks.map((item, i) =>
                        i === idx ? { ...item, sponsor_url: e.target.value } : item,
                      );
                      setLandmarks(next);
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-amber-300"
                  />
                  <button
                    type="button"
                    onClick={() => void syncCityToCloud(residents, landmarks, settings)}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950"
                  >
                    حفظ المعلم ✓
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-400">
                  شريط الترحيب والإعلان العلوي في المدينة:
                </label>
                <input
                  type="text"
                  value={settings.announcement_text}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, announcement_text: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => void syncCityToCloud(residents, landmarks, settings)}
                className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-extrabold text-slate-950"
              >
                حفظ إعدادات المدينة ✓
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-40 flex h-[100dvh] w-[100dvw] flex-col overflow-hidden bg-[#0b1120] text-slate-100 select-none"
    >
      <style>{`
        @keyframes rpCityFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes rpCityPulseGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(245, 158, 11, 0.35); }
          50% { box-shadow: 0 0 34px rgba(245, 158, 11, 0.8); }
        }
      `}</style>

      {/* Top Navigation & Search Header */}
      <header className="z-30 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2.5 backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
            title="العودة للرئيسية"
          >
            <ArrowRight className="size-4" />
          </Link>
          <div className="grid size-9 place-items-center rounded-xl bg-amber-400 font-black text-slate-950 shadow-md">
            🏙️
          </div>
          <div>
            <h1 className="text-sm font-black text-white sm:text-base">
              مدينة رهط بوست التفاعلية 3D
            </h1>
            <p className="text-[10.5px] font-bold text-amber-300">
              {residents.filter((r) => r.is_visible).length} بيت مؤسس · {landmarks.length} معالم مركزية
            </p>
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-1.5 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setNotFoundAlert(false);
              }}
              placeholder="ابحث عن بيتك (@username أو الاسم أو رقم البيت)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-300"
          >
            ابحث
          </button>
        </form>

        {/* View Mode & Admin Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const nextMode = viewMode === "3D" ? "2.5D" : "3D";
              setViewMode(nextMode);
              setCamPitch(nextMode === "3D" ? 0.55 : 0.68);
            }}
            className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-sm"
          >
            {viewMode === "2.5D" ? "🧊 عرض 3D" : "🗺️ عرض 2.5D"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdmin(true)}
            className="grid size-9 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-amber-400 hover:bg-slate-800"
            title="لوحة تحكم المدينة"
          >
            <Shield className="size-4" />
          </button>
        </div>
      </header>

      {/* Announcement Banner */}
      <div className="z-20 flex items-center justify-between gap-2 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 px-4 py-1.5 text-xs font-bold text-amber-200">
        <span className="truncate">✨ {settings.announcement_text}</span>
        {notFoundAlert ? (
          <span className="shrink-0 rounded-lg bg-red-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-red-300">
            لم يتم العثور على هذا الاسم — تواصل معنا لإضافة بيتك!
          </span>
        ) : null}
      </div>

      {/* Main Interactive 3D / 2.5D Isometric Viewport */}
      <main
        className="relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, #1e293b 0%, #0f172a 55%, #020617 100%)",
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-city-ui]")) return;
          draggingRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: camOffset.x,
            origY: camOffset.y,
          };
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current.active) return;
          const dx = e.clientX - draggingRef.current.startX;
          const dy = e.clientY - draggingRef.current.startY;
          setCamOffset({
            x: draggingRef.current.origX + dx,
            y: draggingRef.current.origY + dy,
          });
        }}
        onPointerUp={() => {
          draggingRef.current.active = false;
        }}
        onPointerCancel={() => {
          draggingRef.current.active = false;
        }}
        onWheel={(e) => {
          setCamZoom((z) => Math.min(2.1, Math.max(0.55, Number((z - e.deltaY * 0.0008).toFixed(2)))));
        }}
      >
        {/* Ambient Ground Grid Glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 size-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden
        />

        {/* 3D Isometric World Origin at Screen Center */}
        <div className="pointer-events-none absolute left-1/2 top-1/2">
          {hydrated
            ? sortedSceneEntities.map((ent) => {
                if (ent.kind === "plot") {
                  return (
                    <div
                      key={ent.key}
                      style={{
                        position: "absolute",
                        left: `${ent.sx}px`,
                        top: `${ent.sy}px`,
                        transform: `translate(-50%, -50%) scale(${camZoom}) rotateX(${
                          viewMode === "3D" ? 56 : 45
                        }deg) rotateZ(45deg)`,
                        width: "54px",
                        height: "54px",
                      }}
                      className="rounded-lg border border-slate-700/40 bg-slate-800/35"
                    />
                  );
                }

                if (ent.kind === "landmark") {
                  const l = ent.data;
                  const isSel = selectedLandmark?.id === l.id;
                  const iconEmoji =
                    l.landmark_type === "mosque"
                      ? "🕌"
                      : l.landmark_type === "heritage_council"
                        ? "⛺"
                        : "🏪";
                  const roofBg =
                    l.landmark_type === "mosque"
                      ? "from-amber-300 via-amber-400 to-yellow-600 border-amber-200"
                      : l.landmark_type === "heritage_council"
                        ? "from-stone-700 via-stone-800 to-amber-950 border-amber-400"
                        : "from-emerald-400 via-teal-500 to-cyan-600 border-emerald-200";

                  return (
                    <div
                      key={ent.key}
                      data-city-ui
                      onClick={() => {
                        setSelectedResident(null);
                        setSelectedLandmark(l);
                        focusGridCoord(l.grid_x, l.grid_y);
                      }}
                      style={{
                        position: "absolute",
                        left: `${ent.sx}px`,
                        top: `${ent.sy}px`,
                        transform: `translate(-50%, -78%) scale(${camZoom})`,
                        zIndex: Math.round((ent.depth + 20) * 100),
                      }}
                      className="pointer-events-auto flex cursor-pointer flex-col items-center group"
                    >
                      {/* Floating Landmark Badge */}
                      <div
                        style={{ animation: "rpCityFloat 3s infinite ease-in-out" }}
                        className={`mb-1.5 flex flex-col items-center rounded-2xl border-2 px-3 py-1 text-center shadow-2xl transition group-hover:scale-110 ${
                          isSel
                            ? "border-white bg-amber-400 text-slate-950"
                            : "border-amber-400/90 bg-slate-950/95 text-white"
                        }`}
                      >
                        <span className="text-[10px] font-black text-amber-400 group-hover:text-slate-950">
                          {l.badge_text}
                        </span>
                        <span className="whitespace-nowrap text-xs font-black">{l.title}</span>
                      </div>

                      {/* 3D Landmark Structure */}
                      <div
                        style={{ animation: "rpCityPulseGlow 3.2s infinite ease-in-out" }}
                        className={`relative flex size-16 items-center justify-center rounded-2xl border-2 bg-gradient-to-b ${roofBg} text-3xl shadow-2xl transition group-hover:scale-105`}
                      >
                        <span>{iconEmoji}</span>
                      </div>
                    </div>
                  );
                }

                // Resident 3D House
                const r = ent.data;
                const isSel = selectedResident?.id === r.id;
                const houseEmoji =
                  r.house_style === "villa"
                    ? "🏡"
                    : r.house_style === "heritage_tent"
                      ? "⛺"
                      : "🏠";
                const houseBoxCls =
                  r.tier === "vip"
                    ? "from-amber-400 via-yellow-500 to-amber-600 border-white text-slate-950"
                    : r.house_style === "villa"
                      ? "from-sky-400 via-blue-600 to-indigo-800 border-sky-200 text-white"
                      : r.house_style === "heritage_tent"
                        ? "from-amber-700 via-stone-800 to-stone-950 border-amber-400 text-amber-200"
                        : "from-slate-600 via-slate-700 to-slate-900 border-slate-300 text-white";

                return (
                  <div
                    key={ent.key}
                    data-city-ui
                    onClick={() => {
                      setSelectedLandmark(null);
                      setSelectedResident(r);
                      focusGridCoord(r.grid_x, r.grid_y);
                    }}
                    style={{
                      position: "absolute",
                      left: `${ent.sx}px`,
                      top: `${ent.sy}px`,
                      transform: `translate(-50%, -76%) scale(${camZoom})`,
                      zIndex: Math.round((ent.depth + 20) * 100),
                    }}
                    className="pointer-events-auto flex cursor-pointer flex-col items-center group"
                  >
                    {/* Floating Name Label Above House */}
                    <div
                      className={`mb-1 flex items-center gap-1 rounded-xl border px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap shadow-lg transition group-hover:scale-110 ${
                        isSel
                          ? "border-white bg-amber-400 text-slate-950 ring-4 ring-amber-400/40"
                          : "border-slate-700 bg-slate-950/90 text-white group-hover:border-amber-400"
                      }`}
                    >
                      <span className={isSel ? "font-black text-slate-950" : "font-mono text-amber-400"}>
                        #{r.resident_number}
                      </span>
                      <span>{r.display_name}</span>
                      <span>{PLATFORM_BADGE[r.social_platform]?.icon}</span>
                    </div>

                    {/* 3D Isometric House Cube */}
                    <div
                      className={`relative flex size-12 items-center justify-center rounded-2xl border-2 bg-gradient-to-b ${houseBoxCls} text-2xl shadow-xl transition group-hover:scale-110 ${
                        isSel ? "ring-4 ring-amber-400" : ""
                      }`}
                    >
                      <span>{houseEmoji}</span>
                      {r.tier === "vip" ? (
                        <span className="absolute -top-2 -right-2 text-xs">👑</span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            : null}
        </div>

        {/* Right Floating Camera Controls (Zoom / Rotate / Reset Center) */}
        <div
          data-city-ui
          className="pointer-events-auto absolute end-3 bottom-6 z-30 flex flex-col gap-2"
        >
          <button
            type="button"
            onClick={() => setCamZoom((z) => Math.min(2.1, Number((z + 0.2).toFixed(2))))}
            className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-slate-900/90 text-white shadow-xl backdrop-blur-md hover:bg-slate-800"
            title="تكبير"
          >
            <ZoomIn className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setCamZoom((z) => Math.max(0.55, Number((z - 0.2).toFixed(2))))}
            className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-slate-900/90 text-white shadow-xl backdrop-blur-md hover:bg-slate-800"
            title="تصغير"
          >
            <ZoomOut className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setCamAngle((a) => a + Math.PI / 4)}
            className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-slate-900/90 text-xs font-black text-amber-400 shadow-xl backdrop-blur-md hover:bg-slate-800"
            title="تدوير زاوية الرؤية 3D"
          >
            🔄 3D
          </button>
          <button
            type="button"
            onClick={() => {
              setCamOffset({ x: 0, y: 0 });
              setCamZoom(1.05);
            }}
            className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-amber-400 text-slate-950 shadow-xl hover:bg-amber-300"
            title="العودة لمركز المدينة (مسجد التقوى)"
          >
            <LocateFixed className="size-5" />
          </button>
        </div>

        {/* Selected Resident Popup Card */}
        {selectedResident ? (
          <div
            data-city-ui
            className="pointer-events-auto absolute bottom-6 left-1/2 z-30 w-[92%] max-w-md -translate-x-1/2 rounded-3xl border-2 border-amber-400 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-amber-400 px-2.5 py-0.5 font-mono text-xs font-black text-slate-950">
                    بيت #{selectedResident.resident_number}
                  </span>
                  <span className="rounded-xl bg-white/10 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    {selectedResident.neighborhood}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-black text-white">
                  {selectedResident.display_name}
                </h3>
                <p className="text-xs font-bold text-slate-400" dir="ltr">
                  @{selectedResident.username} · {PLATFORM_BADGE[selectedResident.social_platform]?.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResident(null)}
                className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <a
                href={getSocialProfileUrl(selectedResident.social_platform, selectedResident.username)}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
              >
                <span>زيارة الحساب ({PLATFORM_BADGE[selectedResident.social_platform]?.label})</span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        ) : null}

        {/* Selected Landmark Popup Card */}
        {selectedLandmark ? (
          <div
            data-city-ui
            className="pointer-events-auto absolute bottom-6 left-1/2 z-30 w-[92%] max-w-md -translate-x-1/2 rounded-3xl border-2 border-amber-400 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-xl bg-amber-400 px-2.5 py-0.5 text-xs font-black text-slate-950">
                  {selectedLandmark.badge_text}
                </span>
                <h3 className="mt-2 text-lg font-black text-white">{selectedLandmark.title}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  {selectedLandmark.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLandmark(null)}
                className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <a
                href={selectedLandmark.sponsor_url}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
              >
                <span>فتح الرابط المباشر</span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default CityPage;
