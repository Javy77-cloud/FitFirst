import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, or, sql } from "drizzle-orm";
import {
  NATIONWIDE_SLUG,
  OLYMPUS_SLUG,
  STAND_SLUG,
  UNIVERSAL_PC_SLUG,
} from "@/lib/appetite/gate/fl-ho-order";
import {
  APPETITE_FL_SPECIALTY_CSV,
  APPETITE_NATIONALS_CSV,
  parseAppetiteCsv,
} from "@/lib/appetite/gate/parse";
import { upsertAppetiteCarriers } from "@/lib/appetite/gate/store";
import {
  NATIONWIDE_NOTES_FOR_AGENT,
  OLYMPUS_COUNTY_MIN_COV_A,
  OLYMPUS_DONT_WRITE,
  OLYMPUS_EXCLUDED_COUNTIES,
  OLYMPUS_HO_APPETITE,
  STAND_HO_APPETITE,
  UNIVERSAL_PC_HO_APPETITE,
} from "@/lib/appetite/published-appetite";
import {
  NATIONWIDE_CARRIER_ID,
  NATIONWIDE_CARRIER_NAME,
  OLYMPUS_CARRIER_ID,
  OLYMPUS_CARRIER_NAME,
  STAND_CARRIER_ID,
  STAND_CARRIER_NAME,
  TENANT_ID,
  UNIVERSAL_PC_CARRIER_ID,
  UNIVERSAL_PC_CARRIER_NAME,
} from "../fixtures/ids";
import { db } from "./index";
import { appetiteRules, carrierAppetite, carriers, type AppetiteNoteRow } from "./schema";

const STAND_ROW_IDS = { ho: "stand-fl-contacts-2026-09-16" } as const;
const UPC_ROW_IDS = {
  ho3: "upcic-ho3-binding-2026-05-26",
  ho8: "upcic-ho8-binding-2026-05-26",
  dp1: "upcic-dp1-binding-2026-05-26",
  dp23: "upcic-dp2-dp3-binding-2026-05-26",
  ho4: "upcic-ho4-binding-2026-05-26",
  ho6: "upcic-ho6-binding-2026-05-26",
} as const;
const NW_ROW_IDS = {
  boat: "nationwide-powersports-boat-2022-02",
  moto: "nationwide-powersports-moto-2022-02",
  rv: "nationwide-powersports-rv-2022-02",
} as const;
const OLY_ROW_IDS = {
  ho: "olympus-fl-ho-uw-2026-06-15",
  occupancy: "olympus-fl-ho-occupancy-2026-06-15",
  location: "olympus-fl-ho-location-2026-06-15",
  construction: "olympus-fl-ho-construction-2026-06-15",
  endorsements: "olympus-fl-ho-endorsements-2026-06-15",
} as const;

function mergeRows(existing: unknown, ours: AppetiteNoteRow[]): AppetiteNoteRow[] {
  const ids = new Set(ours.map((row) => row.id));
  const kept = Array.isArray(existing)
    ? (existing as AppetiteNoteRow[]).filter((row) => row && !ids.has(String(row.id ?? "")))
    : [];
  return [...kept, ...ours];
}

function addLines(existing: string[] | null | undefined, extra: string[]): string[] {
  const written = new Set(existing ?? []);
  for (const line of extra) written.add(line);
  return [...written];
}

function isStandName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase();
  return (
    n === "stand" ||
    n.startsWith("stand ") ||
    n.includes("stand insurance") ||
    n.includes("getstandfl") ||
    n.includes("stand florida")
  );
}

function isUniversalPcName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase();
  if (n.includes("north america") || n.includes("uicna")) return false;
  return n.includes("universal p&c") || n.includes("universal property");
}

function isNationwideName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase();
  return n === "nationwide" || n.startsWith("nationwide ");
}

function isOlympusName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase().includes("olympus");
}

async function linkCatalog(slug: string, carrierId: string, csvRel: string) {
  const catalog = parseAppetiteCsv(await readFile(path.resolve(process.cwd(), csvRel), "utf8"));
  const row = catalog.find((item) => item.carrierId === slug);
  if (!row) return;
  await upsertAppetiteCarriers([{ ...row, linkedCarrierId: carrierId }], TENANT_ID);
  await db
    .update(carrierAppetite)
    .set({ linkedCarrierId: carrierId, updatedAt: new Date() })
    .where(and(eq(carrierAppetite.tenantId, TENANT_ID), eq(carrierAppetite.carrierId, slug)));
}

