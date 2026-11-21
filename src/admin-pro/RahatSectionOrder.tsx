import React from 'react';
import { useRahatLayout } from './useRahatLayout';
import type { RahatSectionKey } from './types';

interface RahatSectionOrderProps {
  /**
   * مرّر مكوناتك الحالية كما هي بدون أي تعديل على تصميمها:
   * <RahatSectionOrder sections={{ news: <News />, buses: <Buses />, services: <Services />, directory: <Directory />, haraj: <Haraj />, menus: <Menus /> }} />
   */
  sections: Partial<Record<RahatSectionKey, React.ReactNode>>;
  defaultOrder?: RahatSectionKey[];
}

const FALLBACK_ORDER: RahatSectionKey[] = ['news', 'buses', 'services', 'directory', 'haraj', 'menus'];

export const RahatSectionOrder: React.FC<RahatSectionOrderProps> = ({
  sections,
  defaultOrder = FALLBACK_ORDER
}) => {
  const { isActive, orderedSections } = useRahatLayout();

  // إذا كان التفعيل مغلقاً من لوحة التحكم: يعرض الأقسام بالترتيب الأصلي 100%
  if (!isActive || orderedSections.length === 0) {
    return (
      <>
        {defaultOrder.map((key) =>
          sections[key] ? <React.Fragment key={key}>{sections[key]}</React.Fragment> : null
        )}
      </>
    );
  }

  return (
    <>
      {orderedSections.map((sec) =>
        sections[sec.id] ? <React.Fragment key={sec.id}>{sections[sec.id]}</React.Fragment> : null
      )}
    </>
  );
};
