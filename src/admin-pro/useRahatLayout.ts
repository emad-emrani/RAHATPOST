import { useEffect, useState } from 'react';
import type { RahatLayoutConfig, RahatMenuItem, RahatSectionConfig, RahatSectionItem } from './types';

const LAYOUT_URL = '/rahatpost-layout.json';
const LOCAL_KEY = 'rahatpost_admin_pro_v3_config';
const PREVIEW_KEY = 'rahatpost_admin_pro_v3_live_preview';
const CHANNEL_NAME = 'rahatpost_admin_pro_v3_channel';

/**
 * هوك خفيف بدون قاعدة بيانات لربط الصفحة الرئيسية في موقع رهط بوست
 * بملف /rahatpost-layout.json بشكل آمن 100%.
 *
 * إذا كان applyToWeb = false يرجع isActive = false فيبقى تصميمك الأصلي كما هو.
 */
export function useRahatLayout() {
  const [config, setConfig] = useState<RahatLayoutConfig | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        if (localStorage.getItem(PREVIEW_KEY) === '1') {
          const cached = localStorage.getItem(LOCAL_KEY);
          if (cached && active) {
            setConfig(JSON.parse(cached) as RahatLayoutConfig);
            return;
          }
        }
      } catch {
        // Ignore storage errors
      }

      try {
        const res = await fetch(`${LAYOUT_URL}?v=${Math.floor(Date.now() / 60000)}`, { cache: 'no-cache' });
        if (!res.ok) return;
        const data = (await res.json()) as RahatLayoutConfig;
        if (active) setConfig(data);
      } catch {
        // Silent fallback: never break existing website
      }
    };

    load();

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'LAYOUT_UPDATED' && ev.data?.payload && active) {
            setConfig(ev.data.payload as RahatLayoutConfig);
          }
        };
      } catch {
        // Ignore
      }
    }

    return () => {
      active = false;
      if (bc) bc.close();
    };
  }, []);

  const isActive = Boolean(config?.compatibility?.applyToWeb);

  const orderedSections: RahatSectionConfig[] = config
    ? [...config.sections]
        .filter((s) => s.visible && s.showOnWeb)
        .sort((a, b) => a.order - b.order)
    : [];

  const getMenus = (location?: RahatMenuItem['location']): RahatMenuItem[] =>
    config
      ? [...config.menus]
          .filter((m) => m.visible && (!location || m.location === location))
          .sort((a, b) => a.order - b.order)
      : [];

  const getItems = (sectionKey: RahatSectionItem['sectionKey']): RahatSectionItem[] =>
    config
      ? [...(config.sectionItems || [])]
          .filter((i) => i.isActive && i.sectionKey === sectionKey)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : [];

  return {
    config,
    isActive,
    preserveOriginalDesign: config?.compatibility?.preserveOriginalDesign ?? true,
    orderedSections,
    getMenus,
    getItems
  };
}