async function upsertHoRule(
  carrierId: string,
  values: {
    minCovA: number | null;
    maxCovA: number | null;
    minYearBuilt: number | null;
    maxRoofAge: number | null;
    mobileAllowed: boolean;
    requireReplacementCost: boolean;
    countyMinCovA: Record<string, number> | null;
    excludedCounties?: string[] | null;
    rceFloorRatio?: number | null;
    notes: string;
  },
) {
  const [rule] = await db
    .select({ id: appetiteRules.id })
    .from(appetiteRules)
    .where(
      and(
        eq(appetiteRules.tenantId, TENANT_ID),
        eq(appetiteRules.carrierId, carrierId),
        eq(appetiteRules.lineOfBusiness, "HO"),
      ),
    )
    .limit(1);
  const patch = {
    minCovA: values.minCovA,
    maxCovA: values.maxCovA,
    minYearBuilt: values.minYearBuilt,
    maxRoofAge: values.maxRoofAge,
    coastalAllowed: true,
    mobileAllowed: values.mobileAllowed,
    requireReplacementCost: values.requireReplacementCost,
    countyMinCovA: values.countyMinCovA,
    excludedCounties: values.excludedCounties ?? null,
    rceFloorRatio: values.rceFloorRatio ?? null,
    notes: values.notes,
    updatedAt: new Date(),
  };
  if (rule) {
    await db.update(appetiteRules).set(patch).where(eq(appetiteRules.id, rule.id));
    return;
  }
  await db.insert(appetiteRules).values({
    tenantId: TENANT_ID,
    carrierId,
    lineOfBusiness: "HO",
    requiresOpeningProtection: false,
    ...patch,
  });
}

/** Javy 2026-09-16 bulletins: Stand (create if missing) + Universal P&C + Nationwide + Olympus. */
export async function seedJavyBulletins() {
  const standId = await seedStand();
  const upcId = await seedUniversalPc();
  const nwId = await seedNationwide();
  const olyId = await seedOlympus();
  return { standId, upcId, nwId, olyId };
}

async function seedStand() {
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
        or(eq(carriers.id, STAND_CARRIER_ID), sql`lower(${carriers.name}) like ${"%stand%"}`),
      ),
    );
  const byName = existing.find((row) => isStandName(row.name));
  const byId = existing.find((row) => row.id === STAND_CARRIER_ID);
  const current = byName ?? byId;
  const id = current?.id ?? STAND_CARRIER_ID;
  const rows: AppetiteNoteRow[] = [
    {
      id: STAND_ROW_IDS.ho,
      dateRequested: "2026-09-16",
      lob: "HO",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes: STAND_HO_APPETITE.notesForAgent,
    },
  ];
  const values = {
    name: current && isStandName(current.name) ? current.name : STAND_CARRIER_NAME,
    writtenLines: addLines(current?.writtenLines, ["HO"]),
    portalStatus: "open" as const,
    portalLogin: STAND_HO_APPETITE.placement,
    phone: STAND_HO_APPETITE.csPhone,
    email: STAND_HO_APPETITE.supportEmail,
    website: STAND_HO_APPETITE.website,
    mailingAddress: "PO Box 459000, Sunrise, FL 33345",
    customerServicePhone: STAND_HO_APPETITE.csPhone,
    underwriterEmail: "stand_uw@getstandfl.com",
    underwriterPhone: STAND_HO_APPETITE.csPhone,
    claimsContactName: "Next Era",
    claimsContactEmail: "Office@nexteraclaims.com",
    claimsPhone: "833-667-8263",
    marketingContactName: "Mike Killingsworth",
    marketingContactPhone: "863-370-8607",
    marketingContactEmail: "mike@standinsurance.com",
    accountManagerName: "Maggie Grignon",
    accountManagerPhone: "415-223-0694",
    accountManagerEmail: "maggieg@standinsurance.com",
    carrierInfo:
      "STAND Florida. Main 1-888-319-1332 (FNOL/UW/Service). Claims Next Era 833-667-8263 / Office@nexteraclaims.com. standinsurance.com / getstandfl.com.",
    territory: "Florida",
    preferredSubmission: "email",
    bindingAuthority: "limited",
    appetiteNotes: STAND_HO_APPETITE.notesForAgent,
    appetiteRows: mergeRows(current?.appetiteRows, rows),
    fixtureTag: "stand-fl-contacts-2026-09",
    active: true,
    updatedAt: new Date(),
  };
  if (current) {
    await db.update(carriers).set(values).where(eq(carriers.id, id));
  } else {
    await db.insert(carriers).values({ id, tenantId: TENANT_ID, dontWriteNotes: null, ...values });
  }
  await upsertHoRule(id, {
    minCovA: null,
    maxCovA: null,
    minYearBuilt: null,
    maxRoofAge: null,
    mobileAllowed: false,
    requireReplacementCost: false,
    countyMinCovA: null,
    notes: STAND_HO_APPETITE.notesForAgent,
  });
  await linkCatalog(STAND_SLUG, id, APPETITE_FL_SPECIALTY_CSV);
  return id;
}

