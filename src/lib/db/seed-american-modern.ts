import { and, eq, or, sql } from "drizzle-orm";
import {
  AMERICAN_MODERN_CARRIER_INFO,
  AMERICAN_MODERN_DONT_WRITE,
  AMERICAN_MODERN_HO_APPETITE,
  AMERICAN_MODERN_TERRITORY,
} from "@/lib/appetite/published-appetite";
import {
  AMERICAN_MODERN_CARRIER_ID,
  AMERICAN_MODERN_CARRIER_NAME,
  TENANT_ID,
} from "../fixtures/ids";
import { db } from "./index";
import { appetiteRules, carriers, type AppetiteNoteRow } from "./schema";

const AMERICAN_MODERN_APPETITE_NOTE = AMERICAN_MODERN_HO_APPETITE.notesForAgent;
const AMERICAN_MODERN_ROW_IDS = {
  mho: "american-modern-mho-2026-09",
  dp1: "american-modern-dp1-2026-09",
  dp3: "american-modern-dp3-2026-09",
} as const;

function isAmericanModernName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase().includes("american modern");
}

function isAliasOnly(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n === "american modern" ||
    n === "american modern insurance" ||
    n === "american modern insurance group" ||
    n === "american modern insurance company"
  );
}

function appetiteRows(): AppetiteNoteRow[] {
  return [
    {
      id: AMERICAN_MODERN_ROW_IDS.mho,
      dateRequested: "2026-09-22",
      lob: "MHO",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes:
        "American Modern manufactured and mobile homes (FitFirst form MHO). All 50 states, no age cap. No UW mins sheet yet.",
    },
    {
      id: AMERICAN_MODERN_ROW_IDS.dp1,
      dateRequested: "2026-09-22",
      lob: "DP1",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes: "American Modern DP1 dwelling. Seasonal, vacant, and rental risks. No UW mins sheet yet.",
    },
    {
      id: AMERICAN_MODERN_ROW_IDS.dp3,
      dateRequested: "2026-09-22",
      lob: "DP3",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes: "American Modern DP3 landlord / dwelling. No UW mins sheet yet.",
    },
  ];
}

function mergeAppetiteRows(existing: unknown): AppetiteNoteRow[] {
  const ours = new Set<string>(Object.values(AMERICAN_MODERN_ROW_IDS));
  const kept = Array.isArray(existing)
    ? (existing as AppetiteNoteRow[]).filter((row) => row && !ours.has(String(row.id ?? "")))
    : [];
  return [...kept, ...appetiteRows()];
}

/** Upsert American Modern. Safe if a row with that name already exists. */
export async function seedAmericanModern() {
  const existing = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      writtenLines: carriers.writtenLines,
      appetiteRows: carriers.appetiteRows,
    })
    .from(carriers)
    .where(
      and(
        eq(carriers.tenantId, TENANT_ID),
        or(
          eq(carriers.id, AMERICAN_MODERN_CARRIER_ID),
          sql`lower(${carriers.name}) like ${"%american modern%"}`,
        ),
      ),
    );

  const byName = existing.find((row) => isAmericanModernName(row.name));
  const byId = existing.find((row) => row.id === AMERICAN_MODERN_CARRIER_ID);
  const current = byName ?? byId;
  const id = current?.id ?? AMERICAN_MODERN_CARRIER_ID;
  const written = new Set(current?.writtenLines ?? []);
  written.add("HO");

  const values = {
    name:
      current && current.name.trim() && isAmericanModernName(current.name) && !isAliasOnly(current.name)
        ? current.name
        : AMERICAN_MODERN_CARRIER_NAME,
    writtenLines: [...written],
    portalStatus: "open" as const,
    website: AMERICAN_MODERN_HO_APPETITE.website,
    carrierInfo: AMERICAN_MODERN_CARRIER_INFO,
    territory: AMERICAN_MODERN_TERRITORY,
    dontWriteNotes: AMERICAN_MODERN_DONT_WRITE,
    appetiteNotes: AMERICAN_MODERN_APPETITE_NOTE,
    appetiteRows: mergeAppetiteRows(current?.appetiteRows),
    fixtureTag: "american-modern-2026-09",
    active: true,
    updatedAt: new Date(),
  };

  if (current) {
    await db.update(carriers).set(values).where(eq(carriers.id, id));
  } else {
    await db.insert(carriers).values({
      id,
      tenantId: TENANT_ID,
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
    minCovA: AMERICAN_MODERN_HO_APPETITE.minCovA,
    maxCovA: AMERICAN_MODERN_HO_APPETITE.maxCovA,
    minYearBuilt: AMERICAN_MODERN_HO_APPETITE.minYearBuilt,
    maxRoofAge: AMERICAN_MODERN_HO_APPETITE.maxRoofAge,
    allowedRoofCoverings: AMERICAN_MODERN_HO_APPETITE.allowedRoofCoverings,
    minMilesToCoast: AMERICAN_MODERN_HO_APPETITE.minMilesToCoast,
    coastalAllowed: true,
    mobileAllowed: AMERICAN_MODERN_HO_APPETITE.mobileAllowed,
    notes: AMERICAN_MODERN_APPETITE_NOTE,
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

  return { id };
}
