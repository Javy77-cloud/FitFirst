"use client";

import { useCallback, useState, type ReactNode } from "react";
import { BusinessSectionNav, type BusinessSectionCounts } from "@/components/business-section-nav";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import type { BusinessSectionId } from "@/lib/desk/business-sections";

/** Sections under Business Details that participate in chip-driven accordion. */
export const BUSINESS_ACCORDION_IDS = [
  "locations",
  "policies",
  "deals",
  "timeline",
  "emails",
  "sms",
  "meetings",
  "documents",
  "notes",
] as const;

export type BusinessAccordionId = (typeof BUSINESS_ACCORDION_IDS)[number];

function isAccordionId(id: BusinessSectionId): id is BusinessAccordionId {
  return (BUSINESS_ACCORDION_IDS as readonly string[]).includes(id);
}

function emptyOpenMap(): Record<BusinessAccordionId, boolean> {
  return {
    locations: false,
    policies: false,
    deals: false,
    timeline: false,
    emails: false,
    sms: false,
    meetings: false,
    documents: false,
    notes: false,
  };
}

export type AccordionSectionSlot = {
  id: BusinessAccordionId;
  title: string;
  badge?: ReactNode;
  "data-ff"?: string;
  children: ReactNode;
};

/**
 * Owns chip accordion vs manual multi-open for post–Business Details sections.
 * At a Glance / Business Details stay outside (always open) — pass as `before`.
 */
export function BusinessDetailSections({
  selectedIds,
  counts,
  before,
  sections,
}: {
  selectedIds: BusinessSectionId[];
  counts?: BusinessSectionCounts;
  before: ReactNode;
  sections: AccordionSectionSlot[];
}) {
  const [openMap, setOpenMap] = useState<Record<BusinessAccordionId, boolean>>(emptyOpenMap);

  const onNavigate = useCallback((id: BusinessSectionId) => {
    if (!isAccordionId(id)) return;
    setOpenMap(() => {
      const next = emptyOpenMap();
      next[id] = true;
      return next;
    });
  }, []);

  const onManualOpenChange = useCallback((id: BusinessAccordionId, open: boolean) => {
    setOpenMap((prev) => ({ ...prev, [id]: open }));
  }, []);

  return (
    <>
      <div className="mb-1" data-ff-business-section-nav-host="">
        <BusinessSectionNav
          selectedIds={selectedIds}
          counts={counts}
          onNavigate={onNavigate}
        />
      </div>
      {before}
      <div className="space-y-3" data-ff-business-accordion-sections="">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.id}
            id={section.id}
            title={section.title}
            badge={section.badge}
            open={openMap[section.id]}
            onOpenChange={(v) => onManualOpenChange(section.id, v)}
            data-ff={section["data-ff"]}
          >
            {section.children}
          </CollapsibleSection>
        ))}
      </div>
    </>
  );
}
