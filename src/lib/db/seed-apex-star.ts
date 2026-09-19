import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, or, sql } from "drizzle-orm";
import { APEX_STAR_SLUG } from "@/lib/appetite/gate/fl-ho-order";
import { APPETITE_FL_SPECIALTY_CSV, parseAppetiteCsv } from "@/lib/appetite/gate/parse";
import { upsertAppetiteCarriers } from "@/lib/appetite/gate/store";
import { APEX_STAR_CARRIER_INFO, APEX_STAR_HO_APPETITE } from "@/lib/appetite/published-appetite";
import {
  APEX_STAR_CARRIER_ID,
  APEX_STAR_CARRIER_NAME,
  APEX_STAR_NAIC,
  TENANT_ID,
} from "../fixtures/ids";
import { db } from "./index";
import { appetiteRules, carrierAppetite, carriers, type AppetiteNoteRow } from "./schema";

const APEX_STAR_APPETITE_NOTE = APEX_STAR_HO_APPETITE.notesForAgent;
const APEX_STAR_ROW_IDS = {
  ho3: "apex-star-ho3-contacts-2026-09",
  dp3: "apex-star-dp3-contacts-2026-09",
  comm: "apex-star-commercial-contacts-2026-09",
} as const;

function isApexStarName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase().includes("apex star");
}

function isAliasOnly(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n === "apex star" ||
    n === "apex star insurance" ||
    n === "apex star insurance exchange" ||
    n === "apex star reciprocal"
  );
}

function appetiteRows(): AppetiteNoteRow[] {
  return [
    {
      id: APEX_STAR_ROW_IDS.ho3,
      dateRequested: "2026-09-19",
      lob: "HO3",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes: APEX_STAR_APPETITE_NOTE,
    },
    {
      id: APEX_STAR_ROW_IDS.dp3,
      dateRequested: "2026-09-19",
      lob: "DP3",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes: "Apex Star DP-3 dwelling / landlord. Same contacts as HO-3. No UW mins on this contacts sheet.",
    },
    {
      id: APEX_STAR_ROW_IDS.comm,
      dateRequested: "2026-09-19",
      lob: "BOP",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes: "Apex Star commercial property. Same contacts as HO-3. No UW mins on this contacts sheet.",
    },
  ];
}

function mergeAppetiteRows(existing: unknown): AppetiteNoteRow[] {
  const ours = new Set<string>(Object.values(APEX_STAR_ROW_IDS));
  const kept = Array.isArray(existing)
    ? (existing as AppetiteNoteRow[]).filter((row) => row && !ours.has(String(row.id ?? "")))
    : [];
  return [...kept, ...appetiteRows()];
}

/** Upsert Apex Star Reciprocal Exchange. Safe if an Apex Star row already exists. */
export async function seedApexStarReciprocal() {
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
        or(eq(carriers.id, APEX_STAR_CARRIER_ID), sql`lower(${carriers.name}) like ${"%apex star%"}`),
      ),
    );

  const byName = existing.find((row) => isApexStarName(row.name));
  const byId = existing.find((row) => row.id === APEX_STAR_CARRIER_ID);
  const current = byName ?? byId;
  const id = current?.id ?? APEX_STAR_CARRIER_ID;
  const written = new Set(current?.writtenLines ?? []);
  written.add("HO");
  written.add("LANDLORD");
  written.add("BOP");

  const values = {
    name:
      current && current.name.trim() && isApexStarName(current.name) && !isAliasOnly(current.name)
        ? current.name
        : APEX_STAR_CARRIER_NAME,
    naic: APEX_STAR_NAIC,
    writtenLines: [...written],
    portalStatus: "open" as const,
    portalLogin: APEX_STAR_HO_APPETITE.placement,
    phone: APEX_STAR_HO_APPETITE.csPhone,
    email: APEX_STAR_HO_APPETITE.supportEmail,
    website: APEX_STAR_HO_APPETITE.website,
    mailingAddress: "6135 W. Sitka St., Tampa, FL 33634",
    customerServicePhone: APEX_STAR_HO_APPETITE.csPhone,
    carrierInfo: APEX_STAR_CARRIER_INFO,
    territory: "Florida",
    preferredSubmission: "portal",
    bindingAuthority: "limited",
    appetiteNotes: APEX_STAR_APPETITE_NOTE,
    appetiteRows: mergeAppetiteRows(current?.appetiteRows),
    fixtureTag: "apex-star-reciprocal-2026-09",
    active: true,
    updatedAt: new Date(),
  };

  if (current) {
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
    minCovA: APEX_STAR_HO_APPETITE.minCovA,
    maxCovA: APEX_STAR_HO_APPETITE.maxCovA,
    minYearBuilt: APEX_STAR_HO_APPETITE.minYearBuilt,
    maxRoofAge: APEX_STAR_HO_APPETITE.maxRoofAge,
    coastalAllowed: true,
    mobileAllowed: APEX_STAR_HO_APPETITE.mobileAllowed,
    notes: APEX_STAR_APPETITE_NOTE,
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
  const apex = catalog.find((row) => row.carrierId === APEX_STAR_SLUG);
  if (apex) {
    await upsertAppetiteCarriers([{ ...apex, linkedCarrierId: id }], TENANT_ID);
    await db
      .update(carrierAppetite)
      .set({ linkedCarrierId: id, updatedAt: new Date() })
      .where(and(eq(carrierAppetite.tenantId, TENANT_ID), eq(carrierAppetite.carrierId, APEX_STAR_SLUG)));
  }

  return { id };
}
