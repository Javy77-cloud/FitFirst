import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { CUSTOM_FIELD_TYPE_LABELS } from "@/lib/custom-fields/types";
import { convertFieldCopy } from "@/lib/crm/convert";
import { dealValuesFromLead } from "@/lib/custom-fields/transfer";
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
    stages: pc.stages.map((stage) => ({ slug: stage.slug, name: stage.name })),
  },
];

describe("pipeline table deal-field columns", () => {
  it("builds the Columns picker from deal fields and drops E-sign / Comms", () => {
    const extra = { key: "roof_year", label: "Roof year", type: "number" as const };
    const cols = dealsColumnsFromFields([...CORE_FIELDS, extra]);
    const keys = cols.map((column) => column.key);
    expect(keys[0]).toBe("title");
    expect(keys[1]).toBe("stage");
    expect(keys).toContain("phone");
    expect(keys).toContain("notes");
    expect(keys).toContain("roof_year");
    expect(keys).not.toContain("esign");
    expect(keys).not.toContain("comms");
    expect(keys).not.toContain("contact");
    expect(DEAD_DEAL_COLUMN_IDS).toEqual(["esign", "comms", "contact"]);
    const withoutRoof = dealsColumnsFromFields(CORE_FIELDS).map((column) => column.key);
    expect(withoutRoof).not.toContain("roof_year");
    expect(dealsListColumnsFromFields(CORE_FIELDS).find((column) => column.id === "phone")?.label).toBe("Phone");
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
    expect(table).toMatch(/dealsListColumnsFromFields\(fields\)/);
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
    expect(quoting.name).toBe("Meet / Quotes");
    expect(quoting.slug).toBe("quotes");
    expect(quoting.stages.map((stage) => stage.slug)).toEqual(pc.stages.map((stage) => stage.slug));
    expect(quoting.name).not.toBe("Quoting");
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/DealStageSelect/);
    expect(source("src/components/deals/deal-stage-select.tsx")).toMatch(/moveDealToStage/);
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
  it("labels the multi-line builder type Notes so it can be a pipeline column", () => {
    expect(CUSTOM_FIELD_TYPE_LABELS.multi_line).toBe("Notes");
    expect(CORE_FIELDS.some((field) => field.key === "notes" && field.type === "multi_line")).toBe(true);
    expect(dealsListColumnsFromFields(CORE_FIELDS).some((column) => column.id === "notes")).toBe(true);
  });
});
