import { and, asc, eq } from "drizzle-orm";
import { db, sql } from "@/lib/db";
import { quoteSheets, risks, type QuoteSheetFieldValue, type Risk } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  addressFromRiskRow,
  addressHasLocation,
  dealLevelPropertyAddress,
  instanceOwnsSheet,
  isPropertyCoveringProduct,
  legacyPropertyOwnerKey,
  resolveProductPropertyAddress,
  sheetAddressCells,
  sheetAddressNeedsPrefill,
  type PropertyAddress,
} from "@/lib/deals/product-property";
import {
  resolveVisibleProductInstances,
  storageLineForInstance,
  type ProductInstance,
} from "@/lib/deals/product-instances";

let productKeyColumn: boolean | null = null;

export function missingProductKeyColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /product_key/i.test(message) && /does not exist|42703/i.test(message);
}

export async function risksProductKeyColumnExists(): Promise<boolean> {
  if (productKeyColumn != null) return productKeyColumn;
  try {
    const rows = await sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'risks'
          and column_name = 'product_key'
      ) as exists
    `;
    productKeyColumn = Boolean(rows[0]?.exists);
  } catch {
    productKeyColumn = false;
  }
  return productKeyColumn;
}

function mapRawRisk(row: Record<string, unknown>): Risk {
  const text = (key: string) => {
    const value = row[key];
    return value == null ? null : String(value);
  };
  const num = (key: string) => {
    const value = row[key];
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    id: String(row.id),
    tenantId: String(row.tenantId ?? row.tenant_id),
    dealId: String(row.dealId ?? row.deal_id),
    contactId: text("contactId") ?? text("contact_id"),
    riskType: String(row.riskType ?? row.risk_type ?? "property"),
    address1: text("address1"),
    city: text("city"),
    county: text("county"),
    state: text("state"),
    zip: text("zip"),
    yearBuilt: num("yearBuilt") ?? num("year_built"),
    construction: text("construction"),
    occupancy: text("occupancy"),
    stories: num("stories"),
    squareFeet: num("squareFeet") ?? num("square_feet"),
    coverageA: num("coverageA") ?? num("coverage_a"),
    roofYear: num("roofYear") ?? num("roof_year"),
    roofCovering: text("roofCovering") ?? text("roof_covering"),
    openingProtection: text("openingProtection") ?? text("opening_protection"),
    pool: row.pool == null ? null : Boolean(row.pool),
    protectionClass: text("protectionClass") ?? text("protection_class"),
    milesToCoast: num("milesToCoast") ?? num("miles_to_coast"),
    mobileHome: Boolean(row.mobileHome ?? row.mobile_home),
    replacementCostEstimate: num("replacementCostEstimate") ?? num("replacement_cost_estimate"),
    vin: text("vin"),
    vehicleYear: num("vehicleYear") ?? num("vehicle_year"),
    vehicleMake: text("vehicleMake") ?? text("vehicle_make"),
    vehicleModel: text("vehicleModel") ?? text("vehicle_model"),
    vehicleUsage: text("vehicleUsage") ?? text("vehicle_usage"),
    garagingZip: text("garagingZip") ?? text("garaging_zip"),
    productKey: text("productKey") ?? text("product_key"),
    createdAt: new Date(String(row.createdAt ?? row.created_at ?? Date.now())),
    updatedAt: new Date(String(row.updatedAt ?? row.updated_at ?? Date.now())),
  };
}

/** Oldest first so the original unscoped row stays first when product_key is null. */
export async function listDealRisks(dealId: string, tenantId = DEFAULT_TENANT_ID): Promise<Risk[]> {
  const hasColumn = await risksProductKeyColumnExists();
  if (!hasColumn) {
    const rows = await sql<Record<string, unknown>[]>`
      select *
      from risks
      where tenant_id = ${tenantId}
        and deal_id = ${dealId}
      order by created_at asc
    `;
    return rows.map((row) => mapRawRisk({ ...row, productKey: null }));
  }
  try {
    return await db
      .select()
      .from(risks)
      .where(and(eq(risks.tenantId, tenantId), eq(risks.dealId, dealId)))
      .orderBy(asc(risks.createdAt));
  } catch (error) {
    if (!missingProductKeyColumn(error)) throw error;
    productKeyColumn = false;
    return listDealRisks(dealId, tenantId);
  }
}

export function riskForInstance(
  rows: readonly Risk[],
  instanceKey: string,
  legacyOwnerKey: string | null,
): Risk | null {
  const keyed = rows.find((row) => (row.productKey ?? "").trim() === instanceKey);
  if (keyed) return keyed;
  if (legacyOwnerKey && instanceKey === legacyOwnerKey) {
    return rows.find((row) => !String(row.productKey ?? "").trim()) ?? null;
  }
  return null;
}

async function insertProductRisk(input: {
  dealId: string;
  tenantId: string;
  contactId?: string | null;
  instanceKey: string;
  address: PropertyAddress;
}): Promise<void> {
  const hasColumn = await risksProductKeyColumnExists();
  const state = input.address.state.trim() || "FL";
  if (!hasColumn) return;
  await db.insert(risks).values({
    tenantId: input.tenantId,
    dealId: input.dealId,
    contactId: input.contactId ?? null,
    riskType: "property",
    address1: input.address.street || null,
    city: input.address.city || null,
    county: input.address.county || null,
    state,
    zip: input.address.zip || null,
    productKey: input.instanceKey,
    yearBuilt: null,
    construction: null,
    occupancy: null,
    stories: null,
    squareFeet: null,
    coverageA: null,
    roofYear: null,
    roofCovering: null,
    openingProtection: null,
    pool: null,
    protectionClass: null,
    milesToCoast: null,
    replacementCostEstimate: null,
  });
}

async function updateRiskAddress(riskId: string, address: PropertyAddress): Promise<void> {
  await db
    .update(risks)
    .set({
      address1: address.street || null,
      city: address.city || null,
      county: address.county || null,
      state: address.state.trim() || "FL",
      zip: address.zip || null,
      updatedAt: new Date(),
    })
    .where(eq(risks.id, riskId));
}

function sheetForInstance(
  sheets: readonly { id: string; line: string; values: Record<string, QuoteSheetFieldValue> }[],
  instance: ProductInstance,
) {
  const line = storageLineForInstance(instance);
  return sheets.find((row) => row.line === line) ?? null;
}

/**
 * Give every property product after the first its own address copy.
 * The original null product_key row is left on the first property product.
 * A new copy is pre-filled from the deal address only. Characteristics stay blank.
 */
export async function ensureSeparatedProductProperties(input: {
  dealId: string;
  tenantId?: string;
  contactId?: string | null;
  instances: readonly ProductInstance[];
  stored: Record<string, string | null | undefined>;
  sheets: { id: string; line: string; values: Record<string, QuoteSheetFieldValue> }[];
}): Promise<Risk[]> {
  const tenantId = input.tenantId || DEFAULT_TENANT_ID;
  const legacyKey = legacyPropertyOwnerKey(input.instances);
  let rows = await listDealRisks(input.dealId, tenantId);
  const prefill = dealLevelPropertyAddress(input.stored);

  for (const instance of input.instances) {
    if (!isPropertyCoveringProduct(instance.productId)) continue;
    const legacyOwner = instance.key === legacyKey;
    if (legacyOwner) continue;
    const ownsSheet = instanceOwnsSheet(instance, input.instances);
    const sheet = sheetForInstance(input.sheets, instance);
    const ownRisk = riskForInstance(rows, instance.key, legacyKey);
    const storedAddress = resolveProductPropertyAddress({
      instanceKey: instance.key,
      ownsSheet,
      legacyOwner: false,
      storedDeal: {},
      sheetValues: sheet?.values,
      ownRisk,
    });
    if (storedAddress.source === "sheet" || storedAddress.source === "sidecar" || storedAddress.source === "risk") {
      if (!ownRisk && storedAddress.source !== "risk") {
        await insertProductRisk({
          dealId: input.dealId,
          tenantId,
          contactId: input.contactId,
          instanceKey: instance.key,
          address: storedAddress.address,
        });
      }
      continue;
    }
    if (!addressHasLocation(prefill)) continue;
    if (sheet && sheetAddressNeedsPrefill(sheet.values, instance.key, ownsSheet)) {
      const values = {
        ...sheet.values,
        ...sheetAddressCells(prefill, instance.key, ownsSheet),
      };
      await db
        .update(quoteSheets)
        .set({ values, updatedAt: new Date() })
        .where(eq(quoteSheets.id, sheet.id));
      sheet.values = values;
    }
    if (!ownRisk) {
      await insertProductRisk({
        dealId: input.dealId,
        tenantId,
        contactId: input.contactId,
        instanceKey: instance.key,
        address: prefill,
      });
    } else if (!addressHasLocation(addressFromRiskRow(ownRisk))) {
      await updateRiskAddress(ownRisk.id, prefill);
    }
  }

  rows = await listDealRisks(input.dealId, tenantId);
  return rows;
}

export async function saveInstancePropertyAddress(input: {
  dealId: string;
  tenantId?: string;
  contactId?: string | null;
  instanceKey: string;
  address: PropertyAddress;
  legacyOwnerKey?: string | null;
}): Promise<void> {
  const tenantId = input.tenantId || DEFAULT_TENANT_ID;
  const rows = await listDealRisks(input.dealId, tenantId);
  const legacyKey = input.legacyOwnerKey ?? null;
  const keyed = rows.find((row) => (row.productKey ?? "").trim() === input.instanceKey);
  if (keyed) {
    await updateRiskAddress(keyed.id, input.address);
    return;
  }
  if (legacyKey && input.instanceKey === legacyKey) {
    const legacy = rows.find((row) => !String(row.productKey ?? "").trim());
    if (legacy) {
      await updateRiskAddress(legacy.id, input.address);
      return;
    }
  }
  await insertProductRisk({
    dealId: input.dealId,
    tenantId,
    contactId: input.contactId,
    instanceKey: input.instanceKey,
    address: input.address,
  });
}

export function instancesFromDeal(deal: {
  shopProducts?: readonly string[] | null;
  shopLines?: readonly string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): ProductInstance[] {
  return resolveVisibleProductInstances(deal);
}
