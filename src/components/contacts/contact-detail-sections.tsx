"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ContactSectionNav, type ContactSectionCounts } from "@/components/contact-section-nav";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import type { ContactSectionId } from "@/lib/desk/contact-sections";

/** Sections under Contact Details that participate in chip-driven accordion. */
export const CONTACT_ACCORDION_IDS = [
  "policies",
  "deals",
  "timeline",
  "emails",
  "sms",
  "meetings",
  "documents",
  "notes",
] as const;

export type ContactAccordionId = (typeof CONTACT_ACCORDION_IDS)[number];

function isAccordionId(id: ContactSectionId): id is ContactAccordionId {
  return (CONTACT_ACCORDION_IDS as readonly string[]).includes(id);
}

function emptyOpenMap(): Record<ContactAccordionId, boolean> {
  return {
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
  id: ContactAccordionId;
  title: string;
  badge?: ReactNode;
  "data-ff"?: string;
  children: ReactNode;
};

/**
 * Owns chip accordion vs manual multi-open for post–Contact Details sections.
 * At a Glance / Contact Details stay outside (always open) — pass as `before`.
 */
export function ContactDetailSections({
  selectedIds,
  counts,
  before,
  sections,
}: {
  selectedIds: ContactSectionId[];
  counts?: ContactSectionCounts;
  before: ReactNode;
  sections: AccordionSectionSlot[];
}) {
  const [openMap, setOpenMap] = useState<Record<ContactAccordionId, boolean>>(emptyOpenMap);

  const onNavigate = useCallback((id: ContactSectionId) => {
    if (!isAccordionId(id)) return;
    setOpenMap(() => {
      const next = emptyOpenMap();
      next[id] = true;
      return next;
    });
  }, []);

  const onManualOpenChange = useCallback((id: ContactAccordionId, open: boolean) => {
    setOpenMap((prev) => ({ ...prev, [id]: open }));
  }, []);

  return (
    <>
      <div className="mb-1" data-ff-contact-section-nav-host="">
        <ContactSectionNav
          selectedIds={selectedIds}
          counts={counts}
          onNavigate={onNavigate}
        />
      </div>
      {before}
      <div className="space-y-3" data-ff-contact-accordion-sections="">
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