async function seedUniversalPc() {
  const existing = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      writtenLines: carriers.writtenLines,
      appetiteRows: carriers.appetiteRows,
      website: carriers.website,
      portalLogin: carriers.portalLogin,
      customerServicePhone: carriers.customerServicePhone,
    })
    .from(carriers)
    .where(
      and(
        eq(carriers.tenantId, TENANT_ID),
        or(eq(carriers.id, UNIVERSAL_PC_CARRIER_ID), sql`lower(${carriers.name}) like ${"%universal%"}`),
      ),
    );
  const byName = existing.find((row) => isUniversalPcName(row.name));
  const byId = existing.find((row) => row.id === UNIVERSAL_PC_CARRIER_ID);
  const current = byName ?? byId;
  if (!current) return null;
  const id = current.id;
  const note = UNIVERSAL_PC_HO_APPETITE.notesForAgent;
  const rows: AppetiteNoteRow[] = [
    {
      id: UPC_ROW_IDS.ho3,
      dateRequested: "2026-05-26",
      lob: "HO3",
      roofAge: "Updates within 30 years; ACV roof and/or water limitation may apply over 20 years",
      waterHeater: "",
      hvac: "Updates within 30 years; operable A/C statewide; no portable space heaters",
      electrical: "100 amp min; no Al branch, cloth, knob-tube, double-tap, fuses, FPE/Zinsco/Sylvania-Zinsco/Challenger-Zinsco",
      claimsHistory: "No sinkhole ever. Except HO8: no dog bite/fire/theft last 36 months; 1 other loss ok; 1 remediated water last 36 ok",
      acceptDecline: "accept",
      notes:
        "HO3 05/26/2026. Tri-County 1950+ $250k-$1.0M X-Wind / $250k-$1.5M all-wind (1950-1975 water excl or Limited Water $10k). Other counties 1950+ $100k-$1.0M / $100k-$1.5M. 100% RCV.",
    },
    {
      id: UPC_ROW_IDS.ho8,
      dateRequested: "2026-05-26",
      lob: "HO8",
      roofAge: "Updates within 30 years",
      waterHeater: "",
      hvac: "Updates within 30 years",
      electrical: "100 amp min; same prohibited wiring/panels as HO3",
      claimsHistory: "HO8: 3 or fewer losses last 36 months; no fire last 36 months",
      acceptDecline: "accept",
      notes: "HO8 all counties built 1900+ $100k-$1.0M X-Wind / $100k-$1.5M all-wind. 100% ACV allowed when Optional RC not selected; over 100 years must be ACV.",
    },
    {
      id: UPC_ROW_IDS.dp1,
      dateRequested: "2026-05-26",
      lob: "DP1",
      roofAge: "Updates within 30 years",
      waterHeater: "",
      hvac: "Updates within 30 years",
      electrical: "100 amp min",
      claimsHistory: "No sinkhole ever",
      acceptDecline: "accept",
      notes: "DP1 05/26/2026. Panhandle 2002+ or Tri-County 1976+ or other counties 1900+: $100k-$500k X-Wind / $100k-$750k all-wind.",
    },
    {
      id: UPC_ROW_IDS.dp23,
      dateRequested: "2026-05-26",
      lob: "DP2/DP3",
      roofAge: "Updates within 30 years",
      waterHeater: "",
      hvac: "Updates within 30 years",
      electrical: "100 amp min",
      claimsHistory: "No sinkhole ever",
      acceptDecline: "accept",
      notes: "DP2/DP3 05/26/2026. Panhandle 2002+ or Tri-County 1976+ or other counties 1940+: $100k-$500k X-Wind / $100k-$750k all-wind.",
    },
    {
      id: UPC_ROW_IDS.ho4,
      dateRequested: "2026-05-26",
      lob: "HO4",
      roofAge: "Roof/HVAC restriction does not apply",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "No sinkhole ever",
      acceptDecline: "accept",
      notes: "HO4 Cov C $20k-$300k (Cov A N/A). Built 1900+. Co-op ownership acceptable on HO4 only.",
    },
    {
      id: UPC_ROW_IDS.ho6,
      dateRequested: "2026-05-26",
      lob: "HO6",
      roofAge: "4-point not required",
      waterHeater: "",
      hvac: "",
      electrical: "100 amp min",
      claimsHistory: "No sinkhole ever",
      acceptDecline: "accept",
      notes: "HO6 Cov A $15k-$1.0M (RCE required if A bound below $50k). Owner Cov C $20k-$500k; tenant Cov C $6k min and max.",
    },
  ];
  await db
    .update(carriers)
    .set({
      name: isUniversalPcName(current.name) ? current.name : UNIVERSAL_PC_CARRIER_NAME,
      writtenLines: addLines(current.writtenLines, ["HO"]),
      portalStatus: "open",
      portalLogin: current.portalLogin?.trim() || UNIVERSAL_PC_HO_APPETITE.placement,
      website: current.website?.trim() || UNIVERSAL_PC_HO_APPETITE.website,
      customerServicePhone: current.customerServicePhone?.trim() || UNIVERSAL_PC_HO_APPETITE.csPhone,
      territory: "Florida",
      preferredSubmission: "portal",
      appetiteNotes: note,
      appetiteRows: mergeRows(current.appetiteRows, rows),
      dontWriteNotes:
        "UPCIC 05/26/2026 ineligible: mobile/trailer, manufactured/modular, vacant/unoccupied, short-term rentals, EIFS, dome/unusual, over water, historic, Chinese drywall, sinkhole history.",
      fixtureTag: "upcic-binding-2026-05",
      active: true,
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, id));
  await upsertHoRule(id, {
    minCovA: UNIVERSAL_PC_HO_APPETITE.minCovA,
    maxCovA: UNIVERSAL_PC_HO_APPETITE.maxCovA,
    minYearBuilt: null,
    maxRoofAge: null,
    mobileAllowed: false,
    requireReplacementCost: true,
    countyMinCovA: { Broward: 250000, "Miami-Dade": 250000, "Palm Beach": 250000 },
    notes: note,
  });
  await linkCatalog(UNIVERSAL_PC_SLUG, id, APPETITE_FL_SPECIALTY_CSV);
  return id;
}

