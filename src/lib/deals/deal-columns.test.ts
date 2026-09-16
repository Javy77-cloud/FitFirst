import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { CUSTOM_FIELD_TYPE_LABELS, type FieldLayout } from "@/lib/custom-fields/types";
import { convertFieldCopy } from "@/lib/crm/convert";
import { dealValuesFromLead } from "@/lib/custom-fields/transfer";
import { defaultStageColor, stageColorFromNameOrSlug } from "@/lib/desk/status-colors";
import { SEEDED_PIPELINES } from "@/lib/wire/pipeline";
import {
  DEAD_DEAL_COLUMN_IDS,
  dealFieldRawValue,
  dealRecordPhone,
  dealStageView,
  dealsColumnsFromFields,
} from "./deal-columns";
import { dealsListColumnsFromFields } from "@/lib/list-columns";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const pc = SEEDED_PIPELINES.find((board) => board.slug === "p-c")!;
const boards = [
  {
    id: "pc",
    slug: "p-c",
    stages: pc.stages.map((stage, index) => ({
      slug: stage.slug,
      name: stage.name,
      color: defaultStageColor(index, stage.slug),
    })),
  },
];

describe("pipeline table deal-field columns", () => {
  it("builds the Columns picker from layout fields and drops E-sign / Comms / phantoms", () => {
    const layout: FieldLayout = {
      columns: [
        {
          id: "left",
          sections: [
            {
              id: "contact",
              label: "Contact",
              fieldKeys: ["first_name", "last_name", "email", "phone", "notes", "roof_year"],
            },
          ],
        },
        { id: "right", sections: [] },
      ],
    };
    const extra = { key: "roof_year", label: "Roof year", type: "number" as const };
    const cols = dealsColumnsFromFields([...CORE_FIELDS, extra], layout);
    const keys = cols.map((column) => column.key);
    expect(keys[0]).toBe("title");
    expect(keys[1]).toBe("stage");
    expect(keys).toContain("phone");
    expect(keys).toContain("notes");
    expect(keys).toContain("roof_year");
    // Core pipeline columns stay on the list even when Edit Layout omits them.
    expect(keys).toContain("line");
    expect(keys).toContain("source");
    expect(keys).toContain("assigned");
    expect(keys).toContain("value");
    expect(keys).not.toContain("premium");
    expect(keys).not.toContain("preferred_language");
    expect(keys).not.toContain("esign");
    expect(keys).not.toContain("comms");
    expect(keys).not.toContain("contact");
    expect(DEAD_DEAL_COLUMN_IDS).toEqual(["esign", "comms", "contact"]);
    const withoutRoof = dealsColumnsFromFields(CORE_FIELDS, defaultLayoutForModule("deals")).map(
      (column) => column.key,
    );
    expect(withoutRoof).not.toContain("roof_year");
    expect(withoutRoof).not.toContain("notes");
    expect(
      dealsListColumnsFromFields(CORE_FIELDS, defaultLayoutForModule("deals")).find(
        (column) => column.id === "phone",
      )?.label,
    ).toBe("Phone");
  });

  it("reads phone from the deal field store, not a contact or lead join", () => {
    const phoneField = CORE_FIELDS.find((field) => field.key === "phone")!;
    const deal = {
      title: "Javier Canales Home",
      pipelineStage: "quoting",
      pipelineStageSlug: "quotes",
      pipelineId: "pc",
      lineOfBusiness: "HO",
      state: "FL",
    };
    expect(dealFieldRawValue(phoneField, deal, { phone: "(321) 555-0144" })).toBe("(321) 555-0144");
    expect(dealFieldRawValue(phoneField, deal, {})).toBe("");
    expect(dealRecordPhone({ phone: "(321) 555-0144" })).toBe("(321) 555-0144");
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/dealRecordPhone/);
    expect(table).not.toMatch(/contact\?\.phone \?\? account\?\.phone/);
    expect(table).toMatch(/dealsListColumnsFromFields\(fields, layout\)/);
  });

  it("labels table stage from the same board list as Board / Funnel", () => {
    const quoting = dealStageView(
      {
        title: "Javier Canales Home",
        pipelineStage: "quoting",
        pipelineStageSlug: "quotes",
        pipelineId: "pc",
        lineOfBusiness: "HO",
      },
      boards,
    );
    expect(quoting.name).toBe("Markets");
    expect(quoting.slug).toBe("markets");
    expect(quoting.stages.map((stage) => stage.slug)).toEqual(pc.stages.map((stage) => stage.slug));
    expect(quoting.name).not.toBe("Quoting");
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/DealStageSelect/);
    expect(source("src/components/deals/deal-stage-select.tsx")).toMatch(/moveDealToStage/);
  });

  it("uses the same stage colors on the table select as Board StagePill", () => {
    const select = source("src/components/deals/deal-stage-select.tsx");
    const pill = source("src/components/fit-badge.tsx");
    expect(select).toMatch(/stageColorFromNameOrSlug/);
    expect(select).toMatch(/statusColorClass/);
    expect(select).toMatch(/data-stage-color/);
    expect(select).toMatch(/text-\[10px\]/);
    expect(select).toMatch(/font-semibold/);
    expect(select).toMatch(/h-7/);
    expect(select).not.toMatch(/text-sm/);
    expect(select).not.toMatch(/h-8/);
    expect(pill).toMatch(/stageColorFromNameOrSlug\(stage, color\)/);
    for (const [index, stage] of pc.stages.entries()) {
      const view = dealStageView(
        {
          title: "Javier Canales / Home",
          pipelineStage: stage.slug,
          pipelineStageSlug: stage.slug,
          pipelineId: "pc",
          lineOfBusiness: "HO",
        },
        boards,
      );
      const boardColor = stageColorFromNameOrSlug(stage.name, defaultStageColor(index, stage.slug));
      expect(view.color).toBe(boardColor);
      expect(view.name).toBe(stage.name);
    }
    expect(dealStageView({ title: "x", pipelineStage: "gather", pipelineStageSlug: "gather", lineOfBusiness: "HO" }, boards).color).toBe("blue");
    expect(dealStageView({ title: "x", pipelineStage: "quotes", pipelineStageSlug: "quotes", lineOfBusiness: "HO" }, boards).color).toBe("teal");
    expect(dealStageView({ title: "x", pipelineStage: "quote_sent", pipelineStageSlug: "quote_sent", lineOfBusiness: "HO" }, boards).color).toBe("violet");
    expect(dealStageView({ title: "x", pipelineStage: "closed_won", pipelineStageSlug: "closed_won", lineOfBusiness: "HO" }, boards).color).toBe("green");
    expect(stageColorFromNameOrSlug("ARCHIVE", "slate")).toBe("slate");
  });

  it("gives Flood the same P&C stage picklist as HO3", () => {
    const floodBoard = SEEDED_PIPELINES.find((board) => board.slug === "flood")!;
    const mixed = [
      ...boards,
      {
        id: "flood",
        slug: "flood",
        stages: floodBoard.stages.map((stage, index) => ({
          slug: stage.slug,
          name: stage.name,
          color: defaultStageColor(index, stage.slug),
        })),
      },
    ];
    const heather = dealStageView(
      {
        title: "Heather / Flood",
        pipelineStage: "gather",
        pipelineStageSlug: "gather",
        pipelineId: "flood",
        lineOfBusiness: "FLOOD",
      },
      mixed,
    );
    const gloria = dealStageView(
      {
        title: "Gloria Martinez / HO3",
        pipelineStage: "gather",
        pipelineStageSlug: "gather",
        pipelineId: "pc",
        lineOfBusiness: "HO",
      },
      mixed,
    );
    expect(heather.pipelineSlug).toBe("p-c");
    expect(gloria.pipelineSlug).toBe("p-c");
    expect(heather.stages.map((stage) => stage.slug)).toEqual(gloria.stages.map((stage) => stage.slug));
    expect(heather.stages.map((stage) => stage.slug)).toEqual(pc.stages.map((stage) => stage.slug));
    expect(heather.name).toBe("Gathering");
  });
});

