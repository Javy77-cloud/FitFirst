import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, activities, carriers, contacts, deals, leads, policies, users } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { ADMIN_USER_ID, AGENT_USER_ID, CONTACT_ID } from "@/lib/fixtures/ids";
import { seed } from "@/lib/db/seed";
import { importZohoFolder } from "./import";
import { assignNullOwners } from "./owners";
import { wipeCrmDemo } from "./wipe";

const fixtureDir = path.join(process.cwd(), "fixtures", "zoho-import");

describe("wipe + Zoho JSONL import", () => {
  beforeAll(async () => {
    await seed();
  }, 120_000);

  it("keeps users and carriers, drops Ana, then imports the fixture dump", async () => {
    const usersBefore = await db.select().from(users).where(eq(users.tenantId, DEFAULT_TENANT_ID));
    const carriersBefore = await db.select().from(carriers).where(eq(carriers.tenantId, DEFAULT_TENANT_ID));
    expect(usersBefore.length).toBeGreaterThan(0);
    expect(carriersBefore.length).toBeGreaterThan(0);

    const wipe = await wipeCrmDemo();
    expect(wipe.kept.users).toBe(usersBefore.length);
    expect(wipe.kept.carriers).toBe(carriersBefore.length);

    const ana = await db.select().from(contacts).where(eq(contacts.id, CONTACT_ID));
    expect(ana).toHaveLength(0);
    const leftoverLeads = await db.select({ n: sql<number>`count(*)` }).from(leads);
    expect(Number(leftoverLeads[0]?.n ?? 1)).toBe(0);

    const report = await importZohoFolder(fixtureDir);
    expect(report.counts.find((row) => row.module === "Contacts")?.created).toBe(2);
    expect(report.counts.find((row) => row.module === "Accounts")?.created).toBe(1);
    expect(report.counts.find((row) => row.module === "Leads")?.created).toBe(1);
    expect(report.counts.find((row) => row.module === "Deals")?.created).toBe(2);
    expect(report.counts.find((row) => row.module === "Policies")?.created).toBe(2);
    expect(report.counts.find((row) => row.module === "Tasks")?.created).toBe(1);
    expect(report.unmatched.some((row) => row.module === "Contacts" && row.field === "Spouse")).toBe(true);
    expect(report.unmatched.some((row) => row.module === "Deals" && row.field === "Year_Built")).toBe(true);
    expect(report.owners.adminId).toBe(ADMIN_USER_ID);
    expect(report.owners.mapped).toBeGreaterThan(0);

    const mario = await db
      .select()
      .from(contacts)
      .where(eq(contacts.zohoId, "6742853000001000001"));
    expect(mario[0]?.email).toBe("mario.garcia@import.test");
    expect(mario[0]?.ownerId).toBe(AGENT_USER_ID);

    const virginia = await db
      .select()
      .from(contacts)
      .where(eq(contacts.zohoId, "6742853000001000002"));
    expect(virginia[0]?.ownerId).toBe(ADMIN_USER_ID);

    const rosa = await db.select().from(leads).where(eq(leads.zohoId, "6742853000003000001"));
    expect(rosa[0]?.ownerId).toBe(ADMIN_USER_ID);

    const gl = await db.select().from(policies).where(eq(policies.policyNumber, "CSG-00544929-00"));
    expect(gl[0]?.accountId).toBeTruthy();
    expect(gl[0]?.contactId).toBe(mario[0]?.id);

    const deal = await db.select().from(deals).where(eq(deals.zohoId, "6742853000004000002"));
    expect(deal[0]?.accountId).toBe(gl[0]?.accountId);
    expect(deal[0]?.ownerId).toBe(ADMIN_USER_ID);
    expect(gl[0]?.ownerId).toBe(ADMIN_USER_ID);

    const ho3 = await db.select().from(policies).where(eq(policies.policyNumber, "HO3-MARIO-2026"));
    expect(ho3[0]?.ownerId).toBe(AGENT_USER_ID);

    const javyDeal = await db.select().from(deals).where(eq(deals.zohoId, "6742853000004000001"));
    expect(javyDeal[0]?.ownerId).toBe(ADMIN_USER_ID);

    const biz = await db.select().from(accounts).where(eq(accounts.zohoId, "6742853000002000001"));
    expect(biz[0]?.name).toBe("Garcia Family Services");

    const task = await db.select().from(activities).where(eq(activities.zohoId, "6742853000007000001"));
    expect(task[0]?.kind).toBe("task");
    expect(task[0]?.contactId).toBe(mario[0]?.id);

    const usersAfter = await db.select().from(users).where(eq(users.tenantId, DEFAULT_TENANT_ID));
    expect(usersAfter.map((row) => row.email).sort()).toEqual(usersBefore.map((row) => row.email).sort());

    const coterie = await db.select().from(carriers).where(eq(carriers.zohoId, "6742853000005000002"));
    expect(coterie).toHaveLength(1);

    await db.update(contacts).set({ ownerId: null }).where(eq(contacts.zohoId, "6742853000001000002"));
    const assigned = await assignNullOwners();
    expect(assigned.adminId).toBe(ADMIN_USER_ID);
    expect(assigned.tables.find((row) => row.table === "contacts")?.ownerUpdated).toBeGreaterThan(0);
    const virginiaAfter = await db
      .select()
      .from(contacts)
      .where(eq(contacts.zohoId, "6742853000001000002"));
    const marioAfter = await db
      .select()
      .from(contacts)
      .where(eq(contacts.zohoId, "6742853000001000001"));
    expect(virginiaAfter[0]?.ownerId).toBe(ADMIN_USER_ID);
    expect(marioAfter[0]?.ownerId).toBe(AGENT_USER_ID);
  }, 120_000);
});
