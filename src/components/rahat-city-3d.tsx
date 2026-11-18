import { Link } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  House,
  LocateFixed,
  Palette,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { adminWhoami } from "@/lib/team/api";
import { tr } from "@/lib/i18n/core";

export interface GridCoord {
  x: number;
  y: number;
}

export type HouseStyleId =
  | "villa"
  | "modern"
  | "heritage_tent"
  | "palace"
  | "tower"
  | "garden_house"
  | "commercial_shop"
  | "classic_arab";

export type HouseColorId =
  | "yellow"
  | "white"
  | "gold"
  | "blue"
  | "emerald"
  | "terracotta"
  | "rose";

export type SocialPlatformId = "instagram" | "facebook" | "tiktok" | "x" | "app";

export interface Resident {
  id: number;
  resident_number: number;
  username: string;
  display_name: string;
  neighborhood: string;
  tier: "founder" | "pioneer" | "resident" | "vip";
  house_style: HouseStyleId;
  house_color?: HouseColorId;
  custom_url?: string;
  grid_x: number;
  grid_y: number;
  social_platform: SocialPlatformId;
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
  map_theme?: "rahat_light" | "desert_sand" | "night_gold";
  default_house_style?: HouseStyleId;
  default_house_color?: HouseColorId;
  show_traffic_lights?: boolean;
  show_street_signs?: boolean;
  max_founders: number;
  announcement_text: string;
}

export const HOUSE_STYLES_CATALOG: {
  id: HouseStyleId;
  label: string;
  shortLabel: string;
  emoji: string;
  desc: string;
}[] = [
  { id: "villa", label: "فيلا ملكية بطابقين", shortLabel: "فيلا ملكية", emoji: "🏡", desc: "فيلا فاخرة بطابقين مع شرفة وحديقة أمامية" },
  { id: "modern", label: "بيت عصري مودرن", shortLabel: "بيت مودرن", emoji: "🏢", desc: "تصميم هندسي حديث بواجهات زجاجية وإضاءة" },
  { id: "heritage_tent", label: "بيت شعر تراثي (شق)", shortLabel: "بيت شعر", emoji: "⛺", desc: "بيت شعر بدوي أصيل يجسّد كرم الضيافة في النقب" },
  { id: "palace", label: "قصر ذهبي فاخر VIP", shortLabel: "قصر ذهبي", emoji: "🏰", desc: "قصر بقبة ذهبية وأعمدة فخمة للمميزين" },
  { id: "tower", label: "برج سكني (عمارة رهط)", shortLabel: "برج سكني", emoji: "🏙️", desc: "مبنى متعدد الطوابق يعلو في سماء المدينة" },
  { id: "garden_house", label: "بيت بحديقة وأشجار نخيل", shortLabel: "بيت بحديقة", emoji: "🌴", desc: "منزل عائلي دافئ محاط بأشجار النخيل والزيتون" },
  { id: "commercial_shop", label: "متجر / معرض تجاري", shortLabel: "متجر تجاري", emoji: "🏪", desc: "مبنى تجاري مع لافتة مضيئة لأصحاب المصالح" },
  { id: "classic_arab", label: "بيت عربي أصيل بقناطر", shortLabel: "بيت عربي", emoji: "🕌", desc: "عمارة عربية تقليدية مع أقواس وقناطر جميلة" },
];

export const HOUSE_COLORS_CATALOG: {
  id: HouseColorId;
  label: string;
  roofHex: string;
  wallHex: string;
  sideHex: string;
  doorHex: string;
  badgeBg: string;
  badgeBorder: string;
}[] = [
  {
    id: "yellow",
    label: "أصفر رهط بوست",
    roofHex: "#f2c94c",
    wallHex: "#ffffff",
    sideHex: "#f1f5f9",
    doorHex: "#b45309",
    badgeBg: "#fef9c3",
    badgeBorder: "#eab308",
  },
  {
    id: "white",
    label: "أبيض وأصفر كلاسيكي",
    roofHex: "#eab308",
    wallHex: "#fffbeb",
    sideHex: "#fef3c7",
    doorHex: "#92400e",
    badgeBg: "#ffffff",
    badgeBorder: "#f2c94c",
  },
  {
    id: "gold",
    label: "ذهبي ملكي VIP",
    roofHex: "#d97706",
    wallHex: "#fef3c7",
    sideHex: "#fde68a",
    doorHex: "#78350f",
    badgeBg: "#fef3c7",
    badgeBorder: "#d97706",
  },
  {
    id: "blue",
    label: "أزرق سماوي",
    roofHex: "#0284c7",
    wallHex: "#f0f9ff",
    sideHex: "#e0f2fe",
    doorHex: "#0369a1",
    badgeBg: "#e0f2fe",
    badgeBorder: "#0284c7",
  },
  {
    id: "emerald",
    label: "أخضر زمردي",
    roofHex: "#059669",
    wallHex: "#ecfdf5",
    sideHex: "#d1fae5",
    doorHex: "#065f46",
    badgeBg: "#d1fae5",
    badgeBorder: "#059669",
  },
  {
    id: "terracotta",
    label: "قرميدي تراثي",
    roofHex: "#ea580c",
    wallHex: "#fff7ed",
    sideHex: "#ffedd5",
    doorHex: "#9a3412",
    badgeBg: "#ffedd5",
    badgeBorder: "#ea580c",
  },
  {
    id: "rose",
    label: "وردي عصري",
    roofHex: "#e11d48",
    wallHex: "#fff1f2",
    sideHex: "#ffe4e6",
    doorHex: "#9f1239",
    badgeBg: "#ffe4e6",
    badgeBorder: "#e11d48",
  },
];

export const PLATFORM_BADGE: Record<
  SocialPlatformId,
  { icon: string; label: string; color: string; bg: string; placeholder: string }
> = {
  instagram: {
    icon: "📸",
    label: "إنستغرام (Instagram)",
    color: "#e1306c",
    bg: "#fdf2f8",
    placeholder: "@username أو رابط حساب إنستغرام",
  },
  facebook: {
    icon: "📘",
    label: "فيسبوك (Facebook)",
    color: "#1877f2",
    bg: "#eff6ff",
    placeholder: "@username أو رابط صفحة/حساب فيسبوك",
  },
  tiktok: {
    icon: "🎵",
    label: "تيك توك (TikTok)",
    color: "#111827",
    bg: "#f3f4f6",
    placeholder: "@username أو رابط حساب تيك توك",
  },
  x: {
    icon: "𝕏",
    label: "منصة إكس (X)",
    color: "#0f172a",
    bg: "#f1f5f9",
    placeholder: "@username أو رابط حساب X",
  },
  app: {
    icon: "📱",
    label: "تطبيق رهط بوست",
    color: "#b45309",
    bg: "#fef9c3",
    placeholder: "@username في رهط بوست",
  },
};

export const CITY_STREETS_NEIGHBORHOODS = [
  "شارع صلاح الدين · وسط المدينة",
  "شارع السلام · حارة المؤسسين",
  "شارع عمر المختار · حي النور",
  "دوار التقوى · الساحة المركزية",
  "شارع النقب · مضارب النقب",
  "شارع السوق البلدي · الحي التجاري",
];

export const RESERVED_CENTER_COORDS: GridCoord[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
];

export function getNextSpiralCoordinate(occupiedList: GridCoord[]): GridCoord {
  // Generate organized grid coordinates in neat rows of 4 columns (-2, -1, 1, 2)
  for (let row = 1; row <= 200; row++) {
    for (const col of [-2, -1, 1, 2]) {
      const candidate = { x: col, y: row };
      const taken = occupiedList.some((c) => c.x === candidate.x && c.y === candidate.y);
      if (!taken) return candidate;
    }
  }
  return { x: 1, y: occupiedList.length + 1 };
}

const INITIAL_LANDMARKS: Landmark[] = [
  {
    id: 1,
    title: "مسجد التقوى المركزي",
    subtitle: "قلب مدينة رهط بوست ونقطة التقاء أهل البلد",
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
    badge_text: "⛺ تراثنا الأصيل",
    grid_x: -1,
    grid_y: 0,
    is_active: true,
  },
  {
    id: 3,
    title: "دكان الأسبوع (مساحة راعية)",
    subtitle: "عروض خاصة لمتابعي رهط بوست — اضغط للتصفح",
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
  map_theme: "rahat_light",
  default_house_style: "villa",
  default_house_color: "yellow",
  show_traffic_lights: true,
  show_street_signs: true,
  max_founders: 1000,
  announcement_text:
    "أهلاً بكم في مدينة رهط بوست التفاعلية! تجوّل في الشوارع والأحياء واضغط على أي بيت لزيارة حساب صاحبه على إنستغرام أو فيسبوك أو تيك توك.",
};

function generateInitialResidents(): Resident[] {
  const sample: {
    u: string;
    d: string;
    style: HouseStyleId;
    color: HouseColorId;
    tier: Resident["tier"];
    n: string;
    p: SocialPlatformId;
  }[] = [
    { u: "rahatpost", d: "رهط بوست الرسمي", style: "palace", color: "yellow", tier: "vip", n: "دوار التقوى · الساحة المركزية", p: "app" },
    { u: "coemad", d: "عماد أبو غيث", style: "villa", color: "gold", tier: "founder", n: "شارع السلام · حارة المؤسسين", p: "tiktok" },
    { u: "ahmed_negev", d: "أحمد الهزيل", style: "modern", color: "yellow", tier: "founder", n: "شارع صلاح الدين · وسط المدينة", p: "facebook" },
    { u: "khaled_rahat", d: "خالد القريناوي", style: "garden_house", color: "emerald", tier: "founder", n: "شارع عمر المختار · حي النور", p: "instagram" },
    { u: "omar_99", d: "عمر الزيادنة", style: "heritage_tent", color: "terracotta", tier: "founder", n: "شارع النقب · مضارب النقب", p: "tiktok" },
    { u: "sami_alatawna", d: "سامي العطاونة", style: "tower", color: "blue", tier: "founder", n: "شارع صلاح الدين · وسط المدينة", p: "instagram" },
    { u: "yousef_abu_syam", d: "يوسف أبو صيام", style: "commercial_shop", color: "yellow", tier: "vip", n: "شارع السوق البلدي · الحي التجاري", p: "facebook" },
    { u: "mahmoud_alkamlat", d: "محمود الكملات", style: "classic_arab", color: "white", tier: "founder", n: "شارع السلام · حارة المؤسسين", p: "instagram" },
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
      tier: item.tier,
      house_style: item.style,
      house_color: item.color,
      grid_x: coord.x,
      grid_y: coord.y,
      social_platform: item.p,
      is_visible: true,
      created_at: new Date().toISOString(),
    };
  });
}

