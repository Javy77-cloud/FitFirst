"use client";

import type { ReactNode } from "react";
import { BusinessSectionNav, type BusinessSectionCounts } from "@/components/business-section-nav";
import { RecordTabShell } from "@/components/records/record-tab-shell";
import {
  businessPanelIdForSection,
  parseBusinessTab,
  type BusinessTabSlug,
} from "@/lib/desk/business-tabs";
import type { BusinessSectionId } from "@/lib/desk/business-sections";

export type BusinessPanelSlot = {
  id: BusinessSectionId;
  title?: string;
  badge?: ReactNode;
  "data-ff"?: string;
  /** Extra class on the panel card (At a Glance / Details already wrap themselves). */
  bare?: boolean;
  children: ReactNode;
};

/**
 * True swapping tabs for Account — only the active panel is shown.
 * Sticky chip nav stays above; Quick Comms rail stays outside (page owns rail).
 */
export function BusinessDetailSections({
  selectedIds,
  counts,
  panels,
  activeTab,
  basePath,
  endSlot,
}: {
  selectedIds: BusinessSectionId[];
  counts?: BusinessSectionCounts;
  panels: BusinessPanelSlot[];
  activeTab?: string | null;
  basePath: string;
  /** ··· overflow menu — rendered at end of tab row. */
  endSlot?: ReactNode;
}) {
  const resolved = parseBusinessTab(activeTab, null);
  const shellPanels = groupPanels(panels);

  return (
    <>
      <div className="mb-1" data-ff-business-section-nav-host="">
        <BusinessSectionNav
          selectedIds={selectedIds}
          counts={counts}
          activeTab={resolved}
          basePath={basePath}
          mode="tabs"
          endSlot={endSlot}
        />
      </div>
      <RecordTabShell activeId={resolved} panels={shellPanels} />
    </>
  );
}

function groupPanels(
  panels: BusinessPanelSlot[],
): Array<{ id: BusinessTabSlug; children: ReactNode }> {
  const order: BusinessTabSlug[] = [];
  const byTab = new Map<BusinessTabSlug, BusinessPanelSlot[]>();
  for (const panel of panels) {
    const tab = businessPanelIdForSection(panel.id);
    if (!byTab.has(tab)) {
      byTab.set(tab, []);
      order.push(tab);
    }
    byTab.get(tab)!.push(panel);
  }
  return order.map((tab) => {
    const group = byTab.get(tab) ?? [];
    return {
      id: tab,
      children: (
        <div className="space-y-3" data-ff-business-tab-body={tab}>
          {group.map((panel) =>
            panel.bare ? (
              <div key={panel.id} id={panel.id} data-ff={panel["data-ff"]} data-ff-business-panel={panel.id}>
                {panel.children}
              </div>
            ) : (
              <section
                key={panel.id}
                id={panel.id}
                className="ff-card space-y-3 p-4"
                data-ff={panel["data-ff"]}
                data-ff-business-panel={panel.id}
              >
                {panel.title ? (
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-[#002868]">{panel.title}</h2>
                    {panel.badge != null ? (
                      <span className="text-xs text-muted-foreground">{panel.badge}</span>
                    ) : null}
                  </div>
                ) : null}
                {panel.children}
              </section>
            ),
          )}
        </div>
      ),
    };
  });
}
