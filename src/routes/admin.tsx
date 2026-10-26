import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  CloudSun,
  Cpu,
  Flag,
  FolderPlus,
  GalleryHorizontal,
  Globe,
  House,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  MonitorUp,
  Newspaper,
  Palette,
  PenSquare,
  Pill,
  Rss,
  Settings,
  ShieldX,
  ShoppingBag,
  Siren,
  Sparkles,
  Store,
  Trophy,
  Type,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { PhotoStrip } from "@/components/photo-picker";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { AuthLayout } from "@/components/auth-layout";
import { priceLabel, STATUS_LABEL, type ListingStatus, type OwnListing } from "@/lib/market/types";
import { adminDecide, adminList, adminLogin, adminLogout } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";
import { adminWhoami } from "@/lib/team/api";
import type { AdminLevel } from "@/lib/admin-auth";
import { type OwnReaderNews, type ReaderNewsStatus } from "@/lib/reader-news/types";
import { tr, trv } from "@/lib/i18n/core";
import { AdminSearch, CardBoundary, DashboardHome, ReviewQueue, Skeleton } from "@/components/admin/admin-v2";
import type { SiteSettingsPart } from "@/components/admin/site-settings-admin";
import { LangSwitcher } from "@/components/lang-switcher";

const SiteSettingsAdmin = lazy(() => import("@/components/admin/site-settings-admin").then((m) => ({ default: m.SiteSettingsAdmin })));
const AutoNewsAdmin = lazy(() => import("@/components/admin/auto-news-admin").then((m) => ({ default: m.AutoNewsAdmin })));
const SectionAdmin = lazy(() => import("@/components/admin/section-admin").then((m) => ({ default: m.SectionAdmin })));
const PublishAdmin = lazy(() => import("@/components/admin/publish-admin").then((m) => ({ default: m.PublishAdmin })));
const MatchesAdmin = lazy(() => import("@/components/matches").then((m) => ({ default: m.MatchesAdmin })));
const MembersAdmin = lazy(() => import("@/components/admin/members-admin").then((m) => ({ default: m.MembersAdmin })));
const EmailAdmin = lazy(() => import("@/components/admin/email-admin").then((m) => ({ default: m.EmailAdmin })));
const PopupsAdmin = lazy(() => import("@/components/admin/popups-admin").then((m) => ({ default: m.PopupsAdmin })));
const LanguagesAdmin = lazy(() => import("@/components/admin/languages-admin").then((m) => ({ default: m.LanguagesAdmin })));
const GeminiAdmin = lazy(() => import("@/components/admin/gemini-admin").then((m) => ({ default: m.GeminiAdmin })));
const StatsAdmin = lazy(() => import("@/components/admin/stats-admin").then((m) => ({ default: m.StatsAdmin })));
const StoreAdmin = lazy(() => import("@/components/admin/store-admin").then((m) => ({ default: m.StoreAdmin })));

// تم تصحيح مسارات الاستيراد لكل مكون بشكل منفصل لتجنب خطأ الـ Build على Vercel
const CommentsAdmin = lazy(() => import("@/components/admin/comments-admin").then((m) => ({ default: m.CommentsAdmin })));
const ReportsAdmin = lazy(() => import("@/components/admin/reports-admin").then((m) => ({ default: m.ReportsAdmin })));
const DutyAdmin = lazy(() => import("@/components/admin/duty-admin").then((m) => ({ default: m.DutyAdmin })));
const AlertsAdmin = lazy(() => import("@/components/admin/alerts-admin").then((m) => ({ default: m.AlertsAdmin })));
const Push
