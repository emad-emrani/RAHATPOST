export type RahatSectionKey = 'news' | 'buses' | 'services' | 'directory' | 'haraj' | 'menus';

export interface RahatSectionConfig {
  id: RahatSectionKey;
  title: string;
  subtitle: string;
  badge: string;
  order: number;
  visible: boolean;
  layoutStyle: 'grid' | 'list' | 'carousel' | 'featured';
  itemsLimit: number;
  showOnWeb: boolean;
  showOnAndroid: boolean;
  showOnIos: boolean;
}

export interface RahatAppearanceConfig {
  brandPrimary: string;
  brandSecondary: string;
  themeMode: 'light' | 'dark' | 'auto';
  borderRadius: 'sharp' | 'balanced' | 'rounded';
  density: 'compact' | 'comfortable' | 'spacious';
  showBreakingTicker: boolean;
  stickyHeader: boolean;
  showQuickSearch: boolean;
  showCityWeatherWidget: boolean;
  customHeaderNotice: string;
}

export interface RahatMenuItem {
  id: string;
  label: string;
  url: string;
  sectionRef?: RahatSectionKey | 'custom';
  location: 'header' | 'mobile_bottom' | 'drawer' | 'footer';
  order: number;
  visible: boolean;
  openInNewTab: boolean;
  badge?: string;
}

export interface RahatSectionItem {
  id: string;
  sectionKey: Exclude<RahatSectionKey, 'menus'>;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  phoneOrRoute: string;
  priceOrTime: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface RahatLayoutConfig {
  version: number;
  status: 'draft' | 'published';
  updatedAt: string;
  storageMode: 'json-zero-db';
  compatibility: {
    preserveOriginalDesign: boolean;
    applyToWeb: boolean;
    applyToAndroid: boolean;
    applyToIos: boolean;
    cacheTtlSeconds: number;
  };
  appearance: RahatAppearanceConfig;
  sections: RahatSectionConfig[];
  menus: RahatMenuItem[];
  sectionItems: RahatSectionItem[];
}
