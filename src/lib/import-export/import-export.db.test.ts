import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { CONTACT_ID } from "@/lib/fixtures/ids";
import { db, sql } from "@/lib/db";
import { contacts, leads, policies } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { seed } from "@/lib/db/seed";
import { exportCsv } from "./export";
import { commitImport, previewImport } from "./import";
import { parseCsv } from "./csv";

const actor = { id: "44444444-4444-4444-8444-444444444401", name: "Javy Rivera", email: "javy@fitfirst.local" };

describe("import-export against seed", () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it("exports the six required packs and keeps Ana off the policy file", async () => {
    const contactsCsv = await exportCsv("contacts");
    const leadsCsv = await exportCsv("leads");
    const bizCsv = await exportCsv("businesses");
    const dealsCsv = await exportCsv("deals");
    const policiesCsv = await exportCsv("policies");
    const carriersCsv = await exportCsv("carriers");

    expect(contactsCsv).toContain("first_name,last_name,email");
    expect(contactsCsv).toContain("ana.dib@desk.local");
    expect(leadsCsv).toContain("Ana");
    expect(bizCsv).toContain("name,legal_name");
    expect(dealsCsv).toContain("title,pipeline_stage");
    expect(policiesCsv).toContain("policy_number");
    expect(policiesCsv).not.toContain("ana.dib@desk.local");
    expect(carriersCsv).toContain("agency_code");

    const contactRows = parseCsv(contactsCsv).rows;
    const ana = contactRows.find((row) => row.email === "ana.dib@desk.local");
    expect(ana?.first_name).toBe("Ana");
  });

  it("creates a lead on commit and never writes a Policy for Ana", async () => {
    const leadCsv = `first_name,last_name,email,source,status\nImport,Probe,import.probe@desk.local,csv,new\n`;
    const preview = await previewImport("leads", leadCsv);
    expect(preview.rows[0]?.action).toBe("create");
    const committed = await commitImport("leads", leadCsv, actor, "leads-probe.csv");
    expect(committed.rowsCreate).toBe(1);
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.email, "import.probe@desk.local")));
    expect(lead?.firstName).toBe("Import");

    const anaPolicy = `policy_number,line_of_business,effective_date,expiration_date,contact_email,status\nHO-DIB-IMPORT,HO,2026-01-01,2027-01-01,ana.dib@desk.local,active\n`;
    const blocked = await previewImport("policies", anaPolicy);
    expect(blocked.rows[0]?.action).toBe("error");
    const result = await commitImport("policies", anaPolicy, actor, "ana-policy.csv");
    expect(result.rowsCreate).toBe(0);
    const anaPolicies = await db.select().from(policies).where(eq(policies.contactId, CONTACT_ID));
    expect(anaPolicies).toHaveLength(0);

    const [ana] = await db.select().from(contacts).where(eq(contacts.id, CONTACT_ID));
    expect(ana?.email).toBe("ana.dib@desk.local");
    expect(ana?.policyCount).toBe(0);
  });
});