export function parseSocialInput(
  rawInput: string,
  fallbackPlatform: SocialPlatformId,
): { username: string; platform: SocialPlatformId; customUrl?: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) return { username: "", platform: fallbackPlatform };
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const host = u.hostname.toLowerCase();
      const segs = u.pathname.split("/").filter(Boolean);
      const firstSeg = (segs[0] || "").replace(/^@/, "");
      if (host.includes("instagram.com")) {
        return { username: firstSeg || "instagram_user", platform: "instagram", customUrl: trimmed };
      }
      if (host.includes("facebook.com") || host.includes("fb.com")) {
        return { username: firstSeg || "facebook_user", platform: "facebook", customUrl: trimmed };
      }
      if (host.includes("tiktok.com")) {
        return { username: firstSeg || "tiktok_user", platform: "tiktok", customUrl: trimmed };
      }
      if (host.includes("x.com") || host.includes("twitter.com")) {
        return { username: firstSeg || "x_user", platform: "x", customUrl: trimmed };
      }
      return { username: firstSeg || u.hostname, platform: fallbackPlatform, customUrl: trimmed };
    } catch {
      // fall through
    }
  }
  return {
    username: trimmed.replace(/^@/, "").trim(),
    platform: fallbackPlatform,
  };
}

export const getSocialProfileUrl = (
  platform: SocialPlatformId,
  username: string,
  customUrl?: string,
) => {
  if (customUrl && /^https?:\/\//i.test(customUrl)) return customUrl;
  const clean = username.replace(/^@/, "").trim();
  switch (platform) {
    case "facebook":
      return `https://facebook.com/${clean}`;
    case "instagram":
      return `https://instagram.com/${clean}`;
    case "tiktok":
      return `https://tiktok.com/@${clean}`;
    case "x":
      return `https://x.com/${clean}`;
    default:
      return "https://www.rahatpost.com";
  }
};

/** Realistic 3D Isometric Architectural Renderer for all 8 House Shapes & 7 Colors */
export function ArchitecturalHouse3D({
  styleId,
  colorId = "yellow",
  tier,
  is3D = true,
  size = 96,
}: {
  styleId: HouseStyleId;
  colorId?: HouseColorId;
  tier?: Resident["tier"];
  is3D?: boolean;
  size?: number;
}) {
  const palette =
    HOUSE_COLORS_CATALOG.find((c) => c.id === colorId) ?? HOUSE_COLORS_CATALOG[0];

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: is3D ? "translateY(-6px)" : "none",
      }}
    >
      {/* Realistic 3D Ground Lawn Plot & Cast Shadow */}
      <div
        className="absolute inset-x-0.5 bottom-0 h-8 rounded-2xl border-2 border-[#eab308]/80 bg-gradient-to-b from-[#dcfce7] via-[#bbf7d0] to-[#86efac] shadow-[0_8px_16px_rgba(15,23,42,0.22)]"
        aria-hidden
      >
        {/* 3D Building Cast Shadow on Lawn */}
        <div className="absolute inset-x-3 top-1 h-4 rounded-xl bg-slate-900/20 blur-[2px]" />
        {/* Stone Driveway / Walkway */}
        <div className="mx-auto mt-3.5 h-4 w-5 rounded-t-sm border-x border-[#94a3b8] bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1]" />
      </div>

      {/* Realistic 3D Isometric SVG Building */}
      <svg
        viewBox="0 0 130 120"
        className="relative z-10 h-full w-full drop-shadow-[0_10px_10px_rgba(15,23,42,0.28)] transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-1"
      >
        <defs>
          <linearGradient id={`glass-${styleId}-${colorId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="55%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id={`shade-${styleId}-${colorId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.sideHex} />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {styleId === "heritage_tent" ? (
          /* ⛺ بيت شعر بدوي وتراثي ثلاثي الأبعاد */
          <g>
            {/* Back Tent Slope */}
            <polygon points="14,76 65,24 116,76" fill="#292524" stroke="#f2c94c" strokeWidth="2.5" />
            {/* 3D Right Side Flap */}
            <polygon points="65,24 116,76 106,92 65,80" fill="#1c1917" stroke="#eab308" strokeWidth="1.5" />
            {/* Front Bedouin Sadu Trim */}
            <polygon points="18,74 65,30 100,74" fill="#44403c" />
            <rect x="20" y="68" width="84" height="7" rx="2" fill={palette.roofHex} stroke="#78350f" strokeWidth="1.5" />
            {/* Warm Glowing Interior */}
            <polygon points="36,75 60,48 84,75 84,94 36,94" fill="#f59e0b" opacity="0.88" />
            <polygon points="44,94 60,60 76,94" fill="#fef3c7" opacity="0.7" />
            {/* Wooden Tent Poles & Ropes */}
            <line x1="20" y1="74" x2="8" y2="96" stroke="#78350f" strokeWidth="2.5" />
            <line x1="108" y1="74" x2="122" y2="96" stroke="#78350f" strokeWidth="2.5" />
            <line x1="60" y1="30" x2="60" y2="96" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
            {/* Campfire / Coffee Dallah */}
            <circle cx="60" cy="86" r="5.5" fill="#ef4444" opacity="0.9" />
            <circle cx="60" cy="85" r="3" fill="#fde047" />
          </g>
        ) : styleId === "palace" ? (
          /* 🏰 قصر ذهبي فاخر ثلاثي الأبعاد */
          <g>
            {/* 3D Right Wing Depth */}
            <polygon points="98,48 114,56 114,94 98,94" fill={`url(#shade-${styleId}-${colorId})`} stroke="#92400e" strokeWidth="2" />
            {/* Main Facade */}
            <rect x="16" y="48" width="82" height="46" rx="4" fill={palette.wallHex} stroke="#92400e" strokeWidth="2.2" />
            <rect x="28" y="34" width="58" height="60" rx="3" fill={palette.sideHex} stroke="#92400e" strokeWidth="2.2" />
            {/* 3D Golden Dome with Highlight */}
            <path d="M 35 35 Q 57 3 79 35 Z" fill={palette.roofHex} stroke="#78350f" strokeWidth="2.2" />
            <ellipse cx="52" cy="22" rx="6" ry="9" fill="#fef9c3" opacity="0.45" />
            <circle cx="57" cy="11" r="4" fill="#facc15" stroke="#78350f" strokeWidth="1.5" />
            {/* Columns & Grand Arch */}
            <rect x="33" y="42" width="5" height="50" fill="#fde68a" stroke="#92400e" strokeWidth="1.2" />
            <rect x="76" y="42" width="5" height="50" fill="#fde68a" stroke="#92400e" strokeWidth="1.2" />
            <path d="M 46 94 L 46 64 Q 57 52 68 64 L 68 94 Z" fill={palette.doorHex} stroke="#f2c94c" strokeWidth="2" />
            <rect x="20" y="58" width="9" height="16" rx="4.5" fill={`url(#glass-${styleId}-${colorId})`} stroke="#92400e" strokeWidth="1.5" />
            <rect x="85" y="58" width="9" height="16" rx="4.5" fill={`url(#glass-${styleId}-${colorId})`} stroke="#92400e" strokeWidth="1.5" />
          </g>
        ) : styleId === "tower" ? (
          /* 🏙️ برج سكني ثلاثي الأبعاد */
          <g>
            {/* 3D Right Wall */}
            <polygon points="82,18 106,28 106,94 82,94" fill={`url(#shade-${styleId}-${colorId})`} stroke="#1e293b" strokeWidth="2" />
            {/* 3D Roof Slab */}
            <polygon points="24,18 48,10 106,20 82,18" fill={palette.roofHex} stroke="#1e293b" strokeWidth="2" />
            {/* Front Tower */}
            <rect x="24" y="18" width="58" height="76" rx="3" fill={palette.wallHex} stroke="#1e293b" strokeWidth="2.2" />
            <rect x="22" y="13" width="62" height="7" rx="2" fill={palette.roofHex} stroke="#1e293b" strokeWidth="2" />
            {/* Windows on Front & Side */}
            {[26, 40, 54].map((wy) => (
              <g key={wy}>
                <rect x="30" y={wy} width="12" height="9" rx="1.5" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0369a1" strokeWidth="1" />
                <rect x="46" y={wy} width="12" height="9" rx="1.5" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0369a1" strokeWidth="1" />
                <rect x="62" y={wy} width="12" height="9" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
                <polygon points={`87,${wy + 3} 99,${wy + 7} 99,${wy + 13} 87,${wy + 9}`} fill="#38bdf8" opacity="0.7" />
              </g>
            ))}
            <rect x="44" y="73" width="18" height="21" rx="2" fill={palette.doorHex} stroke="#f2c94c" strokeWidth="1.5" />
          </g>
        ) : styleId === "modern" ? (
          /* 🏢 بيت عصري مودرن ثلاثي الأبعاد */
          <g>
            {/* 3D Right Side Depth */}
            <polygon points="90,28 108,36 108,94 90,94" fill={`url(#shade-${styleId}-${colorId})`} stroke="#1e293b" strokeWidth="2" />
            {/* Upper Box */}
            <rect x="18" y="28" width="72" height="30" rx="3" fill={palette.wallHex} stroke="#1e293b" strokeWidth="2.2" />
            <polygon points="16,28 34,20 108,28 90,28" fill={palette.roofHex} stroke="#1e293b" strokeWidth="2" />
            <rect x="16" y="24" width="76" height="6" rx="2" fill={palette.roofHex} stroke="#1e293b" strokeWidth="2" />
            {/* Lower Box */}
            <rect x="24" y="58" width="66" height="36" rx="2" fill={palette.sideHex} stroke="#1e293b" strokeWidth="2.2" />
            <rect x="26" y="34" width="44" height="18" rx="2" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="1.5" />
            <line x1="48" y1="34" x2="48" y2="52" stroke="#ffffff" strokeWidth="2" />
            <rect x="32" y="64" width="16" height="30" rx="2" fill={palette.doorHex} />
            <rect x="56" y="64" width="26" height="18" rx="2" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="1.5" />
          </g>
        ) : styleId === "garden_house" ? (
          /* 🌴 بيت بحديقة وأشجار نخيل ثلاثي الأبعاد */
          <g>
            <polygon points="94,48 110,56 110,94 94,94" fill={`url(#shade-${styleId}-${colorId})`} stroke="#1e293b" strokeWidth="2" />
            <polygon points="62,22 94,48 110,56 76,30" fill="#ca8a04" stroke="#1e293b" strokeWidth="1.5" />
            {/* Palm Tree */}
            <rect x="14" y="48" width="5" height="44" rx="2" fill="#78350f" />
            <circle cx="16" cy="42" r="12" fill="#16a34a" stroke="#15803d" strokeWidth="2" />
            <circle cx="24" cy="45" r="8" fill="#22c55e" />
            {/* House Body */}
            <rect x="30" y="48" width="64" height="46" rx="3" fill={palette.wallHex} stroke="#1e293b" strokeWidth="2.2" />
            <polygon points="24,50 62,22 100,50" fill={palette.roofHex} stroke="#1e293b" strokeWidth="2.2" />
            <rect x="38" y="58" width="14" height="14" rx="2.5" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="1.5" />
            <rect x="72" y="58" width="14" height="14" rx="2.5" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="1.5" />
            <rect x="55" y="64" width="14" height="30" rx="2.5" fill={palette.doorHex} />
          </g>
        ) : styleId === "commercial_shop" ? (
          /* 🏪 معرض تجاري ثلاثي الأبعاد */
          <g>
            <polygon points="94,36 112,44 112,94 94,94" fill={`url(#shade-${styleId}-${colorId})`} stroke="#1e293b" strokeWidth="2" />
            <rect x="20" y="36" width="74" height="58" rx="4" fill={palette.wallHex} stroke="#1e293b" strokeWidth="2.2" />
            <polygon points="14,52 22,34 94,34 102,52" fill={palette.roofHex} stroke="#1e293b" strokeWidth="2.2" />
            <rect x="28" y="20" width="58" height="14" rx="4" fill="#263238" stroke="#f2c94c" strokeWidth="2" />
            <circle cx="57" cy="27" r="3.5" fill="#f2c94c" />
            <rect x="26" y="58" width="36" height="26" rx="3" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="2" />
            <rect x="68" y="58" width="18" height="36" rx="2" fill={palette.doorHex} stroke="#f2c94c" strokeWidth="1.5" />
          </g>
        ) : styleId === "classic_arab" ? (
          /* 🕌 بيت عربي أصيل بقناطر ثلاثي الأبعاد */
          <g>
            <polygon points="94,40 112,48 112,94 94,94" fill={`url(#shade-${styleId}-${colorId})`} stroke="#78350f" strokeWidth="2" />
            <rect x="20" y="40" width="74" height="54" rx="3" fill={palette.wallHex} stroke="#78350f" strokeWidth="2.2" />
            <rect x="18" y="32" width="78" height="9" rx="2" fill={palette.roofHex} stroke="#78350f" strokeWidth="2" />
            <path d="M 27 90 L 27 60 Q 36 48 45 60 L 45 90 Z" fill="#fef08a" stroke="#78350f" strokeWidth="2" />
            <path d="M 48 94 L 48 56 Q 57 44 66 56 L 66 94 Z" fill={palette.doorHex} stroke="#78350f" strokeWidth="2" />
            <path d="M 69 90 L 69 60 Q 78 48 87 60 L 87 90 Z" fill="#fef08a" stroke="#78350f" strokeWidth="2" />
          </g>
        ) : (
          /* 🏡 فيلا ملكية بطابقين ثلاثية الأبعاد (Default villa) */
          <g>
            {/* 3D Side Extrusion */}
            <polygon points="94,52 112,60 112,94 94,94" fill={`url(#shade-${styleId}-${colorId})`} stroke="#1e293b" strokeWidth="2" />
            <polygon points="86,28 102,36 102,56 86,52" fill={`url(#shade-${styleId}-${colorId})`} stroke="#1e293b" strokeWidth="1.8" />
            <polygon points="56,8 94,30 106,36 68,14" fill="#ca8a04" stroke="#1e293b" strokeWidth="1.8" />
            {/* Second floor */}
            <rect x="26" y="28" width="60" height="26" rx="3" fill={palette.sideHex} stroke="#1e293b" strokeWidth="2.2" />
            <polygon points="18,30 56,8 94,30" fill={palette.roofHex} stroke="#1e293b" strokeWidth="2.2" />
            {/* First floor */}
            <rect x="18" y="52" width="76" height="42" rx="4" fill={palette.wallHex} stroke="#1e293b" strokeWidth="2.2" />
            <rect x="38" y="34" width="13" height="13" rx="2" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="1.5" />
            <rect x="60" y="34" width="13" height="13" rx="2" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="1.5" />
            <rect x="25" y="60" width="15" height="15" rx="2" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="1.5" />
            <rect x="72" y="60" width="15" height="15" rx="2" fill={`url(#glass-${styleId}-${colorId})`} stroke="#0284c7" strokeWidth="1.5" />
            <rect x="48" y="62" width="17" height="32" rx="3" fill={palette.doorHex} stroke="#f2c94c" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {tier === "vip" ? (
        <span className="absolute -top-2 -right-1 z-20 flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#f2c94c] text-xs shadow-md">
          👑
        </span>
      ) : null}
    </div>
  );
}

/** Realistic 3D Landmark Diorama Renderer (Mosque, Heritage Tent, Sponsor Shop) */
function Landmark3D({ type }: { type: Landmark["landmark_type"] }) {
  if (type === "mosque") {
    return (
      <div className="relative flex size-24 items-center justify-center select-none">
        <div className="absolute inset-x-1 bottom-0 h-8 rounded-2xl border-2 border-[#eab308] bg-gradient-to-b from-[#fef9c3] to-[#fde68a] shadow-lg" />
        <svg viewBox="0 0 130 120" className="relative z-10 h-full w-full drop-shadow-[0_10px_10px_rgba(15,23,42,0.28)]">
          {/* Minaret */}
          <rect x="14" y="22" width="14" height="72" rx="3" fill="#ffffff" stroke="#b45309" strokeWidth="2" />
          <path d="M 12 24 L 21 6 L 30 24 Z" fill="#f2c94c" stroke="#92400e" strokeWidth="2" />
          <rect x="12" y="38" width="18" height="5" rx="2" fill="#f2c94c" stroke="#92400e" strokeWidth="1.5" />
          {/* Main Mosque Hall + 3D Side */}
          <polygon points="104,48 118,56 118,94 104,94" fill="#e2e8f0" stroke="#92400e" strokeWidth="2" />
          <rect x="32" y="48" width="72" height="46" rx="4" fill="#ffffff" stroke="#92400e" strokeWidth="2.2" />
          {/* Grand Golden Dome */}
          <path d="M 42 48 Q 68 12 94 48 Z" fill="#f2c94c" stroke="#92400e" strokeWidth="2.2" />
          <ellipse cx="62" cy="34" rx="6" ry="9" fill="#fef9c3" opacity="0.5" />
          <circle cx="68" cy="18" r="3.5" fill="#facc15" stroke="#92400e" strokeWidth="1.5" />
          {/* Grand Arch Door */}
          <path d="M 56 94 L 56 64 Q 68 52 80 64 L 80 94 Z" fill="#b45309" stroke="#f2c94c" strokeWidth="2" />
          <rect x="38" y="60" width="10" height="16" rx="5" fill="#38bdf8" stroke="#92400e" strokeWidth="1.5" />
          <rect x="88" y="60" width="10" height="16" rx="5" fill="#38bdf8" stroke="#92400e" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }
  if (type === "heritage_council") {
    return (
      <div className="relative flex size-24 items-center justify-center select-none">
        <div className="absolute inset-x-1 bottom-0 h-8 rounded-2xl border-2 border-[#eab308] bg-gradient-to-b from-[#fef3c7] to-[#fde68a] shadow-lg" />
        <ArchitecturalHouse3D styleId="heritage_tent" colorId="terracotta" is3D size={92} />
      </div>
    );
  }
  return (
    <div className="relative flex size-24 items-center justify-center select-none">
      <div className="absolute inset-x-1 bottom-0 h-8 rounded-2xl border-2 border-[#eab308] bg-gradient-to-b from-[#dcfce7] to-[#bbf7d0] shadow-lg" />
      <ArchitecturalHouse3D styleId="commercial_shop" colorId="yellow" tier="vip" is3D size={92} />
    </div>
  );
}

/** Animated 3-Lamp Traffic Light Component (إشارة مرور تفاعلية) */
function TrafficLightWidget({ label }: { label?: string }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(2); // 0=red, 1=yellow, 2=green
  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => ((p + 1) % 3) as 0 | 1 | 2);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      data-city-ui
      onClick={() => setPhase((p) => ((p + 1) % 3) as 0 | 1 | 2)}
      title="إشارة مرور تفاعلية — اضغط لتبديل الإشارة"
      className="pointer-events-auto flex cursor-pointer flex-col items-center select-none group"
    >
      <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#f2c94c] bg-[#1e293b] px-1.5 py-1.5 shadow-lg transition group-hover:scale-110">
        <span
          className={`size-2.5 rounded-full transition ${
            phase === 0
              ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
              : "bg-red-950/60"
          }`}
        />
        <span
          className={`size-2.5 rounded-full transition ${
            phase === 1
              ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
              : "bg-amber-950/60"
          }`}
        />
        <span
          className={`size-2.5 rounded-full transition ${
            phase === 2
              ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
              : "bg-emerald-950/60"
          }`}
        />
      </div>
      <div className="h-4 w-1.5 bg-[#475569] rounded-b" />
      {label ? (
        <span className="mt-0.5 rounded bg-white/95 px-1.5 py-0.5 text-[9px] font-black text-[#263238] border border-[#f2c94c] shadow-2xs whitespace-nowrap">
          🚦 {label}
        </span>
      ) : null}
    </div>
  );
}

