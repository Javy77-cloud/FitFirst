import { eq } from "drizzle-orm";
import { db, sql } from "@/lib/db";
import { risks, type Risk } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { mayInsertSeparatePropertyRisk, propertyStreetsMatch } from "@/lib/deals/product-address-pin";
import {
  autoVehicleRiskKey,
  tabRiskForInstance,
  type AutoVehicleFacts,
  type PropertyAddress,
} from "@/lib/deals/product-property";
import {
  resolveVisibleProductInstances,
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

/** product_key is not on the Drizzle schema so list queries work before 0157. */
export type ScopedRisk = Risk & { productKey: string | null };

function mapRawRisk(row: Record<string, unknown>): ScopedRisk {
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
export async function listDealRisks(dealId: string, tenantId = DEFAULT_TENANT_ID): Promise<ScopedRisk[]> {
  const rows = await sql<Record<string, unknown>[]>`
    select *
    from risks
    where tenant_id = ${tenantId}
      and deal_id = ${dealId}
    order by created_at asc
  `;
  return rows.map((row) => mapRawRisk(row));
}

export function riskForInstance(
  rows: readonly ScopedRisk[],
  instanceKey: string,
  legacyOwnerKey: string | null,
): ScopedRisk | null {
  return tabRiskForInstance(rows, instanceKey, legacyOwnerKey);
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
  await sql`
    insert into risks (
      tenant_id, deal_id, contact_id, risk_type,
      address1, city, county, state, zip, product_key
    ) values (
      ${input.tenantId},
      ${input.dealId},
      ${input.contactId ?? null},
      'property',
      ${input.address.street || null},
      ${input.address.city || null},
      ${input.address.county || null},
      ${state},
      ${input.address.zip || null},
      ${input.instanceKey}
    )
  `;
}

async function claimUnscopedRisk(riskId: string, productKey: string): Promise<void> {
  const hasColumn = await risksProductKeyColumnExists();
  if (!hasColumn) return;
  await sql`
    update risks
    set product_key = ${productKey}, updated_at = now()
    where id = ${riskId}
      and (product_key is null or btrim(product_key) = '')
  `;
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

async function updateVehicleFacts(riskId: string, vehicle: AutoVehicleFacts): Promise<void> {
  const year = Number(vehicle.year);
  await db
    .update(risks)
    .set({
      riskType: "auto",
      ...(vehicle.vin ? { vin: vehicle.vin } : {}),
      ...(Number.isFinite(year) && year > 0 ? { vehicleYear: year } : {}),
      ...(vehicle.make ? { vehicleMake: vehicle.make } : {}),
      ...(vehicle.model ? { vehicleModel: vehicle.model } : {}),
      updatedAt: new Date(),
    })
    .where(eq(risks.id, riskId));
}

async function insertVehicleRisk(input: {
  dealId: string;
  tenantId: string;
  contactId?: string | null;
  productKey: string;
  vehicle: AutoVehicleFacts;
}): Promise<void> {
  const year = Number(input.vehicle.year);
  await sql`
    insert into risks (
      tenant_id, deal_id, contact_id, risk_type, state, product_key,
      vin, vehicle_year, vehicle_make, vehicle_model
    ) values (
      ${input.tenantId},
      ${input.dealId},
      ${input.contactId ?? null},
      'auto',
      'FL',
      ${input.productKey},
      ${input.vehicle.vin || null},
      ${Number.isFinite(year) && year > 0 ? year : null},
      ${input.vehicle.make || null},
      ${input.vehicle.model || null}
    )
  `;
}

/**
 * Each vehicle on an auto product gets its own risks row on save.
 * Vehicle 1 on an auto-only deal updates the original null row.
 * A house deal never receives a VIN on that row.
 * Extra rows are skipped until risks.product_key exists.
 */
export async function saveAutoVehicleRisks(input: {
  dealId: string;
  tenantId?: string;
  contactId?: string | null;
  instanceKey: string;
  legacyAutoOwnerKey: string | null;
  vehicles: readonly AutoVehicleFacts[];
}): Promise<void> {
  if (!input.vehicles.length) return;
  const tenantId = input.tenantId || DEFAULT_TENANT_ID;
  const hasColumn = await risksProductKeyColumnExists();
  let rows = await listDealRisks(input.dealId, tenantId);
  for (const vehicle of input.vehicles) {
    const onLegacy =
      vehicle.index === 1 &&
      Boolean(input.legacyAutoOwnerKey) &&
      input.instanceKey === input.legacyAutoOwnerKey;
    if (onLegacy) {
      const legacy = rows.find((row) => !String(row.productKey ?? "").trim());
      if (legacy) await updateVehicleFacts(legacy.id, vehicle);
      continue;
    }
    if (!hasColumn) continue;
    const key = autoVehicleRiskKey(input.instanceKey, vehicle.index);
    const existing = rows.find((row) => (row.productKey ?? "").trim() === key);
    if (existing) {
      await updateVehicleFacts(existing.id, vehicle);
      continue;
    }
    await insertVehicleRisk({
      dealId: input.dealId,
      tenantId,
      contactId: input.contactId,
      productKey: key,
      vehicle,
    });
    rows = await listDealRisks(input.dealId, tenantId);
  }
}

export async function saveInstancePropertyAddress(input: {
  dealId: string;
  tenantId?: string;
  contactId?: string | null;
  instanceKey: string;
  address: PropertyAddress;
  legacyOwnerKey?: string | null;
  /**
   * The unscoped row's street is this product's building (a sibling form
   * was stored on the first product's line). Claim that row instead of
   * cloning it.
   */
  claimMatchingUnscoped?: boolean;
  /**
   * The unscoped row is another product's building. A different street
   * inserts a keyed row and leaves the unscoped row alone.
   */
  preserveUnscoped?: boolean;
}): Promise<void> {
  const tenantId = input.tenantId || DEFAULT_TENANT_ID;
  const rows = await listDealRisks(input.dealId, tenantId);
  const legacyKey = input.legacyOwnerKey ?? null;
  const keyed = rows.find((row) => (row.productKey ?? "").trim() === input.instanceKey);
  if (keyed) {
    await updateRiskAddress(keyed.id, input.address);
    return;
  }
  const unscoped = rows.find((row) => !String(row.productKey ?? "").trim());
  const sameUnscoped = Boolean(unscoped && propertyStreetsMatch(unscoped.address1, input.address.street));
  if (unscoped && input.claimMatchingUnscoped && sameUnscoped && input.instanceKey !== legacyKey) {
    await claimUnscopedRisk(unscoped.id, input.instanceKey);
    await updateRiskAddress(unscoped.id, input.address);
    return;
  }
  if (legacyKey && input.instanceKey === legacyKey && unscoped) {
    if (!(input.preserveUnscoped && !sameUnscoped)) {
      await updateRiskAddress(unscoped.id, input.address);
      return;
    }
  }
  if (
    !mayInsertSeparatePropertyRisk({
      instanceKey: input.instanceKey,
      legacyOwnerKey: legacyKey,
      addressStreet: input.address.street,
      unscopedStreet: unscoped?.address1,
      claimMatchingUnscoped: input.claimMatchingUnscoped,
    })
  ) {
    return;
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
