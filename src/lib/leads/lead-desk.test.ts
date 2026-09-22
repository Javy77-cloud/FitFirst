import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { insertMissingColumnIds, leadsListColumnsFromLayout } from "@/lib/list-columns";
import {
  leadHeatClass,
  leadLayoutDisplayValue,
  leadLobLabel,
  leadNextChaseLabel,
  leadPolicyFormLabel,
  leadSilenceCue,
  leadsDeskHref,
  parseLeadsView,
  presentLeadDesk,
} from "@/lib/leads/lead-desk";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("leads stack + queue desk", () => {
  it("defaults to Stack and maps legacy List bookmarks to Queue", () => {
    expect(parseLeadsView(undefined)).toBe("stack");
    expect(parseLeadsView("stack")).toBe("stack");
    expect(parseLeadsView("queue")).toBe("queue");
    expect(parseLeadsView("list")).toBe("queue");
    expect(parseLeadsView("table")).toBe("queue");
    expect(parseLeadsView("grid")).toBe("queue");
    expect(leadsDeskHref("stack", { status: "in_progress" })).toBe("/leads?status=in_progress");
    expect(leadsDeskHref("queue", { q: "Jenny" })).toBe("/leads?q=Jenny&view=queue");
    expect(source("src/components/leads/leads-view-switch.tsx")).toMatch(/Stack Queue/);
    expect(source("src/components/leads/leads-view-switch.tsx")).not.toMatch(/Stack Queue List/);
    expect(source("src/components/leads/leads-view-switch.tsx")).toMatch(/LEADS_VIEW_OPTIONS/);
    expect(source("src/lib/leads/lead-desk.ts")).not.toMatch(/\["list", "List"\]/);
    expect(source("src/app/leads/page.tsx")).toMatch(/parseLeadsView/);
    expect(source("src/app/leads/page.tsx")).toMatch(/LeadsPriorityStack/);
    expect(source("src/app/leads/page.tsx")).not.toMatch(/LeadsHostList/);
    expect(source("src/app/leads/page.tsx")).toMatch(/Stack is the desk\. Queue is the work sheet\./);
    expect(source("src/app/leads/page.tsx")).not.toMatch(/List is columns/);
  });

  it("shows policy form and LOB on the queue when the lead layout has them", () => {
    expect(leadPolicyFormLabel({ insurance_subtype: "HO3" })).toBe("HO3");
    expect(leadPolicyFormLabel({ insurance_subtype: "", picklist: "DP3" })).toBe("DP3");
    expect(leadPolicyFormLabel({ quoting_form: "HO6" })).toBe("HO6");
    expect(leadPolicyFormLabel({})).toBe("");
    expect(leadLobLabel({ insurance_category: "Home" }, "AUTO")).toBe("Home");
    expect(leadLobLabel({}, "HO")).toBe("Homeowners");
    expect(leadLayoutDisplayValue("insurance_subtype", { insurance_subtype: "HO3" })).toBe("HO3");
    expect(leadLayoutDisplayValue("insurance_subtype", {})).toBe("—");
    expect(leadLayoutDisplayValue("insurance_category", { insurance_category: "Landlord" })).toBe("Landlord");

    const columns = leadsListColumnsFromLayout(defaultLayoutForModule("leads"));
    const policyColumn = columns.find((column) => column.id === "insurance_subtype");
    expect(policyColumn?.label).toBe("Policy form");
    expect(policyColumn?.defaultOn).toBe(true);
    expect(columns.find((column) => column.id === "insurance_category")?.defaultOn).toBe(true);

    const pinned = insertMissingColumnIds(["name", "cadence", "status"], ["insurance_subtype", "name"]);
    expect(pinned).toEqual(["name", "cadence", "status", "insurance_subtype"]);

    const jenny = presentLeadDesk({
      id: "jenny",
      firstName: "Jenny",
      lastName: "Rodriguez",
      status: "in_progress",
      cadence: "new",
      createdAt: "2026-09-20T12:00:00.000Z",
      firstContactAt: null,
      fieldValues: { insurance_subtype: "HO3", insurance_category: "Home" },
      now: new Date("2026-09-21T12:00:00.000Z"),
    });
    expect(jenny.policyForm).toBe("HO3");
    expect(jenny.lob).toBe("Home");
    expect(jenny.lineLabel).toBe("HO3");
    expect(jenny.waitingOnFirstCall).toBe(true);
    expect(leadLayoutDisplayValue("insurance_subtype", jenny.fieldValues)).toBe("HO3");

    expect(source("src/app/leads/page.tsx")).toMatch(/leadLayoutDisplayValue/);
    expect(source("src/app/leads/page.tsx")).toMatch(/data-ff-lead-policy-form/);
    expect(source("src/app/leads/page.tsx")).toMatch(/pinVisibleIds/);
    expect(source("src/components/leads/leads-priority-stack.tsx")).toMatch(/data-ff-lead-policy-form/);
  });

  it("keeps first-call silence and click-edit on the stack card", () => {
    const now = new Date("2026-09-21T15:00:00.000Z");
    const waiting = leadSilenceCue({
      createdAt: "2026-09-21T12:00:00.000Z",
      firstContactAt: null,
      now,
    });
    expect(waiting.waitingOnFirstCall).toBe(true);
    expect(waiting.text).toMatch(/No first call/);

    const silent = leadSilenceCue({
      createdAt: "2026-09-01T12:00:00.000Z",
      firstContactAt: "2026-09-19T15:00:00.000Z",
      now,
    });
    expect(silent.waitingOnFirstCall).toBe(false);
    expect(silent.text).toMatch(/silent/);

    expect(
      leadNextChaseLabel({ nextDue: null, waitingOnFirstCall: true, clockDone: false, now }),
    ).toBe("Chase the first call");
    expect(
      leadNextChaseLabel({
        nextDue: "2026-09-21T18:30:00.000Z",
        waitingOnFirstCall: false,
        now,
      }),
    ).toMatch(/^Next chase /);

    expect(leadHeatClass("hot")).toBe("hot");
    expect(leadHeatClass("warm")).toBe("warm");
    expect(leadHeatClass("cold")).toBe("cold");

    const stack = source("src/components/leads/leads-priority-stack.tsx");
    expect(stack).toMatch(/ff-stack-card/);
    expect(stack).toMatch(/ff-stack-glyph/);
    expect(stack).toMatch(/ff-priority-stack/);
    expect(stack).toMatch(/LeadPipelineStatusSelect/);
    expect(stack).toMatch(/LeadTemplateOverride/);
    expect(stack).toMatch(/LeadHeatToggle/);
    expect(stack).toMatch(/ResponseTimer/);
    expect(stack).toMatch(/StartShopForm/);
    expect(stack).toMatch(/data-ff-lead-card-edits/);
    expect(stack).toMatch(/ff-heat-/);
    expect(source("src/app/globals.css")).toMatch(/\.ff-heat-warm/);
    expect(source("src/app/leads/page.tsx")).toMatch(/LeadCadenceSelect/);
    expect(source("src/app/leads/page.tsx")).toMatch(/DeskColumnTable/);
    expect(source("src/components/lists/column-table.tsx")).toMatch(/ColumnsMenu|reorderVisibleColumns/);
  });

  it("spreads Stack cards as two fixed rows with chase cue and Convert on top", () => {
    const stack = source("src/components/leads/leads-priority-stack.tsx");
    const css = source("src/app/globals.css");

    expect(stack).toMatch(/data-ff-lead-stack-top/);
    expect(stack).toMatch(/data-ff-lead-stack-bottom/);
    expect(stack).toMatch(/data-ff-lead-stack-identity/);
    expect(stack).toMatch(/data-ff-lead-stack-convert/);
    expect(stack).toMatch(/data-ff-stack-mid/);
    expect(stack).toMatch(/data-ff-silence-cue/);
    expect(stack).toMatch(/data-ff-next-chase/);
    expect(stack).toMatch(/StartShopForm/);
    expect(stack).toMatch(/data-ff-lead-policy-form/);
    expect(stack).toMatch(/LeadTemplateOverride/);
    expect(stack).toMatch(/LeadPipelineStatusSelect/);
    expect(stack).toMatch(/ResponseTimer/);
    expect(stack).toMatch(/LeadHeatToggle/);
    expect(stack).not.toMatch(/LeadCadenceSelect/);

    const topAt = stack.indexOf("data-ff-lead-stack-top");
    const midAt = stack.indexOf("data-ff-stack-mid");
    const convertAt = stack.indexOf("data-ff-lead-stack-convert");
    const bottomAt = stack.indexOf("data-ff-lead-stack-bottom");
    expect(topAt).toBeGreaterThan(-1);
    expect(midAt).toBeGreaterThan(topAt);
    expect(convertAt).toBeGreaterThan(midAt);
    expect(bottomAt).toBeGreaterThan(convertAt);

    const policyAt = stack.indexOf('data-ff-lead-stack-col="policy"');
    const followAt = stack.indexOf('data-ff-lead-stack-col="follow-up"');
    const statusAt = stack.indexOf('data-ff-lead-stack-col="status"');
    const responseAt = stack.indexOf('data-ff-lead-stack-col="response"');
    const heatAt = stack.indexOf('data-ff-lead-stack-col="heat"');
    expect(policyAt).toBeGreaterThan(bottomAt);
    expect(followAt).toBeGreaterThan(policyAt);
    expect(statusAt).toBeGreaterThan(followAt);
    expect(responseAt).toBeGreaterThan(statusAt);
    expect(heatAt).toBeGreaterThan(responseAt);

    expect(css).toMatch(
      /\[data-ff-leads-stack\] \.ff-lead-stack-top \{[^}]*grid-template-columns:\s*minmax\(7\.5rem,\s*max-content\) minmax\(0,\s*1fr\) max-content/,
    );
    expect(css).toMatch(
      /\[data-ff-leads-stack\] \.ff-lead-stack-bottom \{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/,
    );
  });
});
