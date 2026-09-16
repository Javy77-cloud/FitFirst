import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, or, sql } from "drizzle-orm";
import { TRIDENT_SLUG } from "@/lib/appetite/gate/fl-ho-order";
import { APPETITE_FL_SPECIALTY_CSV, parseAppetiteCsv } from "@/lib/appetite/gate/parse";
import { upsertAppetiteCarriers } from "@/lib/appetite/gate/store";
import { TENANT_ID, TRIDENT_CARRIER_ID, TRIDENT_CARRIER_NAME, TRIDENT_MIN_COV_A } from "../fixtures/ids";
import { db } from "./index";
import { appetiteRules, carrierAppetite, carriers } from "./schema";

const TRIDENT_APPETITE_NOTE =
  "FL HO-3 via QuoteRUSH. Minimum Coverage A $300,000 (was $400k).";

function isTridentName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase();
  return n.includes("trident reciprocal") || n === "trident";
}

/** Upsert Trident Reciprocal Exchange + HO min Cov A. Safe if a Trident row already exists. */
export async function seedTridentReciprocal() {
  const existing = await db
    .select({ id: carriers.id, name: carriers.name, writtenLines: carriers.writtenLines })
    .from(carriers)
    .where(
      and(
        eq(carriers.tenantId, TENANT_ID),
        or(eq(carriers.id, TRIDENT_CARRIER_ID), sql`lower(${carriers.name}) like ${"%trident%"}`),
      ),
    );

  const byName = existing.find((row) => isTridentName(row.name));
  const byId = existing.find((row) => row.id === TRIDENT_CARRIER_ID);
  const id = byName?.id ?? byId?.id ?? TRIDENT_CARRIER_ID;
  const written = new Set(byName?.writtenLines ?? byId?.writtenLines ?? []);
  written.add("HO");

  const values = {
    name: byName && byName.name.trim() && !isAliasOnly(byName.name) ? byName.name : TRIDENT_CARRIER_NAME,
    writtenLines: [...written],
    portalStatus: "open" as const,
    portalLogin: "QuoteRUSH",
    website: "https://www.tridentreciprocal.com",
    carrierInfo: "Trident Reciprocal Exchange. FL HO-3 through QuoteRUSH.",
    territory: "Florida",
    preferredSubmission: "portal",
    bindingAuthority: "limited",
    appetiteNotes: TRIDENT_APPETITE_NOTE,
    fixtureTag: "trident-ho3-2026-09",
    active: true,
    updatedAt: new Date(),
  };

  if (byName || byId) {
    await db.update(carriers).set(values).where(eq(carriers.id, id));
  } else {
    await db.insert(carriers).values({
      id,
      tenantId: TENANT_ID,
      dontWriteNotes: null,
      ...values,
    });
  }

  const [rule] = await db
    .select({ id: appetiteRules.id })
    .from(appetiteRules)
    .where(
      and(
        eq(appetiteRules.tenantId, TENANT_ID),
        eq(appetiteRules.carrierId, id),
        eq(appetiteRules.lineOfBusiness, "HO"),
      ),
    )
    .limit(1);

  const ruleValues = {
    minCovA: TRIDENT_MIN_COV_A,
    notes: TRIDENT_APPETITE_NOTE,
    updatedAt: new Date(),
  };
  if (rule) {
    await db.update(appetiteRules).set(ruleValues).where(eq(appetiteRules.id, rule.id));
  } else {
    await db.insert(appetiteRules).values({
      tenantId: TENANT_ID,
      carrierId: id,
      lineOfBusiness: "HO",
      coastalAllowed: true,
      mobileAllowed: false,
      requiresOpeningProtection: false,
      requireReplacementCost: false,
      ...ruleValues,
    });
  }

  const csvPath = path.resolve(process.cwd(), APPETITE_FL_SPECIALTY_CSV);
  const catalog = parseAppetiteCsv(await readFile(csvPath, "utf8"));
  const trident = catalog.find((row) => row.carrierId === TRIDENT_SLUG);
  if (trident) {
    await upsertAppetiteCarriers([{ ...trident, linkedCarrierId: id }], TENANT_ID);
    await db
      .update(carrierAppetite)
      .set({ linkedCarrierId: id, updatedAt: new Date() })
      .where(and(eq(carrierAppetite.tenantId, TENANT_ID), eq(carrierAppetite.carrierId, TRIDENT_SLUG)));
  }

  return { id };
}

function isAliasOnly(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "trident" || n === "trident reciprocal";
}
