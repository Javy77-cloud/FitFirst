import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, or, sql } from "drizzle-orm";
import { SOUTHERN_OAK_SLUG } from "@/lib/appetite/gate/fl-ho-order";
import { APPETITE_FL_SPECIALTY_CSV, parseAppetiteCsv } from "@/lib/appetite/gate/parse";
import { upsertAppetiteCarriers } from "@/lib/appetite/gate/store";
import { SOUTHERN_OAK_HO_APPETITE } from "@/lib/appetite/published-appetite";
import {
  SOUTHERN_OAK_CARRIER_ID,
  SOUTHERN_OAK_CARRIER_NAME,
  SOUTHERN_OAK_MAX_TIV,
  SOUTHERN_OAK_MIN_YEAR_BUILT,
  TENANT_ID,
} from "../fixtures/ids";
import { db } from "./index";
import { appetiteRules, carrierAppetite, carriers, type AppetiteNoteRow } from "./schema";

const NOTE = SOUTHERN_OAK_HO_APPETITE.notesForAgent;
const ROW_IDS = {
  ho: "southern-oak-ho3-ho6-premier-2026",
  dp3: "southern-oak-dp3-2026",
  ho4: "southern-oak-ho4-2019",
  wind: "southern-oak-wind-2022",
} as const;

function isSouthernOakName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase().includes("southern oak");
}

function appetiteRows(): AppetiteNoteRow[] {
  return [
    {
      id: ROW_IDS.ho,
      dateRequested: "2026-09-16",
      lob: "HO3/HO6",
      roofAge: "15yr+ UW review with 5+ years useful life; wood/asbestos/elastomeric/Tesla-solar ineligible",
      waterHeater: "15 years max",
      hvac: "Permanently installed primary heat/cool",
      electrical: "150A min; no FPE, Zinsco/Sylvania, Challenger, Stab-Lok, fuses, knob-tube, aluminum, cloth",
      claimsHistory: "One prior loss in last 5 years (ex-Act of God); no liability; open claims ineligible",
      acceptDecline: "accept",
      notes: NOTE,
    },
    {
      id: ROW_IDS.dp3,
      dateRequested: "2026-09-16",
      lob: "DP3",
      roofAge: "15yr+ UW review with 5+ years useful life; wood/asbestos/elastomeric/Tesla-solar ineligible",
      waterHeater: "15 years max",
      hvac: "Permanently installed primary heat/cool",
      electrical: "150A min; no FPE, Zinsco/Sylvania, Challenger, Stab-Lok, fuses, knob-tube, aluminum, cloth",
      claimsHistory: "Two or more non-Act of God losses in last 3 years ineligible; no liability losses",
      acceptDecline: "accept",
      notes: "DP-3 Coverage A bind up to $1 million (bulletin 2026-09-16; QRG 02-2026 $70k-$1M, over $1M prior UW).",
    },
    {
      id: ROW_IDS.ho4,
      dateRequested: "2019-03-26",
      lob: "HO4",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes: "HO-4 Golden Leaf QRG 08-2018 / 2019-0326. Renters Cov C $10k-$150k. PC10 ineligible.",
    },
    {
      id: ROW_IDS.wind,
      dateRequested: "2022-07-01",
      lob: "WIND_ONLY",
      roofAge: "HW-2: 15yr+ needs Preferred Roof Cert + UW review before submit",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "Prior losses: all damage repaired; UW may require proof",
      acceptDecline: "accept",
      notes: "Wind-Only QRG 07-2022. HW-2 Cov A $25k-$1M. Wind-pool eligible area. Flood endorsement available.",
    },
  ];
}

function mergeAppetiteRows(existing: unknown): AppetiteNoteRow[] {
  const ours = new Set<string>(Object.values(ROW_IDS));
  const kept = Array.isArray(existing)
    ? (existing as AppetiteNoteRow[]).filter((row) => row && !ours.has(String(row.id ?? "")))
    : [];
  return [...kept, ...appetiteRows()];
}

/** Upsert Southern Oak Premier HO/DP appetite. Reuses the live Neon desk row. */
export async function seedSouthernOak() {
  const existing = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      writtenLines: carriers.writtenLines,
      website: carriers.website,
      agentPortalUrl: carriers.agentPortalUrl,
      portalLogin: carriers.portalLogin,
      customerServicePhone: carriers.customerServicePhone,
      claimsPhone: carriers.claimsPhone,
      appetiteRows: carriers.appetiteRows,
    })
    .from(carriers)
    .where(
      and(
        eq(carriers.tenantId, TENANT_ID),
        or(eq(carriers.id, SOUTHERN_OAK_CARRIER_ID), sql`lower(${carriers.name}) like ${"%southern oak%"}`),
      ),
    );

  const byName = existing.find((row) => isSouthernOakName(row.name));
  const byId = existing.find((row) => row.id === SOUTHERN_OAK_CARRIER_ID);
  const current = byName ?? byId;
  const id = current?.id ?? SOUTHERN_OAK_CARRIER_ID;
  const written = new Set(current?.writtenLines ?? ["HO", "RENTERS LANDLORD", "FLOOD"]);
  written.add("HO");

  const values = {
    name: current && isSouthernOakName(current.name) ? current.name : SOUTHERN_OAK_CARRIER_NAME,
    writtenLines: [...written],
    portalStatus: "open" as const,
    portalLogin: current?.portalLogin?.trim() || SOUTHERN_OAK_HO_APPETITE.placement,
    website: current?.website?.trim() || SOUTHERN_OAK_HO_APPETITE.website,
    agentPortalUrl: current?.agentPortalUrl?.trim() || SOUTHERN_OAK_HO_APPETITE.agentPortalUrl || null,
    customerServicePhone: current?.customerServicePhone?.trim() || SOUTHERN_OAK_HO_APPETITE.csPhone,
    claimsPhone: current?.claimsPhone?.trim() || "1-877-900-2280",
    carrierInfo: "Southern Oak Insurance. FL/SC/GA HO/DP. Premier rates 7/15/2026. Agent portal southernoak.com / soi.policyport.com.",
    territory: "Florida / South Carolina / Georgia",
    preferredSubmission: "portal",
    bindingAuthority: "limited",
    appetiteNotes: NOTE,
    appetiteRows: mergeAppetiteRows(current?.appetiteRows),
    fixtureTag: "southern-oak-qrg-2026-09",
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
    minCovA: SOUTHERN_OAK_HO_APPETITE.minCovA,
    maxCovA: SOUTHERN_OAK_HO_APPETITE.maxCovA ?? SOUTHERN_OAK_MAX_TIV,
    minYearBuilt: SOUTHERN_OAK_HO_APPETITE.minYearBuilt ?? SOUTHERN_OAK_MIN_YEAR_BUILT,
    maxRoofAge: SOUTHERN_OAK_HO_APPETITE.maxRoofAge,
    coastalAllowed: true,
    mobileAllowed: SOUTHERN_OAK_HO_APPETITE.mobileAllowed,
    notes: NOTE,
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
  const oak = catalog.find((row) => row.carrierId === SOUTHERN_OAK_SLUG);
  if (oak) {
    await upsertAppetiteCarriers([{ ...oak, linkedCarrierId: id }], TENANT_ID);
    await db
      .update(carrierAppetite)
      .set({ linkedCarrierId: id, updatedAt: new Date() })
      .where(and(eq(carrierAppetite.tenantId, TENANT_ID), eq(carrierAppetite.carrierId, SOUTHERN_OAK_SLUG)));
  }

  return { id };
}