describe("lead → deal field copy", () => {
  it("copies phone, email, source, address, notes, and matching custom keys", () => {
    const lead = {
      firstName: "Javier",
      lastName: "Canales",
      email: "javier.canales@example.com",
      phone: "(321) 555-0144",
      mailingAddress: "18 Harbor Ct",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      source: "referral",
      notes: "Call after 5",
      preferredLanguage: "en",
    };
    const values = dealValuesFromLead(lead, CORE_FIELDS);
    expect(values.phone).toBe("(321) 555-0144");
    expect(values.email).toBe("javier.canales@example.com");
    expect(values.mailing_address).toBe("18 Harbor Ct");
    expect(values.city).toBe("Melbourne");
    expect(values.source).toBe("referral");
    expect(values.notes).toBe("Call after 5");
    expect(values.preferred_language).toBe("en");
    const copy = convertFieldCopy(lead, "HO", "FL");
    expect(copy.fieldValues.phone).toBe("(321) 555-0144");
    expect(copy.source).toBe("referral");
    expect(copy.risk.address1).toBe("18 Harbor Ct");
  });
});

describe("Notes field type", () => {
  it("labels the multi-line builder type Notes so it can be a pipeline column when on layout", () => {
    expect(CUSTOM_FIELD_TYPE_LABELS.multi_line).toBe("Notes");
    expect(CORE_FIELDS.some((field) => field.key === "notes" && field.type === "multi_line")).toBe(true);
    const withNotes: FieldLayout = {
      columns: [
        {
          id: "left",
          sections: [{ id: "notes", label: "Notes", fieldKeys: ["notes"] }],
        },
        { id: "right", sections: [] },
      ],
    };
    expect(dealsListColumnsFromFields(CORE_FIELDS, withNotes).some((column) => column.id === "notes")).toBe(
      true,
    );
    expect(
      dealsListColumnsFromFields(CORE_FIELDS, defaultLayoutForModule("deals")).some(
        (column) => column.id === "notes",
      ),
    ).toBe(false);
  });
});

describe("list Pipeline / subtype columns fall back to Details cascade", () => {
  it("fills empty picklist_5n3i from insurance_type and picklist from form", () => {
    const deal = {
      title: "Gloria Martinez / DP3",
      pipelineStage: "shopping",
      lineOfBusiness: "HO",
      quotingForm: "DP3",
      policySubType: "DP3",
    };
    const pipelineField = { key: "picklist_5n3i", label: "Pipeline", type: "picklist" as const };
    const subtypeField = { key: "picklist", label: "Insurance subtype", type: "picklist" as const };
    expect(dealFieldRawValue(pipelineField, deal, { insurance_type: "PC", picklist_5n3i: "" })).toBe("P&C");
    expect(dealFieldRawValue(subtypeField, deal, { insurance_subtype: "DP3", picklist: "" })).toBe("DP3");
    expect(dealFieldRawValue(pipelineField, deal, { picklist_5n3i: "Life" })).toBe("Life");
  });
});