/** Shared Storage & Cloud Sync Hook for both /city and /admin */
export function useRahatCityState() {
  const [residents, setResidents] = useState<Resident[]>(() => generateInitialResidents());
  const [landmarks, setLandmarks] = useState<Landmark[]>(() => INITIAL_LANDMARKS);
  const [settings, setSettings] = useState<CitySettings>(() => INITIAL_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [saveToast, setSaveToast] = useState("");

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
        }
      }
    } catch {}
    setHydrated(true);

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
        setSaveToast("تم حفظ وتحديث مدينة رهط بوست مباشرة ✓");
        setTimeout(() => setSaveToast(""), 2800);
      } catch {}
    },
    [],
  );

  return {
    residents,
    setResidents,
    landmarks,
    setLandmarks,
    settings,
    setSettings,
    hydrated,
    saveToast,
    syncCityToCloud,
  };
}

/** Full City Control Panel — Used both inside /city and embedded inside /admin */
export function CityAdminPanelEmbedded({
  residents,
  setResidents,
  landmarks,
  setLandmarks,
  settings,
  setSettings,
  saveToast,
  syncCityToCloud,
  onClose,
}: {
  residents: Resident[];
  setResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  landmarks: Landmark[];
  setLandmarks: React.Dispatch<React.SetStateAction<Landmark[]>>;
  settings: CitySettings;
  setSettings: React.Dispatch<React.SetStateAction<CitySettings>>;
  saveToast: string;
  syncCityToCloud: (r: Resident[], l: Landmark[], s: CitySettings) => Promise<void>;
  onClose?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"build" | "residents" | "bulk" | "landmarks" | "settings">("build");
  const [socialInput, setSocialInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [neighborhood, setNeighborhood] = useState(CITY_STREETS_NEIGHBORHOODS[0]);
  const [houseStyle, setHouseStyle] = useState<HouseStyleId>(settings.default_house_style ?? "villa");
  const [houseColor, setHouseColor] = useState<HouseColorId>(settings.default_house_color ?? "yellow");
  const [tierInput, setTierInput] = useState<Resident["tier"]>("founder");
  const [platform, setPlatform] = useState<SocialPlatformId>("instagram");
  const [bulkText, setBulkText] = useState("");
  const [editingResidentId, setEditingResidentId] = useState<number | null>(null);

  const handleBuildHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseSocialInput(socialInput, platform);
    if (!parsed.username) return;
    const occupied = residents.map((r) => ({ x: r.grid_x, y: r.grid_y }));
    const nextCoord = getNextSpiralCoordinate(occupied);
    const nextNum =
      residents.length > 0 ? Math.max(...residents.map((r) => r.resident_number)) + 1 : 1;

    const newItem: Resident = {
      id: Date.now(),
      resident_number: nextNum,
      username: parsed.username,
      display_name: displayName.trim() || parsed.username,
      neighborhood,
      tier: tierInput,
      house_style: houseStyle,
      house_color: houseColor,
      custom_url: parsed.customUrl,
      grid_x: nextCoord.x,
      grid_y: nextCoord.y,
      social_platform: parsed.platform,
      is_visible: true,
      created_at: new Date().toISOString(),
    };
    const nextList = [...residents, newItem];
    setResidents(nextList);
    await syncCityToCloud(nextList, landmarks, settings);
    setSocialInput("");
    setDisplayName("");
  };

  const handleUpdateResidentField = async (
    id: number,
    patch: Partial<Resident>,
  ) => {
    const nextList = residents.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setResidents(nextList);
    await syncCityToCloud(nextList, landmarks, settings);
  };

  const handleApplyStyleToAll = async (styleId: HouseStyleId, colorId?: HouseColorId) => {
    const nextList = residents.map((r) => ({
      ...r,
      house_style: styleId,
      ...(colorId ? { house_color: colorId } : {}),
    }));
    const nextSet: CitySettings = {
      ...settings,
      default_house_style: styleId,
      ...(colorId ? { default_house_color: colorId } : {}),
    };
    setResidents(nextList);
    setSettings(nextSet);
    await syncCityToCloud(nextList, landmarks, nextSet);
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
      const rawUserOrLink = parts[0] || "";
      const chosenPlat = (parts[2] as SocialPlatformId) || platform;
      const parsed = parseSocialInput(rawUserOrLink, chosenPlat);
      if (!parsed.username) return;
      const dName = parts[1] || parsed.username;
      const chosenStyle = (parts[3] as HouseStyleId) || houseStyle;
      const coord = getNextSpiralCoordinate(occupied);
      occupied.push(coord);
      maxNum += 1;
      added.push({
        id: Date.now() + idx,
        resident_number: maxNum,
        username: parsed.username,
        display_name: dName,
        neighborhood,
        tier: "founder",
        house_style: chosenStyle,
        house_color: houseColor,
        custom_url: parsed.customUrl,
        grid_x: coord.x,
        grid_y: coord.y,
        social_platform: parsed.platform,
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

  const handleDeleteResident = async (id: number) => {
    const nextList = residents.filter((r) => r.id !== id);
    setResidents(nextList);
    await syncCityToCloud(nextList, landmarks, settings);
  };

  return (
    <div dir="rtl" className="space-y-5 rounded-3xl border-2 border-[#f2c94c] bg-white p-4 text-[#263238] shadow-md sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#f2c94c] text-2xl shadow-xs">
            🏙️
          </span>
          <div>
            <h2 className="text-lg font-black text-[#263238] sm:text-xl">
              لوحة التحكم الكاملة بمدينة رهط بوست 3D
            </h2>
            <p className="text-xs font-bold text-slate-500">
              ابنِ البيوت عبر إنستغرام أو فيسبوك أو تيك توك وتحكّم بشكل ولون كل بيت وشوارع المدينة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveToast ? (
            <span className="rounded-xl bg-emerald-100 border border-emerald-300 px-3 py-1.5 text-xs font-extrabold text-emerald-800">
              {saveToast}
            </span>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-2xl bg-[#f2c94c] px-4 py-2 text-xs font-black text-[#263238] shadow-xs transition hover:brightness-95"
            >
              <ArrowRight className="size-4" /> العودة لخريطة المدينة
            </button>
          ) : (
            <a
              href="/city"
              className="flex items-center gap-1.5 rounded-2xl bg-[#f2c94c] px-4 py-2 text-xs font-black text-[#263238] shadow-xs transition hover:brightness-95"
            >
              🏙️ فتح خريطة المدينة المباشرة
            </a>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "build" as const, label: "🏗️ بناء منزل جديد (إنستغرام / فيسبوك / تيك توك)" },
          { id: "residents" as const, label: `🏠 إدارة وتغيير شكل البيوت (${residents.length})` },
          { id: "bulk" as const, label: "⚡ بناء عدة بيوت دفعة واحدة" },
          { id: "landmarks" as const, label: "🕌 المعالم المركزية والرعاة" },
          { id: "settings" as const, label: "🚦 إعدادات الخريطة والشوارع والألوان" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold transition ${
              activeTab === t.id
                ? "bg-[#f2c94c] text-[#263238] shadow-xs ring-2 ring-[#263238]/15"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-[#fef9c3]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Build House via Instagram / Facebook / TikTok + Full Shape & Color Picker */}
      {activeTab === "build" ? (
        <form onSubmit={handleBuildHouse} className="space-y-5 rounded-3xl border border-slate-200 bg-[#fffdf5] p-4 sm:p-5">
          {/* Step 1: Choose Social Platform */}
          <div>
            <label className="mb-2 block text-xs font-black text-[#263238]">
              1. اختر منصة بناء المنزل (إنستغرام، فيسبوك، تيك توك، إكس، أو رهط بوست):
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(["instagram", "facebook", "tiktok", "x", "app"] as SocialPlatformId[]).map((pKey) => {
                const info = PLATFORM_BADGE[pKey];
                const active = platform === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setPlatform(pKey)}
                    className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-xs font-extrabold transition ${
                      active
                        ? "border-[#263238] bg-[#f2c94c] text-[#263238] shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#f2c94c]"
                    }`}
                  >
                    <span className="text-base">{info.icon}</span>
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Account Username or Link + Display Name + Street */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-black text-[#263238]">
                2. حساب {PLATFORM_BADGE[platform].label} (اسم المستخدم أو الرابط):
              </label>
              <input
                type="text"
                dir="ltr"
                value={socialInput}
                onChange={(e) => setSocialInput(e.target.value)}
                placeholder={PLATFORM_BADGE[platform].placeholder}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-[#263238] focus:border-[#f2c94c] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black text-[#263238]">
                الاسم الظاهر فوق البيت:
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثال: أحمد الهزيل / متجر النور"
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-[#263238] focus:border-[#f2c94c] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black text-[#263238]">
                الشارع / الحي في المدينة:
              </label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-[#263238] focus:border-[#f2c94c] focus:outline-none"
              >
                {CITY_STREETS_NEIGHBORHOODS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 3: Visual House Shape Selector (8 Shapes) */}
          <div>
            <label className="mb-2 block text-xs font-black text-[#263238]">
              3. اختر شكل وتصميم البيت (معاينة حية 3D):
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {HOUSE_STYLES_CATALOG.map((st) => {
                const selected = houseStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setHouseStyle(st.id)}
                    className={`flex flex-col items-center rounded-2xl border-2 p-3 text-center transition ${
                      selected
                        ? "border-[#263238] bg-[#fef9c3] shadow-sm ring-2 ring-[#f2c94c]"
                        : "border-slate-200 bg-white hover:border-[#f2c94c]"
                    }`}
                  >
                    <ArchitecturalHouse3D
                      styleId={st.id}
                      colorId={houseColor}
                      tier={tierInput}
                      size={68}
                    />
                    <span className="mt-1.5 text-xs font-black text-[#263238]">
                      {st.emoji} {st.shortLabel}
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold text-slate-500 line-clamp-1">
                      {st.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: House Color & Tier */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-black text-[#263238]">
                4. اختر لون سقف وواجهة البيت:
              </label>
              <div className="flex flex-wrap gap-2">
                {HOUSE_COLORS_CATALOG.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setHouseColor(c.id)}
                    className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition ${
                      houseColor === c.id
                        ? "border-[#263238] bg-[#fef9c3] text-[#263238] shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <span
                      className="size-4 rounded-full border border-black/20"
                      style={{ backgroundColor: c.roofHex }}
                    />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black text-[#263238]">
                5. فئة المنزل (الشارة):
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "founder" as const, label: "⭐ بيت مؤسس" },
                  { id: "vip" as const, label: "👑 قصر / VIP" },
                  { id: "resident" as const, label: "🏠 مواطن" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTierInput(t.id)}
                    className={`rounded-xl border-2 px-3.5 py-1.5 text-xs font-extrabold transition ${
                      tierInput === t.id
                        ? "border-[#263238] bg-[#f2c94c] text-[#263238]"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#f2c94c] py-3.5 text-sm font-black text-[#263238] shadow-sm transition hover:brightness-95 border-2 border-[#263238]"
          >
            🏗️ بناء وإضافة المنزل الآن في مدينة رهط بوست ({PLATFORM_BADGE[platform].label})
          </button>
        </form>
      ) : activeTab === "residents" ? (
        /* TAB 2: Manage & Change Shape/Color/Platform of Every Existing House */
        <div className="space-y-4">
          {/* Global One-Click Shape & Color Changer for All Houses */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#f2c94c] bg-[#fef9c3]/60 p-3.5">
            <div>
              <p className="text-xs font-black text-[#263238]">
                🎨 تغيير موحّد لشكل جميع البيوت الحالية دفعة واحدة (اختياري):
              </p>
              <p className="text-[11px] font-semibold text-slate-600">
                يمكنك توحيد شكل جميع البيوت أو تعديل كل بيت على حدة من البطاقات بالأسفل
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {HOUSE_STYLES_CATALOG.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => void handleApplyStyleToAll(st.id)}
                  className="rounded-xl border border-[#eab308] bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-[#263238] hover:bg-[#f2c94c] transition"
                >
                  {st.emoji} {st.shortLabel} للكل
                </button>
              ))}
            </div>
          </div>

          {/* Individual Houses Grid with Live Shape, Color & Platform Controls */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {residents.map((r) => {
              const isEditing = editingResidentId === r.id;
              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-[#f2c94c]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 rounded-2xl border border-[#f2c94c] bg-[#fffdf5] p-1">
                        <ArchitecturalHouse3D
                          styleId={r.house_style}
                          colorId={r.house_color ?? "yellow"}
                          tier={r.tier}
                          size={58}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-lg bg-[#f2c94c] px-2 py-0.5 font-mono text-[11px] font-black text-[#263238]">
                            #{r.resident_number}
                          </span>
                          <span className="truncate text-sm font-black text-[#263238]">
                            {r.display_name}
                          </span>
                        </div>
                        <p className="truncate text-xs font-bold text-slate-500 mt-0.5">
                          {PLATFORM_BADGE[r.social_platform]?.icon} @{r.username} · {r.neighborhood}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingResidentId(isEditing ? null : r.id)}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-[#fef9c3]"
                        title="تعديل الاسم والشارع"
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleUpdateResidentField(r.id, { is_visible: !r.is_visible })
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-[#fef9c3]"
                        title={r.is_visible ? "إخفاء البيت" : "إظهار البيت"}
                      >
                        {r.is_visible ? (
                          <Eye className="size-4 text-emerald-600" />
                        ) : (
                          <EyeOff className="size-4 text-red-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteResident(r.id)}
                        className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                        title="حذف البيت"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Direct Instant Controls for House Shape, Color & Platform */}
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2.5 text-xs">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500">
                        شكل البيت:
                      </label>
                      <select
                        value={r.house_style}
                        onChange={(e) =>
                          void handleUpdateResidentField(r.id, {
                            house_style: e.target.value as HouseStyleId,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-extrabold text-[#263238]"
                      >
                        {HOUSE_STYLES_CATALOG.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.emoji} {st.shortLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500">
                        لون البيت:
                      </label>
                      <select
                        value={r.house_color ?? "yellow"}
                        onChange={(e) =>
                          void handleUpdateResidentField(r.id, {
                            house_color: e.target.value as HouseColorId,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-extrabold text-[#263238]"
                      >
                        {HOUSE_COLORS_CATALOG.map((c) => (
                          <option key={c.id} value={c.id}>
                            🎨 {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500">
                        المنصة:
                      </label>
                      <select
                        value={r.social_platform}
                        onChange={(e) =>
                          void handleUpdateResidentField(r.id, {
                            social_platform: e.target.value as SocialPlatformId,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-extrabold text-[#263238]"
                      >
                        <option value="instagram">📸 إنستغرام</option>
                        <option value="facebook">📘 فيسبوك</option>
                        <option value="tiktok">🎵 تيك توك</option>
                        <option value="x">𝕏 إكس</option>
                        <option value="app">📱 رهط بوست</option>
                      </select>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-1 gap-2 rounded-xl bg-[#fef9c3]/50 p-2.5 sm:grid-cols-3">
                      <input
                        type="text"
                        value={r.display_name}
                        onChange={(e) =>
                          void handleUpdateResidentField(r.id, { display_name: e.target.value })
                        }
                        placeholder="الاسم الظاهر"
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={r.username}
                        onChange={(e) =>
                          void handleUpdateResidentField(r.id, {
                            username: e.target.value.replace(/^@/, ""),
                          })
                        }
                        placeholder="@username"
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                      />
                      <select
                        value={r.neighborhood}
                        onChange={(e) =>
                          void handleUpdateResidentField(r.id, { neighborhood: e.target.value })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                      >
                        {CITY_STREETS_NEIGHBORHOODS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === "bulk" ? (
        /* TAB 3: Bulk Build Houses */
        <form onSubmit={handleBulkAdd} className="space-y-3 rounded-2xl border border-slate-200 bg-[#fffdf5] p-5">
          <p className="text-xs font-extrabold text-[#263238]">
            أضف عدة بيوت دفعة واحدة (سطر لكل حساب بصيغة:{" "}
            <code className="rounded bg-[#fef9c3] px-2 py-0.5 text-[#b45309]">
              username أو الرابط | الاسم الظاهر | instagram/facebook/tiktok | شكل_البيت
            </code>
            ):
          </p>
          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3 font-mono text-xs text-[#263238]"
            placeholder={`@ahmed | أحمد الهزيل | instagram | villa\n@sami | سامي القريناوي | tiktok | palace\nhttps://facebook.com/rahatshop | معرض رهط | facebook | commercial_shop`}
            required
          />
          <button
            type="submit"
            className="rounded-2xl bg-[#f2c94c] px-6 py-3 text-xs font-black text-[#263238] border-2 border-[#263238] shadow-xs"
          >
            ⚡ بناء جميع البيوت وحفظها فوراً
          </button>
        </form>
      ) : activeTab === "landmarks" ? (
        /* TAB 4: Central Landmarks */
        <div className="space-y-3">
          {landmarks.map((l, idx) => (
            <div
              key={l.id}
              className="grid gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 sm:grid-cols-4"
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
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-extrabold text-[#263238]"
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
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-[#263238]"
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
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
              />
              <button
                type="button"
                onClick={() => void syncCityToCloud(residents, landmarks, settings)}
                className="rounded-xl bg-[#f2c94c] px-4 py-2 text-xs font-black text-[#263238] border border-[#263238]"
              >
                حفظ المعلم ✓
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* TAB 5: City Map Appearance, Traffic Lights, Street Signs & Theme */
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-[#fffdf5] p-5">
          <div>
            <label className="mb-1.5 block text-xs font-black text-[#263238]">
              شريط الترحيب والإعلان العلوي في المدينة:
            </label>
            <input
              type="text"
              value={settings.announcement_text}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, announcement_text: e.target.value }))
              }
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#263238]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-black text-[#263238]">
                مظهر وألوان الخريطة:
              </label>
              <select
                value={settings.map_theme ?? "rahat_light"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    map_theme: e.target.value as CitySettings["map_theme"],
                  }))
                }
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-[#263238]"
              >
                <option value="rahat_light">☀️ أبيض وأصفر رهط بوست (الافتراضي)</option>
                <option value="desert_sand">🏜️ رملي صحراوي النقب</option>
                <option value="night_gold">🌙 ليلي ذهبي</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs font-extrabold text-[#263238] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_traffic_lights !== false}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, show_traffic_lights: e.target.checked }))
                }
                className="size-4 accent-[#f2c94c]"
              />
              <span>🚦 إظهار إشارات المرور التفاعلية على التقاطعات</span>
            </label>

            <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs font-extrabold text-[#263238] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_street_signs !== false}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, show_street_signs: e.target.checked }))
                }
                className="size-4 accent-[#f2c94c]"
              />
              <span>🪧 إظهار لافتات الشوارع والدوارات</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void syncCityToCloud(residents, landmarks, settings)}
            className="rounded-2xl bg-[#f2c94c] px-6 py-3 text-xs font-black text-[#263238] border-2 border-[#263238] shadow-xs"
          >
            حفظ إعدادات الخريطة والشوارع ✓
          </button>
        </div>
      )}
    </div>
  );
}

export function CityPage() {
  const {
    residents,
    setResidents,
    landmarks,
    setLandmarks,
    settings,
    setSettings,
    saveToast,
    syncCityToCloud,
  } = useRahatCityState();

  const [viewMode, setViewMode] = useState<"3D" | "2.5D">("3D");
  const [searchQuery, setSearchQuery] = useState("");
  const [notFoundAlert, setNotFoundAlert] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // Smooth Camera Pan, Zoom, 3D Tilt & Rotation State
  const [camOffset, setCamOffset] = useState<{ x: number; y: number }>({ x: 0, y: -20 });
  const [camZoom, setCamZoom] = useState<number>(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 0.64 : 0.92,
  );
  const [camRotateZ, setCamRotateZ] = useState<number>(-10);
  const [isDragging, setIsDragging] = useState(false);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(0.8);
  const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    void adminWhoami()
      .then((r) => {
        if (r?.level === "owner" || r?.level === "admin") setAdminUnlocked(true);
      })
      .catch(() => {});
  }, []);

  const visibleResidents = useMemo(
    () => residents.filter((r) => r.is_visible),
    [residents],
  );

  const getResidentWorldPos = useCallback((index: number) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const xMap = [-305, -120, 120, 305];
    const wx = xMap[col] ?? 120;
    const wy = 120 + row * 190;
    return { wx, wy, row, col };
  }, []);

  const getLandmarkWorldPos = useCallback((l: Landmark, idx: number) => {
    const xPositions = [0, -255, 255];
    const wx =
      l.grid_x === 0
        ? 0
        : l.grid_x < 0
          ? -255
          : l.grid_x > 0
            ? 255
            : (xPositions[idx % 3] ?? 0);
    const wy = -135;
    return { wx, wy };
  }, []);

  const focusWorldPos = useCallback(
    (wx: number, wy: number) => {
      setCamOffset({
        x: -wx * camZoom,
        y: -wy * camZoom,
      });
    },
    [camZoom],
  );

  const panBy = useCallback((dx: number, dy: number) => {
    setCamOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.replace("@", "").trim().toLowerCase();
    if (!q) return;
    const idx = visibleResidents.findIndex(
      (r) =>
        r.username.toLowerCase() === q ||
        r.display_name.toLowerCase().includes(q) ||
        String(r.resident_number) === q,
    );
    if (idx !== -1) {
      const found = visibleResidents[idx];
      const pos = getResidentWorldPos(idx);
      setSelectedLandmark(null);
      setSelectedResident(found);
      setNotFoundAlert(false);
      focusWorldPos(pos.wx, pos.wy);
    } else {
      setSelectedResident(null);
      setNotFoundAlert(true);
    }
  };

  const totalRows = Math.max(3, Math.ceil(visibleResidents.length / 4));
  const mapTheme = settings.map_theme ?? "rahat_light";

  const skyBgStyle =
    mapTheme === "night_gold"
      ? "linear-gradient(180deg, #020617 0%, #0f172a 45%, #1e293b 100%)"
      : mapTheme === "desert_sand"
        ? "linear-gradient(180deg, #bae6fd 0%, #fef3c7 40%, #fde68a 100%)"
        : "linear-gradient(180deg, #e0f2fe 0%, #fffdf7 45%, #fef9c3 100%)";

  if (showAdmin) {
    const requiredPin = "2026";
    if (!adminUnlocked) {
      return (
        <div
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-[#fffdf5] p-4 text-[#263238]"
        >
          <div className="w-full max-w-sm space-y-4 rounded-3xl border-2 border-[#f2c94c] bg-white p-6 text-center shadow-xl">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f2c94c] text-[#263238] shadow-sm">
              <Shield className="size-7" />
            </div>
            <h2 className="text-xl font-black text-[#263238]">
              لوحة تحكم مدينة رهط بوست
            </h2>
            <p className="text-xs font-bold text-slate-500">
              أدخل رمز الإدارة (2026) لتعديل شكل البيوت وإضافة منازل عبر إنستغرام وفيسبوك وتيك توك
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="رمز الدخول (2026)"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-center font-mono text-sm font-bold text-[#263238] focus:border-[#f2c94c] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pinInput.trim() === requiredPin) setAdminUnlocked(true);
                }}
                className="flex-1 rounded-2xl bg-[#f2c94c] py-2.5 text-xs font-black text-[#263238] border border-[#263238]"
              >
                دخول اللوحة
              </button>
              <button
                type="button"
                onClick={() => setShowAdmin(false)}
                className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div dir="rtl" className="min-h-screen bg-[#f8fafc] p-3 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <CityAdminPanelEmbedded
            residents={residents}
            setResidents={setResidents}
            landmarks={landmarks}
            setLandmarks={setLandmarks}
            settings={settings}
            setSettings={setSettings}
            saveToast={saveToast}
            syncCityToCloud={syncCityToCloud}
            onClose={() => setShowAdmin(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex h-[100dvh] w-[100dvw] flex-col overflow-hidden bg-[#fffdf7] text-[#263238] select-none"
    >
      <style>{`
        @keyframes rpCarDriveX {
          0% { transform: translateX(-460px); }
          100% { transform: translateX(460px); }
        }
        @keyframes rpCarDriveXRev {
          0% { transform: translateX(460px) scaleX(-1); }
          100% { transform: translateX(-460px) scaleX(-1); }
        }
        @keyframes rpCarDriveY {
          0% { transform: translateY(-240px); }
          100% { transform: translateY(580px); }
        }
      `}</style>

      {/* Top Header Bar */}
      <header className="z-30 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#f2c94c] bg-white/95 px-3 py-2 shadow-xs backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-2xl border-2 border-[#263238] bg-[#f2c94c] px-2.5 py-1.5 text-xs font-black text-[#263238] shadow-2xs transition hover:brightness-95"
            title="الرجوع للصفحة الرئيسية"
          >
            <ArrowRight className="size-4" />
            <span>🏠 الرئيسية</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl border border-[#eab308] bg-[#fef9c3] text-base shadow-2xs">
              🏙️
            </div>
            <div>
              <h1 className="text-xs font-black text-[#263238] sm:text-sm">
                مدينة رهط بوست 3D{" "}
                <span className="rounded-md bg-[#f2c94c] px-1.5 py-0.5 text-[9px] font-black text-[#263238]">
                  واقعي
                </span>
              </h1>
              <p className="text-[10px] font-extrabold text-[#b45309]">
                {visibleResidents.length} بيت · اسحب بإصبعك للتجول
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-1.5 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setNotFoundAlert(false);
            }}
            placeholder="ابحث عن بيت أو @اسم..."
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#263238] placeholder:text-slate-400 focus:border-[#f2c94c] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border border-[#263238] bg-[#f2c94c] px-3 py-1.5 text-xs font-black text-[#263238]"
          >
            ابحث
          </button>
        </form>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = viewMode === "3D" ? "2.5D" : "3D";
              setViewMode(next);
              if (next === "2.5D") setCamRotateZ(0);
              else setCamRotateZ(-10);
            }}
            className="rounded-xl border border-[#263238] bg-[#fef9c3] px-2.5 py-1.5 text-[11px] font-black text-[#263238]"
          >
            {viewMode === "2.5D" ? "🎲 3D واقعي" : "🗺️ 2.5D"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdmin(true)}
            className="inline-flex items-center gap-1 rounded-xl border-2 border-[#263238] bg-[#263238] px-2.5 py-1.5 text-[11px] font-black text-[#f2c94c]"
          >
            <Settings className="size-3.5" />
            <span>لوحة المدينة</span>
          </button>
        </div>
      </header>

      {/* Quick-Jump Places Bar so users can fly directly to any landmark or house! */}
      <div className="z-20 flex items-center gap-1.5 overflow-x-auto border-b border-[#eab308]/40 bg-gradient-to-l from-[#fef9c3] via-white to-[#fef9c3] px-3 py-1.5 text-[11px] font-black text-[#263238] no-scrollbar">
        <span className="shrink-0 text-[#b45309]">📍 انتقل إلى:</span>
        {landmarks
          .filter((l) => l.is_active)
          .map((l, idx) => (
            <button
              key={`jump-l-${l.id}`}
              type="button"
              onClick={() => {
                const pos = getLandmarkWorldPos(l, idx);
                setSelectedResident(null);
                setSelectedLandmark(l);
                focusWorldPos(pos.wx, pos.wy);
              }}
              className="shrink-0 rounded-full border border-[#eab308] bg-white px-2.5 py-0.5 text-[11px] font-extrabold hover:bg-[#f2c94c] transition"
            >
              {l.landmark_type === "mosque" ? "🕌" : l.landmark_type === "heritage_council" ? "⛺" : "🏪"}{" "}
              {l.title.split("(")[0].trim()}
            </button>
          ))}
        <button
          type="button"
          onClick={() => {
            setSelectedLandmark(null);
            setSelectedResident(null);
            focusWorldPos(0, 140);
          }}
          className="shrink-0 rounded-full border border-[#263238] bg-[#f2c94c] px-2.5 py-0.5 text-[11px] font-black"
        >
          🏡 حي البيوت ({visibleResidents.length})
        </button>
        {notFoundAlert ? (
          <span className="shrink-0 rounded-lg bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-black text-red-700">
            غير موجود — أضفه من لوحة المدينة!
          </span>
        ) : null}
      </div>

      {/* Interactive 3D / 2.5D Realistic Diorama Map (Full Touch-Pan + Pinch-Zoom + Orbit) */}
      <main
        className="relative flex-1 touch-none overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ background: skyBgStyle }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-city-ui]")) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointersRef.current.size === 1) {
            setIsDragging(true);
            dragStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              origX: camOffset.x,
              origY: camOffset.y,
            };
          } else if (pointersRef.current.size === 2) {
            setIsDragging(true);
            const pts = Array.from(pointersRef.current.values());
            pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            pinchStartZoomRef.current = camZoom;
          }
        }}
        onPointerMove={(e) => {
          if (!pointersRef.current.has(e.pointerId)) return;
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointersRef.current.size === 2 && pinchStartDistRef.current) {
            const pts = Array.from(pointersRef.current.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const ratio = dist / pinchStartDistRef.current;
            setCamZoom(
              Math.min(1.75, Math.max(0.4, Number((pinchStartZoomRef.current * ratio).toFixed(2)))),
            );
          } else if (pointersRef.current.size === 1 && dragStartRef.current) {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            setCamOffset({
              x: dragStartRef.current.origX + dx,
              y: dragStartRef.current.origY + dy,
            });
          }
        }}
        onPointerUp={(e) => {
          pointersRef.current.delete(e.pointerId);
          if (pointersRef.current.size < 2) pinchStartDistRef.current = null;
          if (pointersRef.current.size === 0) {
            dragStartRef.current = null;
            setIsDragging(false);
          }
        }}
        onPointerCancel={(e) => {
          pointersRef.current.delete(e.pointerId);
          pinchStartDistRef.current = null;
          dragStartRef.current = null;
          setIsDragging(false);
        }}
        onWheel={(e) => {
          setCamZoom((z) =>
            Math.min(1.75, Math.max(0.4, Number((z - e.deltaY * 0.0008).toFixed(2)))),
          );
        }}
      >
        {/* Subtle Realistic Sun & Clouds in Sky Horizon */}
        <div className="pointer-events-none absolute top-4 left-8 size-16 rounded-full bg-gradient-to-br from-[#fde047] to-[#f59e0b] opacity-80 blur-[1px] shadow-[0_0_45px_#facc15]" />
        <div className="pointer-events-none absolute top-7 right-12 h-7 w-28 rounded-full bg-white/80 blur-[2px]" />

        {/* World Origin Container with Realistic 3D Diorama Tilt & Smooth Transitions */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 ${
            isDragging ? "" : "transition-transform duration-300 ease-out"
          }`}
          style={{
            transform: `translate(${camOffset.x}px, ${camOffset.y}px) scale(${camZoom}) ${
              viewMode === "3D"
                ? `perspective(1250px) rotateX(32deg) rotateZ(${camRotateZ}deg)`
                : ""
            }`,
            transformOrigin: "center center",
            transformStyle: "preserve-3d",
          }}
        >
          {/* ==================== 1. REALISTIC 3D TERRAIN SLAB & SIDEWALKS ==================== */}
          <div
            className="absolute -left-[540px] -top-[285px] w-[1080px] rounded-[48px] border-4 border-[#eab308] bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]"
            style={{
              height: `${Math.max(820, 350 + totalRows * 195)}px`,
              boxShadow:
                "0 22px 0 #cbd5e1, 0 28px 0 #94a3b8, 0 42px 60px rgba(15,23,42,0.35)",
            }}
          />

          {/* Green Park Patches & Trees Around Central Plaza */}
          {[
            { left: -475, top: -235 },
            { left: 375, top: -235 },
            { left: -475, top: 80 },
            { left: 410, top: 80 },
            { left: -475, top: 270 },
            { left: 410, top: 270 },
          ].map((tree, idx) => (
            <div
              key={`tree-${idx}`}
              style={{ left: `${tree.left}px`, top: `${tree.top}px` }}
              className="absolute z-10 flex flex-col items-center"
            >
              <span className="text-3xl drop-shadow-[0_6px_4px_rgba(15,23,42,0.28)]">
                {idx % 2 === 0 ? "🌴" : "🌳"}
              </span>
            </div>
          ))}

          {/* Main North-South Boulevard: شارع صلاح الدين with Sidewalk Curbs */}
          <div
            className="absolute -left-[46px] -top-[265px] w-[92px] rounded-2xl bg-[#cbd5e1] p-[8px] shadow-inner"
            style={{ height: `${Math.max(770, 320 + totalRows * 195)}px` }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#1e293b] border-x-4 border-[#f2c94c]">
              <div
                className="mx-auto h-full w-1.5"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, #f2c94c 0px, #f2c94c 20px, transparent 20px, transparent 36px)",
                }}
              />
              {/* Animated Car driving South along شارع صلاح الدين */}
              <div
                className="absolute left-2 text-lg drop-shadow"
                style={{ animation: "rpCarDriveY 9s linear infinite" }}
              >
                🚕
              </div>
            </div>
          </div>

          {/* Main East-West Boulevard: شارع السلام الرئيسي with Sidewalk Curbs & Animated Cars */}
          <div className="absolute -left-[510px] -top-[30px] h-[72px] w-[1020px] rounded-2xl bg-[#cbd5e1] p-[8px] shadow-inner">
            <div className="relative flex h-full w-full items-center overflow-hidden rounded-xl bg-[#1e293b] border-y-4 border-[#f2c94c]">
              <div
                className="h-1.5 w-full"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right, #f2c94c 0px, #f2c94c 22px, transparent 22px, transparent 40px)",
                }}
              />
              <div
                className="absolute top-1 text-lg drop-shadow"
                style={{ animation: "rpCarDriveX 11s linear infinite" }}
              >
                🚗
              </div>
              <div
                className="absolute bottom-1 text-lg drop-shadow"
                style={{ animation: "rpCarDriveXRev 14s linear infinite" }}
              >
                🚌
              </div>
            </div>
          </div>

          {/* Central 3D Roundabout (دوار التقوى) */}
          <div className="absolute -left-[62px] -top-[56px] size-[124px] rounded-full border-4 border-[#f2c94c] bg-[#1e293b] shadow-xl flex items-center justify-center">
            <div className="size-[68px] rounded-full border-4 border-white bg-gradient-to-b from-emerald-500 to-emerald-700 flex flex-col items-center justify-center text-white shadow-[0_6px_12px_rgba(0,0,0,0.3)]">
              <span className="text-lg">🌴</span>
              <span className="text-[9px] font-black">دوار التقوى</span>
            </div>
          </div>

          {/* Zebra Crosswalks */}
          <div
            className="absolute -left-[28px] top-[70px] h-4 w-[56px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, #ffffff 0px, #ffffff 6px, transparent 6px, transparent 11px)",
            }}
          />

          {/* Horizontal Residential Streets */}
          {Array.from({ length: totalRows }).map((_, rIdx) => {
            const streetY = 195 + rIdx * 190;
            const streetNames = [
              "شارع عمر المختار",
              "شارع النقب",
              "شارع السوق البلدي",
              "شارع الأمل",
              "شارع الياسمين",
            ];
            const sName = streetNames[rIdx % streetNames.length];
            return (
              <React.Fragment key={`hstreet-${rIdx}`}>
                <div
                  className="absolute -left-[510px] h-[52px] w-[1020px] rounded-xl bg-[#cbd5e1] p-[6px]"
                  style={{ top: `${streetY}px` }}
                >
                  <div className="relative flex h-full w-full items-center overflow-hidden rounded-lg bg-[#1e293b] border-y-2 border-[#f2c94c]">
                    <div
                      className="h-1 w-full"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to right, #f2c94c 0px, #f2c94c 16px, transparent 16px, transparent 32px)",
                      }}
                    />
                    {rIdx === 0 ? (
                      <div
                        className="absolute top-0.5 text-base"
                        style={{ animation: "rpCarDriveX 13s linear infinite" }}
                      >
                        🚙
                      </div>
                    ) : null}
                  </div>
                </div>

                {settings.show_street_signs !== false ? (
                  <>
                    <div
                      style={{ top: `${streetY + 12}px`, left: "-465px" }}
                      className="absolute z-10 flex items-center gap-1 rounded-lg border-2 border-[#f2c94c] bg-white px-2.5 py-0.5 text-[10px] font-black text-[#263238] shadow-md whitespace-nowrap"
                    >
                      <span>🪧</span>
                      <span>{sName}</span>
                    </div>
                    <div
                      style={{ top: `${streetY + 12}px`, left: "330px" }}
                      className="absolute z-10 flex items-center gap-1 rounded-lg border-2 border-[#f2c94c] bg-white px-2.5 py-0.5 text-[10px] font-black text-[#263238] shadow-md whitespace-nowrap"
                    >
                      <span>🪧</span>
                      <span>حي {rIdx + 1} · رهط</span>
                    </div>
                  </>
                ) : null}

                {settings.show_traffic_lights !== false && rIdx < 3 ? (
                  <div
                    style={{ top: `${streetY - 40}px`, left: rIdx % 2 === 0 ? "48px" : "-76px" }}
                    className="absolute z-20"
                  >
                    <TrafficLightWidget />
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}

          {settings.show_street_signs !== false ? (
            <>
              <div
                style={{ top: "-10px", left: "-470px" }}
                className="absolute z-10 flex items-center gap-1 rounded-xl border-2 border-[#263238] bg-[#f2c94c] px-3 py-1 text-[11px] font-black text-[#263238] shadow-md whitespace-nowrap"
              >
                🪧 شارع السلام الرئيسي
              </div>
              <div
                style={{ top: "-10px", left: "305px" }}
                className="absolute z-10 flex items-center gap-1 rounded-xl border-2 border-[#263238] bg-[#f2c94c] px-3 py-1 text-[11px] font-black text-[#263238] shadow-md whitespace-nowrap"
              >
                🪧 شارع صلاح الدين
              </div>
            </>
          ) : null}

          {settings.show_traffic_lights !== false ? (
            <>
              <div style={{ top: "-82px", left: "66px" }} className="absolute z-20">
                <TrafficLightWidget label="إشارة المركز" />
              </div>
              <div style={{ top: "36px", left: "-96px" }} className="absolute z-20">
                <TrafficLightWidget />
              </div>
            </>
          ) : null}

          {/* ==================== 2. REALISTIC 3D CENTRAL LANDMARKS ==================== */}
          {landmarks
            .filter((l) => l.is_active)
            .map((l, idx) => {
              const { wx, wy } = getLandmarkWorldPos(l, idx);
              const isSel = selectedLandmark?.id === l.id;
              return (
                <div
                  key={`landmark-${l.id}`}
                  data-city-ui
                  onClick={() => {
                    setSelectedResident(null);
                    setSelectedLandmark(l);
                    focusWorldPos(wx, wy);
                  }}
                  style={{
                    position: "absolute",
                    left: `${wx}px`,
                    top: `${wy}px`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 25,
                  }}
                  className="pointer-events-auto flex w-[205px] cursor-pointer flex-col items-center group"
                >
                  <Landmark3D type={l.landmark_type} />
                  <div
                    className={`mt-1 flex w-full flex-col items-center rounded-2xl border-2 px-3 py-1.5 text-center shadow-md transition ${
                      isSel
                        ? "border-[#263238] bg-[#f2c94c] text-[#263238]"
                        : "border-[#f2c94c] bg-white text-[#263238] group-hover:bg-[#fef9c3]"
                    }`}
                  >
                    <span className="text-[10px] font-black text-[#b45309]">{l.badge_text}</span>
                    <span className="truncate w-full text-xs font-black text-[#263238]">
                      {l.title}
                    </span>
                  </div>
                </div>
              );
            })}

          {/* ==================== 3. REALISTIC 3D RESIDENTIAL HOUSES ==================== */}
          {visibleResidents.map((r, idx) => {
            const { wx, wy } = getResidentWorldPos(idx);
            const isSel = selectedResident?.id === r.id;
            const plat = PLATFORM_BADGE[r.social_platform] ?? PLATFORM_BADGE.app;

            return (
              <div
                key={`res-${r.id}`}
                data-city-ui
                onClick={() => {
                  setSelectedLandmark(null);
                  setSelectedResident(r);
                  focusWorldPos(wx, wy);
                }}
                style={{
                  position: "absolute",
                  left: `${wx}px`,
                  top: `${wy}px`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 20 + Math.floor(idx / 4),
                }}
                className="pointer-events-auto flex w-[168px] cursor-pointer flex-col items-center group"
              >
                <ArchitecturalHouse3D
                  styleId={r.house_style}
                  colorId={r.house_color ?? settings.default_house_color ?? "yellow"}
                  tier={r.tier}
                  is3D={viewMode === "3D"}
                  size={92}
                />

                <div
                  className={`mt-1 flex w-full flex-col items-center rounded-2xl border-2 px-2.5 py-1 text-center shadow-sm transition group-hover:scale-105 ${
                    isSel
                      ? "border-[#263238] bg-[#f2c94c] text-[#263238] ring-4 ring-[#f2c94c]/40"
                      : "border-[#f2c94c] bg-white/95 text-[#263238] group-hover:bg-[#fef9c3]"
                  }`}
                >
                  <div className="flex w-full items-center justify-center gap-1">
                    <span className="rounded-md bg-[#fef9c3] border border-[#eab308] px-1.5 font-mono text-[10px] font-black text-[#263238]">
                      #{r.resident_number}
                    </span>
                    <span className="truncate text-[11px] font-black text-[#263238]">
                      {r.display_name}
                    </span>
                    <span className="shrink-0 text-xs">{plat.icon}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Left Side: Easy Directional D-Pad so users can move smoothly in any direction! */}
        <div
          data-city-ui
          className="pointer-events-auto absolute start-3 bottom-5 z-30 grid grid-cols-3 gap-1 rounded-2xl border-2 border-[#f2c94c] bg-white/90 p-1.5 shadow-xl backdrop-blur-md"
          title="التحرك في الخريطة"
        >
          <div />
          <button
            type="button"
            onClick={() => panBy(0, 140)}
            className="grid size-8 place-items-center rounded-xl bg-slate-100 text-xs font-black hover:bg-[#f2c94c]"
            title="تحرك للأعلى"
          >
            ▲
          </button>
          <div />
          <button
            type="button"
            onClick={() => panBy(-140, 0)}
            className="grid size-8 place-items-center rounded-xl bg-slate-100 text-xs font-black hover:bg-[#f2c94c]"
            title="تحرك لليمين"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => {
              setCamOffset({ x: 0, y: -20 });
              setCamZoom(typeof window !== "undefined" && window.innerWidth < 640 ? 0.64 : 0.92);
              setCamRotateZ(viewMode === "3D" ? -10 : 0);
            }}
            className="grid size-8 place-items-center rounded-xl bg-[#f2c94c] text-xs font-black text-[#263238]"
            title="وسط المدينة"
          >
            🎯
          </button>
          <button
            type="button"
            onClick={() => panBy(140, 0)}
            className="grid size-8 place-items-center rounded-xl bg-slate-100 text-xs font-black hover:bg-[#f2c94c]"
            title="تحرك لليسار"
          >
            ▶
          </button>
          <div />
          <button
            type="button"
            onClick={() => panBy(0, -140)}
            className="grid size-8 place-items-center rounded-xl bg-slate-100 text-xs font-black hover:bg-[#f2c94c]"
            title="تحرك للأسفل"
          >
            ▼
          </button>
          <div />
        </div>

        {/* Right Side: Zoom & 3D Orbit Rotation Controls */}
        <div
          data-city-ui
          className="pointer-events-auto absolute end-3 bottom-5 z-30 flex flex-col gap-2"
        >
          <button
            type="button"
            onClick={() =>
              setCamZoom((z) => Math.min(1.75, Number((z + 0.15).toFixed(2))))
            }
            className="grid size-10 place-items-center rounded-2xl border-2 border-[#f2c94c] bg-white text-[#263238] shadow-lg hover:bg-[#fef9c3]"
            title="تكبير الخريطة"
          >
            <ZoomIn className="size-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCamZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))
            }
            className="grid size-10 place-items-center rounded-2xl border-2 border-[#f2c94c] bg-white text-[#263238] shadow-lg hover:bg-[#fef9c9]"
            title="تصغير الخريطة"
          >
            <ZoomOut className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setCamRotateZ((r) => (r === -10 ? 10 : r === 10 ? 0 : -10))}
            className="grid size-10 place-items-center rounded-2xl border-2 border-[#263238] bg-[#fef9c3] text-[10px] font-black text-[#263238] shadow-lg"
            title="تغيير زاوية 3D"
          >
            🔄 3D
          </button>
        </div>

        {/* Selected Resident Popup Card */}
        {selectedResident ? (
          <div
            data-city-ui
            className="pointer-events-auto absolute bottom-5 left-1/2 z-40 w-[92%] max-w-md -translate-x-1/2 rounded-3xl border-2 border-[#263238] bg-white p-4 text-[#263238] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 rounded-2xl border-2 border-[#f2c94c] bg-[#fffdf5] p-1">
                  <ArchitecturalHouse3D
                    styleId={selectedResident.house_style}
                    colorId={selectedResident.house_color ?? "yellow"}
                    tier={selectedResident.tier}
                    size={64}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-xl bg-[#f2c94c] px-2.5 py-0.5 font-mono text-xs font-black text-[#263238]">
                      بيت #{selectedResident.resident_number}
                    </span>
                    <span className="rounded-xl bg-[#fef9c3] border border-[#eab308] px-2.5 py-0.5 text-[11px] font-extrabold text-[#263238]">
                      {selectedResident.neighborhood}
                    </span>
                  </div>
                  <h3 className="mt-1.5 truncate text-base font-black text-[#263238]">
                    {selectedResident.display_name}
                  </h3>
                  <p className="text-xs font-bold text-slate-500" dir="ltr">
                    @{selectedResident.username} ·{" "}
                    {PLATFORM_BADGE[selectedResident.social_platform]?.label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResident(null)}
                className="rounded-xl border border-slate-200 bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-3.5 flex gap-2">
              <a
                href={getSocialProfileUrl(
                  selectedResident.social_platform,
                  selectedResident.username,
                  selectedResident.custom_url,
                )}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#263238] bg-[#f2c94c] py-2.5 text-xs font-black text-[#263238] shadow-xs transition hover:brightness-95"
              >
                <span>
                  {PLATFORM_BADGE[selectedResident.social_platform]?.icon} زيارة الحساب على{" "}
                  {PLATFORM_BADGE[selectedResident.social_platform]?.label}
                </span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        ) : null}

        {/* Selected Landmark Popup Card */}
        {selectedLandmark ? (
          <div
            data-city-ui
            className="pointer-events-auto absolute bottom-5 left-1/2 z-40 w-[92%] max-w-md -translate-x-1/2 rounded-3xl border-2 border-[#263238] bg-white p-4 text-[#263238] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-xl bg-[#f2c94c] px-2.5 py-0.5 text-xs font-black text-[#263238]">
                  {selectedLandmark.badge_text}
                </span>
                <h3 className="mt-2 text-base font-black text-[#263238]">
                  {selectedLandmark.title}
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-600">
                  {selectedLandmark.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLandmark(null)}
                className="rounded-xl border border-slate-200 bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-3.5 flex gap-2">
              <a
                href={selectedLandmark.sponsor_url}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#263238] bg-[#f2c94c] py-2.5 text-xs font-black text-[#263238] transition hover:brightness-95"
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