async function seedNationwide() {
  const existing = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      writtenLines: carriers.writtenLines,
      appetiteRows: carriers.appetiteRows,
      appetiteNotes: carriers.appetiteNotes,
      website: carriers.website,
      portalLogin: carriers.portalLogin,
      customerServicePhone: carriers.customerServicePhone,
    })
    .from(carriers)
    .where(
      and(
        eq(carriers.tenantId, TENANT_ID),
        or(eq(carriers.id, NATIONWIDE_CARRIER_ID), sql`lower(${carriers.name}) like ${"%nationwide%"}`),
      ),
    );
  const byName = existing.find((row) => isNationwideName(row.name));
  const byId = existing.find((row) => row.id === NATIONWIDE_CARRIER_ID);
  const current = byName ?? byId;
  if (!current) return null;
  const id = current.id;
  const rows: AppetiteNoteRow[] = [
    {
      id: NW_ROW_IDS.boat,
      dateRequested: "2022-02-01",
      lob: "BOAT",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes:
        "Boat: 35 ft / $200k / 20 years; 3 engines 500/1000/1050 hp; 60 mph; 9 vessels; no high-performance; trailers required. PWC eligible. Hurricane Haul-Out $1k. Service 1-877-877-7907. NPC-0577FL 02/22.",
    },
    {
      id: NW_ROW_IDS.moto,
      dateRequested: "2022-02-01",
      lob: "MCY",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes:
        "Motorcycle: max $80k; gas/electric; 9 vehicles; drivers 10+ off-road. Guest passenger; apparel $2k; custom $3k (comp optional $30k). ACV or agreed value. NPC-0577FL 02/22.",
    },
    {
      id: NW_ROW_IDS.rv,
      dateRequested: "2022-02-01",
      lob: "RV",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes:
        "RV: motorhomes $800k; travel trailers $500k; no length limit; full-timers ok; 9 vehicles. NPC-0577FL 02/22.",
    },
  ];
  await db
    .update(carriers)
    .set({
      name: isNationwideName(current.name) ? current.name : NATIONWIDE_CARRIER_NAME,
      writtenLines: addLines(current.writtenLines, ["RV", "BOAT"]),
      portalLogin: current.portalLogin?.trim() || "Nationwide Agency Portal",
      customerServicePhone: current.customerServicePhone?.trim() || "1-877-669-6877",
      appetiteNotes: NATIONWIDE_NOTES_FOR_AGENT,
      appetiteRows: mergeRows(current.appetiteRows, rows),
      fixtureTag: "nationwide-powersports-2022-02",
      active: true,
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, id));
  await linkCatalog(NATIONWIDE_SLUG, id, APPETITE_NATIONALS_CSV);
  return id;
}

