import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, or, sql } from "drizzle-orm";
import { TRIDENT_SLUG } from "@/lib/appetite/gate/fl-ho-order";
import { APPETITE_FL_SPECIALTY_CSV, parseAppetiteCsv } from "@/lib/appetite/gate/parse";
import { upsertAppetiteCarriers } from "@/lib/appetite/gate/store";
import { TRIDENT_HO_APPETITE } from "@/lib/appetite/published-appetite";
import {
  TENANT_ID,
  TRIDENT_CARRIER_ID,
  TRIDENT_CARRIER_NAME,
  TRIDENT_MAX_COV_A,
  TRIDENT_MIN_COV_A,
} from "../fixtures/ids";
import { db } from "./index";
import { appetiteRules, carrierAppetite, carriers } from "./schema";

const TRIDENT_APPETITE_NOTE = TRIDENT_HO_APPETITE.notesForAgent;
const TRIDENT_APPETITE_ROW_ID = "trident-ho3-min-cova-2026";

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
    portalLogin: TRIDENT_HO_APPETITE.placement,
    website: TRIDENT_HO_APPETITE.website,
    carrierInfo: "Trident Reciprocal Exchange. FL HO-3 through QuoteRUSH. NOW COVERING WIND DRIVEN RAIN.",
    territory: "Florida",
    preferredSubmission: "portal",
    bindingAuthority: "limited",
    appetiteNotes: TRIDENT_APPETITE_NOTE,
    appetiteRows: [
      {
        id: TRIDENT_APPETITE_ROW_ID,
        dateRequested: "2026-06-12",
        lob: TRIDENT_HO_APPETITE.line,
        roofAge: "Shingle 15 / Tile 20 / Metal 30; flat over living ineligible",
        waterHeater: "15 yrs & newer if inside living; no age if garage/outside",
        hvac: "HVAC maintenance contract discount",
        electrical: "No Challenger, Sylvania, Zinsco, or single-strand aluminum; multi-strand Al UW review",
        claimsHistory: "<=2 non-hurricane claims in last 5 years; each <=$5k",
        acceptDecline: "accept" as const,
        notes: TRIDENT_APPETITE_NOTE,
      },
    ],
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
    minCovA: TRIDENT_HO_APPETITE.minCovA ?? TRIDENT_MIN_COV_A,
    maxCovA: TRIDENT_HO_APPETITE.maxCovA ?? TRIDENT_MAX_COV_A,
    minYearBuilt: TRIDENT_HO_APPETITE.minYearBuilt,
    maxRoofAge: TRIDENT_HO_APPETITE.maxRoofAge,
    allowedRoofCoverings: TRIDENT_HO_APPETITE.allowedRoofCoverings,
    coastalAllowed: true,
    minMilesToCoast: TRIDENT_HO_APPETITE.minMilesToCoast,
    mobileAllowed: TRIDENT_HO_APPETITE.mobileAllowed,
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
