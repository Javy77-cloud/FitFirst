import { describe, expect, it } from "vitest";
import {
  checklistItemType,
  groupChecklistAttention,
  type AttentionGroupInput,
} from "./attention-group";

function item(partial: Partial<AttentionGroupInput> & { id: string; title: string }): AttentionGroupInput {
  return {
    kind: "task",
    detail: "Due 9-19-2026 · servicing id card",
    href: `/policies/${partial.id}`,
    ...partial,
  };
}

describe("groupChecklistAttention", () => {
  it("reads Collect / Servicing item types", () => {
    expect(checklistItemType(item({ id: "1", title: "Collect ID cards · HP-FL-88421" }))).toBe(
      "Collect ID cards",
    );
    expect(checklistItemType(item({ id: "2", title: "Collect AOR packet · HO3-ELENA-2026" }))).toBe(
      "Collect AOR packet",
    );
    expect(checklistItemType(item({ id: "3", title: "Servicing · ID cards · ATM205086" }))).toBe(
      "Servicing · ID cards",
    );
    expect(checklistItemType(item({ id: "4", title: "Shah · HO3-1 lapsed", kind: "lapse" }))).toBeNull();
  });

  it("collapses duplicate Collect walls into one group with count", () => {
    const rows = groupChecklistAttention([
      item({ id: "a", title: "Collect ID cards · P1" }),
      item({ id: "b", title: "Collect ID cards · P2" }),
      item({ id: "c", title: "Collect ID cards · P3" }),
      item({ id: "d", title: "Collect AOR packet · P1" }),
      item({ id: "e", title: "Collect AOR packet · P9" }),
      item({ id: "f", title: "Bound deal waiting", kind: "bound_pending" }),
    ]);
    expect(rows.map((row) => row.kind)).toEqual(["checklist_group", "checklist_group", "single"]);
    const idCards = rows[0];
    expect(idCards.kind).toBe("checklist_group");
    if (idCards.kind === "checklist_group") {
      expect(idCards.itemType).toBe("Collect ID cards");
      expect(idCards.count).toBe(3);
      expect(idCards.samplePolicies).toEqual(["P1", "P2", "P3"]);
    }
    const aor = rows[1];
    expect(aor.kind).toBe("checklist_group");
    if (aor.kind === "checklist_group") {
      expect(aor.count).toBe(2);
    }
    expect(rows[2].kind).toBe("single");
  });

  it("leaves a lone checklist row ungrouped", () => {
    const rows = groupChecklistAttention([item({ id: "a", title: "Collect ID cards · P1" })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("single");
  });
});
