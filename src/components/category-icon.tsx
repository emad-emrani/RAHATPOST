import {
  Banknote,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  Fuel,
  GraduationCap,
  HeartPulse,
  Landmark,
  LayoutGrid,
  MapPin,
  MoonStar,
  Newspaper,
  PartyPopper,
  Shirt,
  ShoppingBasket,
  Trophy,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  الكل: LayoutGrid,
  "مطاعم ومقاهي": UtensilsCrossed,
  بقالات: ShoppingBasket,
  صحة: HeartPulse,
  تعليم: GraduationCap,
  مساجد: MoonStar,
  ملابس: Shirt,
  "بنوك وصرّافات": Banknote,
  "سيارات ووقود": Fuel,
  ورش: Wrench,
  مناسبات: PartyPopper,
  "رياضة وترفيه": Trophy,
  "خدمات عامة": Building2,
  خدمات: BriefcaseBusiness,
  // news
  رهط: MapPin,
  النقب: MapPin,
  بلدية: Landmark,
  رياضة: Trophy,
  مجتمع: Newspaper,
  أعمال: Briefcase,
};

export function CategoryIcon({ category, className = "size-6" }: { category: string; className?: string }) {
  const Icon = ICONS[category] ?? Newspaper;
  return <Icon className={className} aria-hidden />;
}
