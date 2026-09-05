import { describe, expect, it } from "vitest";
import { CONTACT_ID, DEAL_ID } from "@/lib/fixtures/ids";
import { previewFromCsv } from "./import";
import type { ImportLookups } from "./lookups";

function lookups(partial: Partial<ImportLookups>): ImportLookups {
  return {
    contacts: [],
    leads: [],
    accounts: [],
    deals: [],
    policies: [],
    carriers: [],
    users: [],
    pipelines: [],
    ...partial,
  } as ImportLookups;
}

describe("import preview matching", () => {
  const seed = lookups({
    contacts: [
      { id: CONTACT_ID, firstName: "Ana", lastName: "Dib", email: "ana.dib@desk.local" },
      { id: "44444444-4444-4444-8444-444444444444", firstName: "Elena", lastName: "Ruiz", email: "elena.ruiz@desk.local" },
    ] as ImportLookups["contacts"],
    accounts: [{ id: "acct-1", name: "Harbor Key Marine", email: "harbor@desk.local" }] as ImportLookups["accounts"],
    deals: [{ id: DEAL_ID, title: "Ana Dib HO3", contactId: CONTACT_ID, pipelineStage: "quote_sent" }] as ImportLookups["deals"],
    policies: [
      {
        id: "pol-1",
        policyNumber: "HO3-ELENA-2026",
        contactId: "44444444-4444-4444-8444-444444444444",
        dealId: null,
      },
    ] as ImportLookups["policies"],
    carriers: [{ id: "car-1", name: "Tailrow", agencyCode: "TAIL", naic: "12345" }] as ImportLookups["carriers"],
  });

  it("updates a contact by email and creates an unknown email", () => {
    const csv = `first_name,last_name,email\nElena,Ruiz,elena.ruiz@desk.local\nMaya,Chen,maya.import@desk.local\n`;
    const preview = previewFromCsv("contacts", csv, seed);
    expect(preview.rows[0]?.action).toBe("update");
    expect(preview.rows[1]?.action).toBe("create");
  });

  it("never creates or updates a Policy for Ana", () => {
    const csv = `policy_number,line_of_business,effective_date,expiration_date,contact_email\nHO-DIB-FAKE,HO,2026-01-01,2027-01-01,ana.dib@desk.local\n`;
    const preview = previewFromCsv("policies", csv, seed);
    expect(preview.rows[0]?.action).toBe("error");
    expect(preview.rows[0]?.message).toContain("Ana Dib");
  });

  it("skips overwriting Ana the contact", () => {
    const csv = `first_name,last_name,email,city\nAna,Dib,ana.dib@desk.local,Miami\n`;
    const preview = previewFromCsv("contacts", csv, seed);
    expect(preview.rows[0]?.action).toBe("skip");
  });

  it("matches businesses by email and policies by number", () => {
    const biz = previewFromCsv("businesses", `name,email\nHarbor Key Marine,harbor@desk.local\n`, seed);
    expect(biz.rows[0]?.action).toBe("update");
    const pol = previewFromCsv(
      "policies",
      `policy_number,status,contact_email\nHO3-ELENA-2026,active,elena.ruiz@desk.local\n`,
      seed,
    );
    expect(pol.rows[0]?.action).toBe("update");
  });

  it("matches carriers by agency code", () => {
    const preview = previewFromCsv("carriers", `name,agency_code\nTailrow Specialty,TAIL\n`, seed);
    expect(preview.rows[0]?.action).toBe("update");
  });

  it("refuses a closed-won import on Ana's deal", () => {
    const csv = `id,title,pipeline_stage,contact_email\n${DEAL_ID},Ana Dib HO3,closed_won,ana.dib@desk.local\n`;
    const preview = previewFromCsv("deals", csv, seed);
    expect(preview.rows[0]?.action).toBe("error");
  });

  it("marks documents and quotes as coming / skip", () => {
    const docs = previewFromCsv("documents", `filename\ndec.pdf\n`, seed);
    expect(docs.rows[0]?.action).toBe("skip");
    const quotes = previewFromCsv("quotes", `quote_number\nQ-1\n`, seed);
    expect(quotes.rows[0]?.action).toBe("skip");
  });

  it("requires pipeline_id or slug before a stage row", () => {
    const missing = previewFromCsv("pipelines", `stage_slug,stage_name\nquoting,Quoting\n`, seed);
    expect(missing.rows[0]?.action).toBe("error");
    expect(missing.rows[0]?.message).toContain("pipeline");
  });
});
