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


// ============================================================================
// REALISTIC 3D ISOMETRIC CANVAS CITY ENGINE (60fps, High-DPI, Zero External Deps)
// ============================================================================

type TimeOfDayMode = "day" | "sunset" | "night";

function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `rgb(${r},${g},${b})`;
}

interface HitTarget {
  kind: "resident" | "landmark";
  id: number;
  cx: number;
  cy: number;
  r: number;
  wx: number;
  wy: number;
}

function RealisticCity3DCanvas({
  residents,
  landmarks,
  settings,
  camOffset,
  setCamOffset,
  camZoom,
  setCamZoom,
  camYaw,
  camPitch,
  timeOfDay,
  selectedResidentId,
  selectedLandmarkId,
  onSelectResident,
  onSelectLandmark,
}: {
  residents: Resident[];
  landmarks: Landmark[];
  settings: CitySettings;
  camOffset: { x: number; y: number };
  setCamOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  camZoom: number;
  setCamZoom: React.Dispatch<React.SetStateAction<number>>;
  camYaw: number;
  camPitch: number;
  timeOfDay: TimeOfDayMode;
  selectedResidentId: number | null;
  selectedLandmarkId: number | null;
  onSelectResident: (r: Resident, wx: number, wy: number) => void;
  onSelectLandmark: (l: Landmark, wx: number, wy: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitTargetsRef = useRef<HitTarget[]>([]);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  // Smoothly animated camera values
  const animCamRef = useRef({ x: camOffset.x, y: camOffset.y, zoom: camZoom, yaw: camYaw, pitch: camPitch });
  const targetCamRef = useRef({ x: camOffset.x, y: camOffset.y, zoom: camZoom, yaw: camYaw, pitch: camPitch });
  targetCamRef.current = { x: camOffset.x, y: camOffset.y, zoom: camZoom, yaw: camYaw, pitch: camPitch };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const startTime = performance.now();

    const getResPos = (idx: number) => {
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      const xMap = [-2.4, -1.0, 1.0, 2.4];
      return { wx: xMap[col] ?? 1.0, wy: 1.1 + row * 1.45 };
    };

    const getLandPos = (l: Landmark, idx: number) => {
      const wx = l.grid_x === 0 ? 0 : l.grid_x < 0 ? -1.95 : l.grid_x > 0 ? 1.95 : (idx - 1) * 1.95;
      return { wx, wy: -1.1 };
    };

    const renderFrame = (nowMs: number) => {
      const t = (nowMs - startTime) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const W = Math.max(1, Math.floor(rect.width));
      const H = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) {
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
      }

      // Smooth lerp toward target camera
      const lerp = 0.16;
      const ac = animCamRef.current;
      const tc = targetCamRef.current;
      ac.x += (tc.x - ac.x) * lerp;
      ac.y += (tc.y - ac.y) * lerp;
      ac.zoom += (tc.zoom - ac.zoom) * lerp;
      ac.yaw += (tc.yaw - ac.yaw) * lerp;
      ac.pitch += (tc.pitch - ac.pitch) * lerp;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. REALISTIC SKY & ATMOSPHERE GRADIENT
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      if (timeOfDay === "night") {
        skyGrad.addColorStop(0, "#020617");
        skyGrad.addColorStop(0.55, "#0f172a");
        skyGrad.addColorStop(1, "#1e293b");
      } else if (timeOfDay === "sunset") {
        skyGrad.addColorStop(0, "#1e3a8a");
        skyGrad.addColorStop(0.35, "#fb923c");
        skyGrad.addColorStop(0.7, "#fde68a");
        skyGrad.addColorStop(1, "#fef9c3");
      } else {
        skyGrad.addColorStop(0, "#7dd3fc");
        skyGrad.addColorStop(0.38, "#e0f2fe");
        skyGrad.addColorStop(0.75, "#fffdf7");
        skyGrad.addColorStop(1, "#fef9c3");
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Sun / Moon & Drifting Clouds
      if (timeOfDay === "night") {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        for (let i = 0; i < 24; i++) {
          const sx = ((i * 137) % W);
          const sy = ((i * 61) % Math.max(80, H * 0.35));
          ctx.beginPath();
          ctx.arc(sx, sy, (i % 2) + 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(W * 0.15, 58, 22, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const sunGrad = ctx.createRadialGradient(W * 0.14, 56, 4, W * 0.14, 56, 48);
        sunGrad.addColorStop(0, "#fef08a");
        sunGrad.addColorStop(0.45, "rgba(250,204,21,0.55)");
        sunGrad.addColorStop(1, "rgba(250,204,21,0)");
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(W * 0.14, 56, 48, 0, Math.PI * 2);
        ctx.fill();

        // Soft drifting clouds
        ctx.fillStyle = "rgba(255,255,255,0.68)";
        for (let c = 0; c < 3; c++) {
          const cxCloud = ((t * (10 + c * 4) + c * 260) % (W + 180)) - 90;
          const cyCloud = 36 + c * 22;
          ctx.beginPath();
          ctx.arc(cxCloud, cyCloud, 18, 0, Math.PI * 2);
          ctx.arc(cxCloud + 16, cyCloud - 6, 22, 0, Math.PI * 2);
          ctx.arc(cxCloud + 34, cyCloud, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3D Projection Helper (world x, y, z -> screen sx, sy, depth)
      const scale = 115 * ac.zoom;
      const cosA = Math.cos(ac.yaw);
      const sinA = Math.sin(ac.yaw);
      const pitch = ac.pitch;
      const originX = W * 0.5 + ac.x;
      const originY = H * 0.46 + ac.y;

      const proj = (wx: number, wy: number, wz = 0) => {
        const rx = wx * cosA - wy * sinA;
        const ry = wx * sinA + wy * cosA;
        const sx = originX + rx * scale;
        const sy = originY + ry * scale * pitch - wz * scale * 0.92;
        return { sx, sy, depth: ry };
      };

      const fillPoly = (pts: { sx: number; sy: number }[], fill: string | CanvasGradient, stroke?: string, lw = 1) => {
        if (pts.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lw;
          ctx.stroke();
        }
      };

      const drawBox3D = (
        cx: number,
        cy: number,
        z0: number,
        w: number,
        d: number,
        h: number,
        topCol: string,
        frontCol: string,
        sideCol: string,
        strokeCol = "rgba(15,23,42,0.28)",
      ) => {
        const hw = w / 2;
        const hd = d / 2;
        // Bottom & top corners
        const b00 = proj(cx - hw, cy - hd, z0);
        const b10 = proj(cx + hw, cy - hd, z0);
        const b11 = proj(cx + hw, cy + hd, z0);
        const b01 = proj(cx - hw, cy + hd, z0);

        const t00 = proj(cx - hw, cy - hd, z0 + h);
        const t10 = proj(cx + hw, cy - hd, z0 + h);
        const t11 = proj(cx + hw, cy + hd, z0 + h);
        const t01 = proj(cx - hw, cy + hd, z0 + h);

        // Determine visible vertical faces based on camera yaw
        const faces = [
          { pts: [b01, b11, t11, t01], col: frontCol, depth: (b01.depth + b11.depth) / 2 }, // South
          { pts: [b10, b11, t11, t10], col: sideCol, depth: (b10.depth + b11.depth) / 2 },  // East
          { pts: [b00, b01, t01, t00], col: sideCol, depth: (b00.depth + b01.depth) / 2 },  // West
          { pts: [b00, b10, t10, t00], col: frontCol, depth: (b00.depth + b10.depth) / 2 }, // North
        ].sort((a, b) => a.depth - b.depth);

        // Draw back-most 2 then front-most 2? Only front-facing 2 need to be drawn (or all sorted back-to-front!)
        for (const f of faces) {
          fillPoly(f.pts, f.col, strokeCol, 1);
        }
        // Top roof
        fillPoly([t00, t10, t11, t01], topCol, strokeCol, 1.2);
      };

      const totalRows = Math.max(3, Math.ceil(residents.length / 4));
      const maxWy = 0.65 + totalRows * 1.45;
      const minWy = -2.1;
      const minWx = -3.6;
      const maxWx = 3.6;

      // 2. REALISTIC 3D RAISED CITY BASE SLAB (EARTH + SAND + CURB)
      const slabThickness = 0.28;
      const sb00 = proj(minWx, minWy, -slabThickness);
      const sb10 = proj(maxWx, minWy, -slabThickness);
      const sb11 = proj(maxWx, maxWy, -slabThickness);
      const sb01 = proj(minWx, maxWy, -slabThickness);
      const st00 = proj(minWx, minWy, 0);
      const st10 = proj(maxWx, minWy, 0);
      const st11 = proj(maxWx, maxWy, 0);
      const st01 = proj(minWx, maxWy, 0);

      // Soft ground drop shadow under whole city slab
      ctx.save();
      ctx.fillStyle = "rgba(15,23,42,0.18)";
      ctx.beginPath();
      ctx.moveTo(sb00.sx + 8, sb00.sy + 18);
      ctx.lineTo(sb10.sx + 8, sb10.sy + 18);
      ctx.lineTo(sb11.sx + 8, sb11.sy + 18);
      ctx.lineTo(sb01.sx + 8, sb01.sy + 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const slabSideColor = timeOfDay === "night" ? "#334155" : "#cbd5e1";
      const slabFrontColor = timeOfDay === "night" ? "#1e293b" : "#94a3b8";
      const terrainTopColor =
        timeOfDay === "night"
          ? "#1e293b"
          : settings.map_theme === "desert_sand"
            ? "#fef3c7"
            : "#f8fafc";

      const slabFaces = [
        { pts: [sb01, sb11, st11, st01], col: slabFrontColor, d: (sb01.depth + sb11.depth) / 2 },
        { pts: [sb10, sb11, st11, st10], col: slabSideColor, d: (sb10.depth + sb11.depth) / 2 },
        { pts: [sb00, sb01, st01, st00], col: slabSideColor, d: (sb00.depth + sb01.depth) / 2 },
        { pts: [sb00, sb10, st10, st00], col: slabFrontColor, d: (sb00.depth + sb10.depth) / 2 },
      ].sort((a, b) => a.d - b.d);
      for (const sf of slabFaces) fillPoly(sf.pts, sf.col, "#eab308", 1.5);
      fillPoly([st00, st10, st11, st01], terrainTopColor, "#eab308", 3);

      // 3. REALISTIC ASPHALT STREETS, SIDEWALK CURBS, CROSSWALKS & ROUNDABOUT
      const drawRoadRect = (x1: number, y1: number, x2: number, y2: number, isMain = false) => {
        // Raised light sidewalk border
        const pad = isMain ? 0.08 : 0.05;
        const p0 = proj(x1 - pad, y1 - pad, 0.005);
        const p1 = proj(x2 + pad, y1 - pad, 0.005);
        const p2 = proj(x2 + pad, y2 + pad, 0.005);
        const p3 = proj(x1 - pad, y2 + pad, 0.005);
        fillPoly([p0, p1, p2, p3], timeOfDay === "night" ? "#475569" : "#e2e8f0", "#f2c94c", 1.2);

        // Dark asphalt surface
        const a0 = proj(x1, y1, 0.01);
        const a1 = proj(x2, y1, 0.01);
        const a2 = proj(x2, y2, 0.01);
        const a3 = proj(x1, y2, 0.01);
        fillPoly([a0, a1, a2, a3], "#1e293b", "#f2c94c", 1.6);
      };

      // North-South Main Boulevard: شارع صلاح الدين
      drawRoadRect(-0.32, minWy + 0.1, 0.32, maxWy - 0.1, true);
      // Dashed yellow centerline along N-S road
      ctx.strokeStyle = "#f2c94c";
      ctx.lineWidth = Math.max(1.5, 2.5 * ac.zoom);
      ctx.setLineDash([8 * ac.zoom, 7 * ac.zoom]);
      const nsStart = proj(0, minWy + 0.15, 0.015);
      const nsEnd = proj(0, maxWy - 0.15, 0.015);
      ctx.beginPath();
      ctx.moveTo(nsStart.sx, nsStart.sy);
      ctx.lineTo(nsEnd.sx, nsEnd.sy);
      ctx.stroke();
      ctx.setLineDash([]);

      // East-West Main Boulevard: شارع السلام الرئيسي (y = -0.15..0.35)
      drawRoadRect(minWx + 0.15, -0.22, maxWx - 0.15, 0.28, true);
      ctx.strokeStyle = "#f2c94c";
      ctx.lineWidth = Math.max(1.5, 2.5 * ac.zoom);
      ctx.setLineDash([8 * ac.zoom, 7 * ac.zoom]);
      const ewStart = proj(minWx + 0.2, 0.03, 0.015);
      const ewEnd = proj(maxWx - 0.2, 0.03, 0.015);
      ctx.beginPath();
      ctx.moveTo(ewStart.sx, ewStart.sy);
      ctx.lineTo(ewEnd.sx, ewEnd.sy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Horizontal Residential Streets
      const streetNames = ["شارع عمر المختار", "شارع النقب", "شارع السوق البلدي", "شارع الأمل", "شارع الياسمين"];
      for (let r = 0; r < totalRows; r++) {
        const sy = 1.78 + r * 1.45;
        drawRoadRect(minWx + 0.15, sy - 0.17, maxWx - 0.15, sy + 0.17, false);
        ctx.strokeStyle = "#f2c94c";
        ctx.lineWidth = Math.max(1, 1.8 * ac.zoom);
        ctx.setLineDash([6 * ac.zoom, 6 * ac.zoom]);
        const rs0 = proj(minWx + 0.2, sy, 0.015);
        const rs1 = proj(maxWx - 0.2, sy, 0.015);
        ctx.beginPath();
        ctx.moveTo(rs0.sx, rs0.sy);
        ctx.lineTo(rs1.sx, rs1.sy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Central Roundabout (دوار التقوى)
      const rbCenter = proj(0, 0.03, 0.02);
      ctx.save();
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#f2c94c";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(rbCenter.sx, rbCenter.sy, 0.45 * scale, 0.45 * scale * pitch, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#16a34a";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(rbCenter.sx, rbCenter.sy - 3 * ac.zoom, 0.24 * scale, 0.24 * scale * pitch, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 4. ANIMATED 3D CARS & BUSES DRIVING ALONG THE ROADS
      const drawCar3D = (wx: number, wy: number, color: string, isVertical: boolean) => {
        const cw = isVertical ? 0.13 : 0.24;
        const cd = isVertical ? 0.24 : 0.13;
        // Shadow
        const sh = proj(wx + 0.03, wy + 0.03, 0.015);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(sh.sx, sh.sy, cw * scale * 0.65, cd * scale * pitch * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        // Car chassis + cabin
        drawBox3D(wx, wy, 0.02, cw, cd, 0.07, color, shadeHex(color, 0.85), shadeHex(color, 0.72), "#0f172a");
        drawBox3D(wx, wy, 0.09, cw * 0.75, cd * 0.65, 0.06, "#e0f2fe", "#38bdf8", "#0284c7", "#0f172a");

        if (timeOfDay === "night") {
          const hl = proj(isVertical ? wx : wx + cw * 0.6, isVertical ? wy + cd * 0.6 : wy, 0.04);
          const beam = ctx.createRadialGradient(hl.sx, hl.sy, 1, hl.sx, hl.sy, 22 * ac.zoom);
          beam.addColorStop(0, "rgba(254,240,138,0.8)");
          beam.addColorStop(1, "rgba(254,240,138,0)");
          ctx.fillStyle = beam;
          ctx.beginPath();
          ctx.arc(hl.sx, hl.sy, 22 * ac.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const carX1 = -3.2 + ((t * 0.75) % 6.4);
      const carX2 = 3.2 - ((t * 0.55) % 6.4);
      const carY1 = minWy + 0.3 + ((t * 0.65) % (maxWy - minWy - 0.6));
      drawCar3D(carX1, 0.14, "#f2c94c", false); // Yellow Rahat taxi/bus
      drawCar3D(carX2, -0.09, "#ef4444", false); // Red sedan
      drawCar3D(0.14, carY1, "#38bdf8", true); // Blue car on Salah al-Din

      // 5. COLLECT ALL 3D OBJECTS (HOUSES, LANDMARKS, TREES, TRAFFIC LIGHTS, STREET SIGNS) & DEPTH-SORT BACK-TO-FRONT
      type SceneObj = {
        depth: number;
        draw: () => void;
      };
      const objs: SceneObj[] = [];
      const newHitTargets: HitTarget[] = [];

      // Helper: Draw 3D Tree
      const pushTree = (wx: number, wy: number, isPalm: boolean) => {
        const p = proj(wx, wy, 0);
        objs.push({
          depth: p.depth,
          draw: () => {
            // Ground shadow
            ctx.fillStyle = "rgba(15,23,42,0.22)";
            ctx.beginPath();
            ctx.ellipse(p.sx + 6 * ac.zoom, p.sy + 2 * ac.zoom, 13 * ac.zoom, 7 * ac.zoom, 0, 0, Math.PI * 2);
            ctx.fill();
            // Trunk
            drawBox3D(wx, wy, 0, 0.08, 0.08, isPalm ? 0.42 : 0.24, "#78350f", "#78350f", "#451a03", "#451a03");
            const top = proj(wx, wy, isPalm ? 0.46 : 0.32);
            if (isPalm) {
              ctx.fillStyle = "#16a34a";
              ctx.strokeStyle = "#14532d";
              ctx.lineWidth = 1.2;
              for (let a = 0; a < 5; a++) {
                const ang = (a * Math.PI * 2) / 5 + 0.3;
                ctx.beginPath();
                ctx.ellipse(
                  top.sx + Math.cos(ang) * 10 * ac.zoom,
                  top.sy + Math.sin(ang) * 6 * ac.zoom,
                  11 * ac.zoom,
                  4.5 * ac.zoom,
                  ang,
                  0,
                  Math.PI * 2,
                );
                ctx.fill();
                ctx.stroke();
              }
            } else {
              const g = ctx.createRadialGradient(top.sx - 4, top.sy - 4, 2, top.sx, top.sy, 16 * ac.zoom);
              g.addColorStop(0, "#4ade80");
              g.addColorStop(1, "#15803d");
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(top.sx, top.sy, 14 * ac.zoom, 0, Math.PI * 2);
              ctx.fill();
            }
          },
        });
      };

      // Place realistic 3D trees along boulevards
      for (const tx of [-3.15, -0.55, 0.55, 3.15]) {
        pushTree(tx, -0.42, tx < 0);
        pushTree(tx, 0.45, tx > 0);
      }
      for (let r = 0; r < totalRows; r++) {
        pushTree(-3.2, 1.1 + r * 1.45, r % 2 === 0);
        pushTree(3.2, 1.1 + r * 1.45, r % 2 !== 0);
      }

      // Helper: Draw 3D Traffic Light
      const pushTrafficLight = (wx: number, wy: number) => {
        const p = proj(wx, wy, 0);
        const phase = Math.floor(t / 2.6) % 3;
        objs.push({
          depth: p.depth,
          draw: () => {
            drawBox3D(wx, wy, 0, 0.05, 0.05, 0.34, "#475569", "#334155", "#1e293b");
            drawBox3D(wx, wy, 0.34, 0.13, 0.1, 0.24, "#1e293b", "#0f172a", "#334155", "#f2c94c");
            const cRed = proj(wx, wy, 0.52);
            const cYel = proj(wx, wy, 0.46);
            const cGrn = proj(wx, wy, 0.40);
            const lamps = [
              { pt: cRed, active: phase === 0, col: "#ef4444" },
              { pt: cYel, active: phase === 1, col: "#fbbf24" },
              { pt: cGrn, active: phase === 2, col: "#22c55e" },
            ];
            for (const lmp of lamps) {
              ctx.fillStyle = lmp.active ? lmp.col : "rgba(255,255,255,0.15)";
              ctx.beginPath();
              ctx.arc(lmp.pt.sx, lmp.pt.sy, 3 * ac.zoom, 0, Math.PI * 2);
              ctx.fill();
            }
          },
        });
      };

      if (settings.show_traffic_lights !== false) {
        pushTrafficLight(0.42, -0.35);
        pushTrafficLight(-0.42, 0.4);
        pushTrafficLight(0.42, 1.48);
      }

      // Helper: Draw Floating Crisp Badge on Canvas
      const drawNameplate = (sx: number, sy: number, line1: string, line2: string | null, isSelected: boolean, accentBg = "#ffffff") => {
        ctx.save();
        ctx.font = `900 ${Math.max(10, Math.round(11 * ac.zoom))}px system-ui, -apple-system, sans-serif`;
        const w1 = ctx.measureText(line1).width;
        const w2 = line2 ? ctx.measureText(line2).width : 0;
        const bw = Math.max(w1, w2) + 20 * ac.zoom;
        const bh = (line2 ? 32 : 21) * ac.zoom;
        const bx = sx - bw / 2;
        const by = sy - bh;

        ctx.fillStyle = isSelected ? "#f2c94c" : accentBg;
        ctx.strokeStyle = isSelected ? "#263238" : "#eab308";
        ctx.lineWidth = isSelected ? 2.5 : 1.6;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 9 * ac.zoom);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#263238";
        if (line2) {
          ctx.fillText(line1, sx, by + 10 * ac.zoom);
          ctx.font = `800 ${Math.max(9, Math.round(9.5 * ac.zoom))}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = "#b45309";
          ctx.fillText(line2, sx, by + 23 * ac.zoom);
        } else {
          ctx.fillText(line1, sx, by + bh / 2);
        }
        ctx.restore();
      };

      // Street Signs
      if (settings.show_street_signs !== false) {
        const pushSign = (wx: number, wy: number, text: string, bg = "#f2c94c") => {
          const p = proj(wx, wy, 0.14);
          objs.push({
            depth: p.depth + 0.05,
            draw: () => drawNameplate(p.sx, p.sy, `🪧 ${text}`, null, false, bg),
          });
        };
        pushSign(-2.7, 0.03, "شارع السلام الرئيسي");
        pushSign(2.7, 0.03, "شارع صلاح الدين");
        for (let r = 0; r < Math.min(3, totalRows); r++) {
          pushSign(-2.7, 1.78 + r * 1.45, streetNames[r % streetNames.length], "#ffffff");
        }
      }

      // 6. PUSH CENTRAL 3D LANDMARKS
      landmarks
        .filter((l) => l.is_active)
        .forEach((l, idx) => {
          const { wx, wy } = getLandPos(l, idx);
          const p = proj(wx, wy, 0);
          const isSel = selectedLandmarkId === l.id;
          objs.push({
            depth: p.depth,
            draw: () => {
              // Garden / Stone Courtyard Base
              drawBox3D(wx, wy, 0, 1.15, 0.92, 0.04, "#fef9c3", "#eab308", "#ca8a04");

              if (l.landmark_type === "mosque") {
                // Main Prayer Hall
                drawBox3D(wx + 0.06, wy, 0.04, 0.78, 0.62, 0.42, "#fef3c7", "#ffffff", "#e2e8f0", "#92400e");
                // Tall Minaret
                drawBox3D(wx - 0.42, wy - 0.18, 0.04, 0.18, 0.18, 0.85, "#f2c94c", "#ffffff", "#e2e8f0", "#92400e");
                const minTop = proj(wx - 0.42, wy - 0.18, 0.92);
                ctx.fillStyle = "#f2c94c";
                ctx.strokeStyle = "#92400e";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(minTop.sx - 10 * ac.zoom, minTop.sy + 10 * ac.zoom);
                ctx.lineTo(minTop.sx, minTop.sy - 14 * ac.zoom);
                ctx.lineTo(minTop.sx + 10 * ac.zoom, minTop.sy + 10 * ac.zoom);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Grand Golden Dome
                const domeBase = proj(wx + 0.06, wy, 0.46);
                const dg = ctx.createRadialGradient(domeBase.sx - 6 * ac.zoom, domeBase.sy - 10 * ac.zoom, 2, domeBase.sx, domeBase.sy, 26 * ac.zoom);
                dg.addColorStop(0, "#fef08a");
                dg.addColorStop(0.5, "#f2c94c");
                dg.addColorStop(1, "#b45309");
                ctx.fillStyle = dg;
                ctx.strokeStyle = "#78350f";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(domeBase.sx, domeBase.sy, 24 * ac.zoom, Math.PI, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
              } else if (l.landmark_type === "heritage_council") {
                // Realistic 3D Bedouin Heritage Tent (الشق)
                drawBox3D(wx, wy, 0.04, 0.86, 0.62, 0.24, "#44403c", "#292524", "#1c1917", "#f2c94c");
                const peak = proj(wx, wy, 0.56);
                const c0 = proj(wx - 0.45, wy + 0.32, 0.26);
                const c1 = proj(wx + 0.45, wy + 0.32, 0.26);
                const c2 = proj(wx + 0.45, wy - 0.32, 0.26);
                fillPoly([c0, c1, peak], "#292524", "#f2c94c", 1.5);
                fillPoly([c1, c2, peak], "#1c1917", "#eab308", 1.2);
                // Warm interior fire glow
                const fire = proj(wx, wy + 0.34, 0.12);
                ctx.fillStyle = "#f59e0b";
                ctx.beginPath();
                ctx.arc(fire.sx, fire.sy, 7 * ac.zoom, 0, Math.PI * 2);
                ctx.fill();
              } else {
                // Sponsor Shop (دكان الأسبوع)
                drawBox3D(wx, wy, 0.04, 0.84, 0.66, 0.48, "#f2c94c", "#ffffff", "#e2e8f0", "#263238");
                drawBox3D(wx, wy + 0.34, 0.22, 0.78, 0.14, 0.08, "#eab308", "#f2c94c", "#ca8a04", "#263238");
                drawBox3D(wx, wy, 0.52, 0.55, 0.18, 0.14, "#263238", "#263238", "#0f172a", "#f2c94c");
              }

              const labelPt = proj(wx, wy, l.landmark_type === "mosque" ? 1.05 : 0.74);
              drawNameplate(labelPt.sx, labelPt.sy, l.title, l.badge_text, isSel, "#ffffff");
              newHitTargets.push({
                kind: "landmark",
                id: l.id,
                cx: p.sx,
                cy: p.sy - 20 * ac.zoom,
                r: 48 * ac.zoom,
                wx,
                wy,
              });
            },
          });
        });

      // 7. PUSH ALL RESIDENTIAL 3D HOUSES (ALL 8 ARCHITECTURAL STYLES + 7 COLORS)
      residents.forEach((r, idx) => {
        const { wx, wy } = getResPos(idx);
        const p = proj(wx, wy, 0);
        const isSel = selectedResidentId === r.id;
        const pal = HOUSE_COLORS_CATALOG.find((c) => c.id === (r.house_color ?? "yellow")) ?? HOUSE_COLORS_CATALOG[0];
        const plat = PLATFORM_BADGE[r.social_platform] ?? PLATFORM_BADGE.app;

        objs.push({
          depth: p.depth,
          draw: () => {
            // Green Lawn & Fence Plot Base
            drawBox3D(wx, wy, 0, 0.96, 0.86, 0.035, "#bbf7d0", "#86efac", "#4ade80", "#eab308");
            // Ground building shadow
            const sh = proj(wx + 0.06, wy + 0.06, 0.04);
            ctx.fillStyle = "rgba(15,23,42,0.22)";
            ctx.beginPath();
            ctx.ellipse(sh.sx, sh.sy, 32 * ac.zoom, 18 * ac.zoom, 0, 0, Math.PI * 2);
            ctx.fill();

            const wall = pal.wallHex;
            const side = pal.sideHex;
            const roof = pal.roofHex;

            if (r.house_style === "tower") {
              drawBox3D(wx, wy, 0.04, 0.56, 0.52, 0.78, roof, wall, side, "#1e293b");
              drawBox3D(wx, wy, 0.82, 0.6, 0.56, 0.08, "#263238", roof, shadeHex(roof, 0.85), "#1e293b");
            } else if (r.house_style === "palace") {
              drawBox3D(wx, wy, 0.04, 0.76, 0.62, 0.36, side, wall, side, "#92400e");
              drawBox3D(wx, wy, 0.4, 0.46, 0.42, 0.24, roof, side, shadeHex(side, 0.9), "#92400e");
              const dp = proj(wx, wy, 0.64);
              ctx.fillStyle = roof;
              ctx.strokeStyle = "#78350f";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(dp.sx, dp.sy, 17 * ac.zoom, Math.PI, 0);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } else if (r.house_style === "heritage_tent") {
              drawBox3D(wx, wy, 0.04, 0.72, 0.54, 0.16, "#44403c", "#292524", "#1c1917", roof);
              const pk = proj(wx, wy, 0.46);
              const t0 = proj(wx - 0.36, wy + 0.27, 0.2);
              const t1 = proj(wx + 0.36, wy + 0.27, 0.2);
              const t2 = proj(wx + 0.36, wy - 0.27, 0.2);
              fillPoly([t0, t1, pk], "#292524", roof, 1.5);
              fillPoly([t1, t2, pk], "#1c1917", roof, 1.2);
            } else if (r.house_style === "modern") {
              drawBox3D(wx, wy, 0.04, 0.68, 0.56, 0.28, side, wall, side, "#1e293b");
              drawBox3D(wx - 0.04, wy - 0.02, 0.32, 0.72, 0.5, 0.24, roof, wall, side, "#1e293b");
            } else if (r.house_style === "commercial_shop") {
              drawBox3D(wx, wy, 0.04, 0.7, 0.58, 0.42, roof, wall, side, "#1e293b");
              drawBox3D(wx, wy + 0.3, 0.2, 0.66, 0.12, 0.07, roof, shadeHex(roof, 0.9), shadeHex(roof, 0.8), "#1e293b");
            } else {
              // Villa / Garden House / Classic Arab with 3D pitched or crowned roof
              drawBox3D(wx, wy, 0.04, 0.66, 0.56, 0.32, side, wall, side, "#1e293b");
              if (r.house_style === "classic_arab") {
                drawBox3D(wx, wy, 0.36, 0.7, 0.6, 0.08, roof, shadeHex(roof, 0.9), shadeHex(roof, 0.8), "#78350f");
              } else {
                const pk = proj(wx, wy, 0.58);
                const r0 = proj(wx - 0.36, wy + 0.3, 0.36);
                const r1 = proj(wx + 0.36, wy + 0.3, 0.36);
                const r2 = proj(wx + 0.36, wy - 0.3, 0.36);
                const r3 = proj(wx - 0.36, wy - 0.3, 0.36);
                fillPoly([r0, r1, pk], roof, "#1e293b", 1.3);
                fillPoly([r1, r2, pk], shadeHex(roof, 0.85), "#1e293b", 1.3);
                fillPoly([r2, r3, pk], shadeHex(roof, 0.75), "#1e293b", 1);
                fillPoly([r3, r0, pk], shadeHex(roof, 0.92), "#1e293b", 1);
              }
            }

            // Glowing Night Windows
            if (timeOfDay === "night") {
              const winPt = proj(wx, wy + 0.29, 0.22);
              ctx.fillStyle = "#fde047";
              ctx.fillRect(winPt.sx - 10 * ac.zoom, winPt.sy, 7 * ac.zoom, 7 * ac.zoom);
              ctx.fillRect(winPt.sx + 3 * ac.zoom, winPt.sy, 7 * ac.zoom, 7 * ac.zoom);
            }

            const topH = r.house_style === "tower" ? 1.0 : r.house_style === "palace" ? 0.85 : 0.68;
            const lblPt = proj(wx, wy, topH);
            const crown = r.tier === "vip" ? "👑 " : "";
            drawNameplate(
              lblPt.sx,
              lblPt.sy,
              `${crown}#${r.resident_number} ${r.display_name} ${plat.icon}`,
              null,
              isSel,
              "#ffffff",
            );

            newHitTargets.push({
              kind: "resident",
              id: r.id,
              cx: p.sx,
              cy: p.sy - 18 * ac.zoom,
              r: 38 * ac.zoom,
              wx,
              wy,
            });
          },
        });
      });

      // Painter's Algorithm Depth Sort
      objs.sort((a, b) => a.depth - b.depth);
      for (const obj of objs) obj.draw();

      hitTargetsRef.current = newHitTargets;
      ctx.restore();
      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    residents,
    landmarks,
    settings,
    timeOfDay,
    selectedResidentId,
    selectedLandmarkId,
  ]);

  const handleTap = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Check closest hit target within radius (reverse order = front-most first)
    const targets = hitTargetsRef.current;
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      if (Math.hypot(x - t.cx, y - t.cy) <= t.r) {
        if (t.kind === "landmark") {
          const found = landmarks.find((l) => l.id === t.id);
          if (found) onSelectLandmark(found, t.wx, t.wy);
          return;
        }
        const found = residents.find((r) => r.id === t.id);
        if (found) onSelectResident(found, t.wx, t.wy);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointersRef.current.size === 1) {
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: camOffset.x,
            origY: camOffset.y,
            moved: false,
          };
        } else if (pointersRef.current.size === 2) {
          const pts = Array.from(pointersRef.current.values());
          pinchRef.current = {
            dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
            zoom: camZoom,
          };
          dragRef.current = null;
        }
      }}
      onPointerMove={(e) => {
        if (!pointersRef.current.has(e.pointerId)) return;
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointersRef.current.size === 2 && pinchRef.current) {
          const pts = Array.from(pointersRef.current.values());
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const ratio = dist / Math.max(1, pinchRef.current.dist);
          setCamZoom(Math.min(1.9, Math.max(0.42, Number((pinchRef.current.zoom * ratio).toFixed(2)))));
        } else if (pointersRef.current.size === 1 && dragRef.current) {
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          if (Math.hypot(dx, dy) > 6) dragRef.current.moved = true;
          setCamOffset({
            x: dragRef.current.origX + dx,
            y: dragRef.current.origY + dy,
          });
        }
      }}
      onPointerUp={(e) => {
        const wasTap = dragRef.current && !dragRef.current.moved && pointersRef.current.size === 1;
        pointersRef.current.delete(e.pointerId);
        if (pointersRef.current.size < 2) pinchRef.current = null;
        if (pointersRef.current.size === 0) dragRef.current = null;
        if (wasTap) handleTap(e.clientX, e.clientY);
      }}
      onPointerCancel={(e) => {
        pointersRef.current.delete(e.pointerId);
        pinchRef.current = null;
        dragRef.current = null;
      }}
      onWheel={(e) => {
        setCamZoom((z) => Math.min(1.9, Math.max(0.42, Number((z - e.deltaY * 0.0008).toFixed(2)))));
      }}
    />
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

  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayMode>("day");
  const [searchQuery, setSearchQuery] = useState("");
  const [notFoundAlert, setNotFoundAlert] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // 3D Camera Pan, Zoom, Yaw Rotation & Pitch Tilt
  const [camOffset, setCamOffset] = useState<{ x: number; y: number }>({ x: 0, y: -10 });
  const [camZoom, setCamZoom] = useState<number>(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 0.62 : 0.92,
  );
  const [camYaw, setCamYaw] = useState<number>(-0.24);
  const [camPitch, setCamPitch] = useState<number>(0.58);

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

  const focusWorldPos = useCallback(
    (wx: number, wy: number) => {
      const scale = 115 * camZoom;
      const cosA = Math.cos(camYaw);
      const sinA = Math.sin(camYaw);
      const rx = wx * cosA - wy * sinA;
      const ry = wx * sinA + wy * cosA;
      setCamOffset({
        x: -rx * scale,
        y: -ry * scale * camPitch,
      });
    },
    [camZoom, camYaw, camPitch],
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
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      const xMap = [-2.4, -1.0, 1.0, 2.4];
      setSelectedLandmark(null);
      setSelectedResident(found);
      setNotFoundAlert(false);
      focusWorldPos(xMap[col] ?? 1.0, 1.1 + row * 1.45);
    } else {
      setSelectedResident(null);
      setNotFoundAlert(true);
    }
  };

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
                  3D واقعي
                </span>
              </h1>
              <p className="text-[10px] font-extrabold text-[#b45309]">
                {visibleResidents.length} بيت · اسحب ودوّر الخريطة بحرية
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
          {/* Day / Sunset / Night Lighting Toggle */}
          <button
            type="button"
            onClick={() =>
              setTimeOfDay((m) => (m === "day" ? "sunset" : m === "sunset" ? "night" : "day"))
            }
            className="rounded-xl border border-[#263238] bg-[#fef9c3] px-2.5 py-1.5 text-[11px] font-black text-[#263238]"
            title="تبديل إضاءة المدينة (نهار / غروب / ليل)"
          >
            {timeOfDay === "day" ? "☀️ نهار" : timeOfDay === "sunset" ? "🌅 غروب" : "🌙 ليل"}
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

      {/* Quick-Jump Places Bar */}
      <div className="z-20 flex items-center gap-1.5 overflow-x-auto border-b border-[#eab308]/40 bg-gradient-to-l from-[#fef9c3] via-white to-[#fef9c3] px-3 py-1.5 text-[11px] font-black text-[#263238] no-scrollbar">
        <span className="shrink-0 text-[#b45309]">📍 انتقل إلى:</span>
        {landmarks
          .filter((l) => l.is_active)
          .map((l, idx) => {
            const wx = l.grid_x === 0 ? 0 : l.grid_x < 0 ? -1.95 : l.grid_x > 0 ? 1.95 : (idx - 1) * 1.95;
            return (
              <button
                key={`jump-l-${l.id}`}
                type="button"
                onClick={() => {
                  setSelectedResident(null);
                  setSelectedLandmark(l);
                  focusWorldPos(wx, -1.1);
                }}
                className="shrink-0 rounded-full border border-[#eab308] bg-white px-2.5 py-0.5 text-[11px] font-extrabold hover:bg-[#f2c94c] transition"
              >
                {l.landmark_type === "mosque" ? "🕌" : l.landmark_type === "heritage_council" ? "⛺" : "🏪"}{" "}
                {l.title.split("(")[0].trim()}
              </button>
            );
          })}
        <button
          type="button"
          onClick={() => {
            setSelectedLandmark(null);
            setSelectedResident(null);
            focusWorldPos(0, 1.3);
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

      {/* Main Realistic 3D Isometric Canvas Viewport */}
      <main className="relative flex-1 overflow-hidden">
        <RealisticCity3DCanvas
          residents={visibleResidents}
          landmarks={landmarks}
          settings={settings}
          camOffset={camOffset}
          setCamOffset={setCamOffset}
          camZoom={camZoom}
          setCamZoom={setCamZoom}
          camYaw={camYaw}
          camPitch={camPitch}
          timeOfDay={timeOfDay}
          selectedResidentId={selectedResident?.id ?? null}
          selectedLandmarkId={selectedLandmark?.id ?? null}
          onSelectResident={(r, wx, wy) => {
            setSelectedLandmark(null);
            setSelectedResident(r);
            focusWorldPos(wx, wy);
          }}
          onSelectLandmark={(l, wx, wy) => {
            setSelectedResident(null);
            setSelectedLandmark(l);
            focusWorldPos(wx, wy);
          }}
        />

        {/* Left Side: Easy Directional D-Pad */}
        <div
          data-city-ui
          className="pointer-events-auto absolute start-3 bottom-5 z-30 grid grid-cols-3 gap-1 rounded-2xl border-2 border-[#f2c94c] bg-white/90 p-1.5 shadow-xl backdrop-blur-md"
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
              setCamOffset({ x: 0, y: -10 });
              setCamZoom(typeof window !== "undefined" && window.innerWidth < 640 ? 0.62 : 0.92);
              setCamYaw(-0.24);
              setCamPitch(0.58);
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

        {/* Right Side: Zoom + 3D Orbit Rotate + Pitch Tilt */}
        <div
          data-city-ui
          className="pointer-events-auto absolute end-3 bottom-5 z-30 flex flex-col gap-2"
        >
          <button
            type="button"
            onClick={() => setCamZoom((z) => Math.min(1.9, Number((z + 0.16).toFixed(2))))}
            className="grid size-10 place-items-center rounded-2xl border-2 border-[#f2c94c] bg-white text-[#263238] shadow-lg hover:bg-[#fef9c3]"
            title="تكبير"
          >
            <ZoomIn className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setCamZoom((z) => Math.max(0.42, Number((z - 0.16).toFixed(2))))}
            className="grid size-10 place-items-center rounded-2xl border-2 border-[#f2c94c] bg-white text-[#263238] shadow-lg hover:bg-[#fef9c3]"
            title="تصغير"
          >
            <ZoomOut className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setCamYaw((y) => y + Math.PI / 6)}
            className="grid size-10 place-items-center rounded-2xl border-2 border-[#263238] bg-[#fef9c3] text-[10px] font-black text-[#263238] shadow-lg"
            title="تدوير الكاميرا 3D"
          >
            🔄 3D
          </button>
          <button
            type="button"
            onClick={() => setCamPitch((p) => (p < 0.65 ? 0.78 : p > 0.7 ? 0.45 : 0.58))}
            className="grid size-10 place-items-center rounded-2xl border-2 border-[#f2c94c] bg-white text-[10px] font-black text-[#263238] shadow-lg"
            title="تغيير زاوية الميلان"
          >
            📐 ميل
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