async function seedOlympus() {
  const existing = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      writtenLines: carriers.writtenLines,
      appetiteRows: carriers.appetiteRows,
      website: carriers.website,
      portalLogin: carriers.portalLogin,
      customerServicePhone: carriers.customerServicePhone,
    })
    .from(carriers)
    .where(
      and(
        eq(carriers.tenantId, TENANT_ID),
        or(eq(carriers.id, OLYMPUS_CARRIER_ID), sql`lower(${carriers.name}) like ${"%olympus%"}`),
      ),
    );
  const byName = existing.find((row) => isOlympusName(row.name));
  const byId = existing.find((row) => row.id === OLYMPUS_CARRIER_ID);
  const current = byName ?? byId;
  const id = current?.id ?? OLYMPUS_CARRIER_ID;
  const note = OLYMPUS_HO_APPETITE.notesForAgent;
  const rows: AppetiteNoteRow[] = [
    {
      id: OLY_ROW_IDS.ho,
      dateRequested: "2026-06-15",
      lob: "HO3",
      roofAge: "Arch shingle 15 / tile 25 / standing-seam metal 40; 3-tab, membrane, foam, wood shake not online-bindable",
      waterHeater: "Traditional inside/attic 15; outside/garage 20; tankless 20",
      hvac: "No wood stove as sole heat; professionally installed supplemental wood-burning only",
      electrical: "200-amp if built before 1995; no knob-tube, aluminum, Zinsco, FPE, Challenger, Pushmatic, Bulldog, fuses",
      claimsHistory: "Refer: >1 loss in 3 years, >2 in 5 years, or any claim over $100,000",
      acceptDecline: "accept",
      notes: note,
    },
    {
      id: OLY_ROW_IDS.occupancy,
      dateRequested: "2026-06-15",
      lob: "HO3",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "Refer >1/3yr, >2/5yr, or any claim over $100k; pattern of frequency/severity/carelessness ineligible",
      acceptDecline: "decline",
      notes:
        "Ineligible occupancy: vacant/unoccupied, under construction/renovation, foreclosure/short-sale/as-is, home daycare/assisted living, >2 customer visits/week, commercial/retail farming, >2 roomers. Seasonal/secondary/rentals ok (premises-only liability + surcharge). Refer 2+ non-domestic-partner named insureds, trusts/LLCs, high-profile occupations, cancel/non-renew last 3 years, or lapse.",
    },
    {
      id: OLY_ROW_IDS.location,
      dateRequested: "2026-06-15",
      lob: "HO3",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "decline",
      notes:
        "Monroe with wind ineligible (ex-wind eligible). Flood Zones A/V ineligible unless separately flooded. Sinkhole density >30/sq mi ineligible; endorsement ineligible >3.54/sq mi; prior/current sinkhole not online-bindable. Wind within 1,000 ft of coast needs 5% hurricane deductible. Refer peak TIV, hydrant >1,000 ft, fire dept >5 miles, acreage >5. Over water, ferry/boat-only, or moratorium ineligible.",
    },
    {
      id: OLY_ROW_IDS.construction,
      dateRequested: "2026-06-15",
      lob: "HO3",
      roofAge: "Online bind: arch shingle 15 / tile 25 / standing-seam metal 40; 3-tab, membrane, foam, wood shake not online-bindable; flat refer",
      waterHeater: "Traditional inside/attic 15; outside/garage 20; tankless 20",
      hvac: "No wood stove as sole heat; underground fuel tanks ineligible",
      electrical: "200-amp if built before 1995; no knob-tube, aluminum, Zinsco, FPE, Challenger, Pushmatic, Bulldog, fuses",
      claimsHistory: "",
      acceptDecline: "decline",
      notes:
        "Manufactured/modular/mobile/trailer ineligible. EIFS pre-2000 ineligible. Log/unique/obsolete construction generally ineligible. Stilts/piers/pilings pre-1995 refer. 7,500 sq ft+ ineligible. PB pre-1995 ineligible (water excl + $10k limited-water buyback). Unsecured pools ineligible.",
    },
    {
      id: OLY_ROW_IDS.endorsements,
      dateRequested: "2026-06-15",
      lob: "HO3",
      roofAge: "",
      waterHeater: "",
      hvac: "",
      electrical: "",
      claimsHistory: "",
      acceptDecline: "accept",
      notes:
        "Water exclusion auto-attaches if home over 40 years or PB unless automatic shutoff. Pool liability needs 4-ft locked fence or screen; diving boards/slides ineligible. Animal liability not eligible with exotic or bite history. Payment: annual 100% before effective, or four-pay 25% at bind+14 days then months 2/5/8. Late pay 1 month past due. Reinstatement >30 days refer + Statement of No Known Losses.",
    },
  ];
  const values = {
    name: current && isOlympusName(current.name) ? current.name : OLYMPUS_CARRIER_NAME,
    writtenLines: addLines(current?.writtenLines, ["HO"]),
    portalStatus: "open" as const,
    portalLogin: current?.portalLogin?.trim() || OLYMPUS_HO_APPETITE.placement,
    website: current?.website?.trim() || OLYMPUS_HO_APPETITE.website,
    customerServicePhone: current?.customerServicePhone?.trim() || OLYMPUS_HO_APPETITE.csPhone,
    carrierInfo:
      "Olympus Insurance Company. FL HO Multi-peril UW Guidelines / QRG June 15, 2026 (paired Salesforce V0426).",
    territory: "Florida",
    preferredSubmission: "portal",
    bindingAuthority: "limited",
    appetiteNotes: note,
    appetiteRows: mergeRows(current?.appetiteRows, rows),
    dontWriteNotes: OLYMPUS_DONT_WRITE,
    fixtureTag: "olympus-ho-uw-2026-06",
    active: true,
    updatedAt: new Date(),
  };
  if (current) {
    await db.update(carriers).set(values).where(eq(carriers.id, id));
  } else {
    await db.insert(carriers).values({ id, tenantId: TENANT_ID, ...values });
  }
  await upsertHoRule(id, {
    minCovA: OLYMPUS_HO_APPETITE.minCovA,
    maxCovA: OLYMPUS_HO_APPETITE.maxCovA,
    minYearBuilt: null,
    maxRoofAge: OLYMPUS_HO_APPETITE.maxRoofAge,
    mobileAllowed: false,
    requireReplacementCost: true,
    countyMinCovA: OLYMPUS_COUNTY_MIN_COV_A,
    excludedCounties: [...OLYMPUS_EXCLUDED_COUNTIES],
    rceFloorRatio: 1,
    notes: note,
  });
  await linkCatalog(OLYMPUS_SLUG, id, APPETITE_FL_SPECIALTY_CSV);
  return id;
}

export const JAVY_BULLETIN_ROW_IDS = {
  stand: STAND_ROW_IDS,
  universalPc: UPC_ROW_IDS,
  nationwide: NW_ROW_IDS,
  olympus: OLY_ROW_IDS,
};
