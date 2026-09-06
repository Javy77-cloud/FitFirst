import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { statusColorFor, tempColor } from "@/lib/desk/status-colors";
import {
  CAMPAIGNS_LIST_COLUMNS,
  CERTIFICATES_LIST_COLUMNS,
  INSPECTIONS_LIST_COLUMNS,
  isLiveSearchColumn,
  labeledColumns,
} from "@/lib/list-columns";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("platform UI standards", () => {
  it("uses one Choose files drop-zone label", () => {
    const text = source("src/components/choose-files.tsx");
    expect(text).toMatch(/Choose files/);
    expect(text).toMatch(/ff-file-drop/);
    expect(text).toMatch(/or drop files here/);
    expect(source("src/app/settings/import/page.tsx")).toMatch(/ChooseFiles/);
    expect(source("src/app/settings/import/page.tsx")).not.toMatch(/type=["']file["']/);
  });

  it("delete control is a right-side trash icon", () => {
    const icon = source("src/components/ui/file-delete-icon.tsx");
    expect(icon).toMatch(/Trash2/);
    expect(icon).toMatch(/ff-file-delete/);
    const button = source("src/components/documents/delete-uploaded-file.tsx");
    expect(button).toMatch(/FileDeleteIcon/);
    expect(button).not.toMatch(/<Button/);
  });

  it("create actions toast then redirect to the list", () => {
    expect(source("src/app/actions/crm.ts")).toMatch(/redirect\("\/leads\?saved=1"\)/);
    expect(source("src/app/actions/crm.ts")).toMatch(/redirect\("\/contacts\?saved=1"\)/);
    expect(source("src/app/actions/crm.ts")).toMatch(/redirect\("\/deals\?saved=1"\)/);
    expect(source("src/app/actions/activities.ts")).toMatch(/redirect\("\/accounts\?saved=1"\)/);
    expect(source("src/app/actions/claims.ts")).toMatch(/redirect\("\/claims\?saved=1"\)/);
    expect(source("src/app/actions/campaigns.ts")).toMatch(/redirect\("\/campaigns\?saved=1"\)/);
    expect(source("src/components/desk/saved-toast.tsx")).toMatch(/router\.replace\(listHref/);
  });

  it("primary form actions share one full-width class", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\.ff-primary-action/);
    expect(css).toMatch(/\.ff-form-actions/);
    expect(source("src/components/desk/form-actions.tsx")).toMatch(/ff-primary-action/);
  });

  it("shared table rows use the same light divider", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(/--ff-row-line:\s*#c9bda8/);
    expect(css).toMatch(/\.ff-table td \{[\s\S]*border-bottom:\s*1px solid var\(--ff-row-line\)/);
  });

  it("leftover list pages use DeskColumnTable + Columns", () => {
    for (const file of [
      "src/app/inspections/page.tsx",
      "src/app/endorsements/page.tsx",
      "src/app/service-requests/page.tsx",
      "src/app/notices/page.tsx",
      "src/app/suspense/page.tsx",
      "src/app/installments/page.tsx",
      "src/app/campaigns/page.tsx",
      "src/app/logs/page.tsx",
    ]) {
      expect(source(file), file).toMatch(/DeskColumnTable/);
    }
    expect(INSPECTIONS_LIST_COLUMNS[0]?.id).toBe("policy");
    expect(CAMPAIGNS_LIST_COLUMNS.find((column) => column.id === "campaign")?.locked).toBe(true);
    expect(CERTIFICATES_LIST_COLUMNS[0]?.label).toBe("Number");
  });

  it("leftover sheet headers use the funnel, not arrows, and Name stays search-only", () => {
    const header = source("src/components/sheet/sheet-header.tsx");
    expect(header).toMatch(/FunnelIcon/);
    expect(header).toMatch(/data-sheet-sort="asc"/);
    expect(header).not.toMatch(/ArrowUpDown/);
    expect(header).toMatch(/isLiveSearchColumn/);
    expect(isLiveSearchColumn({ id: "name", label: "Name" })).toBe(true);
    expect(isLiveSearchColumn({ id: "status", label: "Status" })).toBe(false);
  });

  it("status and temp badges share one palette", () => {
    expect(tempColor("hot")).toBe("rose");
    expect(tempColor("warm")).toBe("amber");
    expect(tempColor("cold")).toBe("blue");
    expect(statusColorFor("quoted")).toBe("teal");
    expect(statusColorFor("declined")).toBe("rose");
    expect(statusColorFor("requested")).toBe("blue");
    expect(statusColorFor("service_requested")).toBe("blue");
    expect(statusColorFor("installment_past_due")).toBe("rose");
    expect(source("src/components/quotes/status-badge.tsx")).toMatch(/StatusBadge/);
    expect(source("src/components/claims/status-badge.tsx")).toMatch(/StatusBadge/);
    for (const file of [
      "src/components/ams/service-request-panel.tsx",
      "src/components/ams/claim-diary-panel.tsx",
      "src/components/ams/service-timeline-panel.tsx",
      "src/components/record-context/record-context-rail.tsx",
    ]) {
      expect(source(file), file).toMatch(/StatusBadge/);
      expect(source(file), file).not.toMatch(/rounded-full bg-\[var\(--ff-sidebar\)\]/);
      expect(source(file), file).not.toMatch(/bg-navy/);
    }
    expect(labeledColumns([["policy", "Policy", true]])[0]).toMatchObject({
      id: "policy",
      locked: true,
    });
  });
});
