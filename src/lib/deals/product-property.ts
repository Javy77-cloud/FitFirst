import { dealProductDef, type DealProductId } from "@/lib/deals/deal-products";
import {
  storageLineForInstance,
  type ProductInstance,
} from "@/lib/deals/product-instances";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

/**
 * Deal Details "Insured Address" is stored under these keys (the street
 * field is named mailing_address). Person mailing is the contact_mailing_* set.
 */
export const DEAL_INSURED_ADDRESS_KEYS = {
  street: "mailing_address",
  unit: "mailing_unit",
  city: "city",
  state: "state",
  zip: "zip",
  county: "county",
} as const;

/** Deal Details "Mailing Address" — used only when the insured street is blank. */
export const DEAL_MAILING_ADDRESS_KEYS = {
  street: "contact_mailing_address",
  unit: "contact_mailing_unit",
  city: "contact_mailing_city",
  state: "contact_mailing_state",
  zip: "contact_mailing_zip",
  county: "contact_mailing_county",
} as const;

export const INSURED_ADDRESS_FIELD_KEYS = [
  DEAL_INSURED_ADDRESS_KEYS.street,
  DEAL_INSURED_ADDRESS_KEYS.unit,
  DEAL_INSURED_ADDRESS_KEYS.city,
  DEAL_INSURED_ADDRESS_KEYS.state,
  DEAL_INSURED_ADDRESS_KEYS.zip,
  DEAL_INSURED_ADDRESS_KEYS.county,
] as const;

/** Dwelling facts that must start empty on a newly added property copy. */
export const PROPERTY_CHARACTERISTIC_FIELDS = [
  "year_built",
  "construction",
  "occupancy",
  "stories",
  "square_feet",
  "coverage_a",
  "roof_year",
  "roof_covering",
  "opening_protection",
  "pool",
  "protection_class",
  "miles_to_coast",
  "replacement_cost_estimate",
] as const;

export type PropertyAddress = {
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

export const EMPTY_PROPERTY_ADDRESS: PropertyAddress = {
  street: "",
  unit: "",
  city: "",
  state: "",
  zip: "",
  county: "",
};

type AddressKeyMap = {
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

type StoredValues = Record<string, string | null | undefined> | null | undefined;

type SheetValues = Record<string, { value?: string | null } | undefined> | null | undefined;

export function isPropertyCoveringProduct(productId: DealProductId): boolean {
  const line = dealProductDef(productId).shopLine;
  return line === "home" || line === "flood";
}

/**
 * The original unscoped risk (product_key null) belongs to the first property
 * product in shop order. Later products and `~suffix` copies do not share it.
 */
export function legacyPropertyOwnerKey(
  instances: readonly Pick<ProductInstance, "key" | "productId">[],
): string | null {
  return instances.find((row) => isPropertyCoveringProduct(row.productId))?.key ?? null;
}

export function instanceOwnsSheet(
  instance: Pick<ProductInstance, "key" | "productId">,
  instances: readonly Pick<ProductInstance, "key" | "productId">[],
): boolean {
  const peers = instances as ProductInstance[];
  const line = storageLineForInstance(instance as ProductInstance, peers);
  if (line.includes("~")) return true;
  const first = instances.find(
    (row) => storageLineForInstance(row as ProductInstance, peers) === line,
  );
  return first?.key === instance.key;
}

function readMapped(stored: StoredValues, keys: AddressKeyMap): PropertyAddress {
  const pick = (key: string) => String(stored?.[key] ?? "").replace(/\s+/g, " ").trim();
  return {
    street: pick(keys.street),
    unit: pick(keys.unit),
    city: pick(keys.city),
    state: pick(keys.state),
    zip: pick(keys.zip),
    county: pick(keys.county),
  };
}

export function addressHasLocation(address: PropertyAddress | null | undefined): boolean {
  if (!address) return false;
  return Boolean(address.street || address.city || address.zip);
}

/**
 * Starting address for a property that does not yet have its own.
 * Reads the deal's insured address fields. If that street is blank, the
 * deal's mailing address — except DP1/DP3, where mailing is the owner's home
 * and must not become the rental.
 * Never a product risk or another tab's sheet.
 */
export function dealLevelPropertyAddress(
  stored: StoredValues,
  options?: { dwellingFire?: boolean },
): PropertyAddress {
  const insured = readMapped(stored, DEAL_INSURED_ADDRESS_KEYS);
  if (options?.dwellingFire) return insured;
  if (insured.street) return insured;
  return readMapped(stored, DEAL_MAILING_ADDRESS_KEYS);
}

export function blankPropertyCharacteristics(): Record<(typeof PROPERTY_CHARACTERISTIC_FIELDS)[number], string> {
  return Object.fromEntries(PROPERTY_CHARACTERISTIC_FIELDS.map((key) => [key, ""])) as Record<
    (typeof PROPERTY_CHARACTERISTIC_FIELDS)[number],
    string
  >;
}

export function newCopyPropertySeed(
  stored: StoredValues,
  options?: { dwellingFire?: boolean },
): {
  address: PropertyAddress;
  characteristics: Record<(typeof PROPERTY_CHARACTERISTIC_FIELDS)[number], string>;
} {
  return {
    address: dealLevelPropertyAddress(stored, options),
    characteristics: blankPropertyCharacteristics(),
  };
}

/** First auto product on an auto-only deal owns the original null risk (vehicle 1). */
export function legacyAutoOwnerKey(
  instances: readonly Pick<ProductInstance, "key" | "productId">[],
): string | null {
  if (instances.some((row) => isPropertyCoveringProduct(row.productId))) return null;
  return instances.find((row) => dealProductDef(row.productId).shopLine === "auto")?.key ?? null;
}

/** Vehicle 1 uses the product key. Later vehicles never share that row. */
export function autoVehicleRiskKey(instanceKey: string, index: number): string {
  if (index <= 1) return instanceKey;
  return `${instanceKey}#v${index}`;
}

export type AutoVehicleFacts = {
  index: number;
  vin: string;
  year: string;
  make: string;
  model: string;
};

const PERSONAL_AUTO_VEHICLE_CAP = 4;

export function vehiclesOnAutoSheet(values: SheetValues): AutoVehicleFacts[] {
  const out: AutoVehicleFacts[] = [];
  for (let index = 1; index <= PERSONAL_AUTO_VEHICLE_CAP; index += 1) {
    const vin = cellValue(values, index === 1 ? "vin" : `vehicle_${index}_vin`);
    const year = cellValue(values, index === 1 ? "vehicle_year" : `vehicle_${index}_year`);
    const make = cellValue(values, index === 1 ? "vehicle_make" : `vehicle_${index}_make`);
    const model = cellValue(values, index === 1 ? "vehicle_model" : `vehicle_${index}_model`);
    if (!vin && !year && !make && !model) continue;
    out.push({ index, vin, year, make, model });
  }
  return out;
}

/** Sheet cells that hold one product's address when it does not own the shared line. */
export function sidecarField(instanceKey: string, field: string): string {
  return `ffpa:${instanceKey}:${field}`;
}

function cellValue(values: SheetValues, key: string): string {
  return String(values?.[key]?.value ?? "").replace(/\s+/g, " ").trim();
}

export function addressFromSheetValues(
  values: SheetValues,
  instanceKey: string,
  ownsSheet: boolean,
): PropertyAddress {
  if (!ownsSheet) {
    return {
      street: cellValue(values, sidecarField(instanceKey, "address1")),
      unit: cellValue(values, sidecarField(instanceKey, "mailing_unit")),
      city: cellValue(values, sidecarField(instanceKey, "city")),
      state: cellValue(values, sidecarField(instanceKey, "state")),
      zip: cellValue(values, sidecarField(instanceKey, "zip")),
      county: cellValue(values, sidecarField(instanceKey, "county")),
    };
  }
  return {
    street: cellValue(values, "address1") || cellValue(values, "property_address"),
    unit: cellValue(values, "mailing_unit"),
    city: cellValue(values, "city"),
    state: cellValue(values, "state"),
    zip: cellValue(values, "zip"),
    county: cellValue(values, "county"),
  };
}

export function addressFromRiskRow(
  risk: {
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    county?: string | null;
  } | null | undefined,
): PropertyAddress {
  return {
    street: String(risk?.address1 ?? "").replace(/\s+/g, " ").trim(),
    unit: "",
    city: String(risk?.city ?? "").replace(/\s+/g, " ").trim(),
    state: String(risk?.state ?? "").replace(/\s+/g, " ").trim(),
    zip: String(risk?.zip ?? "").replace(/\s+/g, " ").trim(),
    county: String(risk?.county ?? "").replace(/\s+/g, " ").trim(),
  };
}

/**
 * Street for one product tab, computed at render.
 * Own risk first. A null product_key row is only the first property product
 * (callers pass that row as ownRisk). Then this form's address1 or sidecar.
 * Never property_address, property_oneliner, the deal-level prefill, or another tab.
 */
export function insuredAddressForProductTab(input: {
  instanceKey: string;
  ownsSheet: boolean;
  sheetValues?: SheetValues;
  ownRisk?: { address1?: string | null; city?: string | null } | null;
}): { street: string; city: string } {
  const riskStreet = String(input.ownRisk?.address1 ?? "").replace(/\s+/g, " ").trim();
  if (riskStreet) {
    return {
      street: riskStreet,
      city: String(input.ownRisk?.city ?? "").replace(/\s+/g, " ").trim(),
    };
  }
  if (!input.sheetValues) return { street: "", city: "" };
  if (input.ownsSheet) {
    return {
      street: cellValue(input.sheetValues, "address1"),
      city: cellValue(input.sheetValues, "city"),
    };
  }
  return {
    street: cellValue(input.sheetValues, sidecarField(input.instanceKey, "address1")),
    city: cellValue(input.sheetValues, sidecarField(input.instanceKey, "city")),
  };
}

export type ProductTabHeaderAddress = {
  address1: string;
  city: string;
  state: string;
  zip: string;
};

const EMPTY_TAB_HEADER_ADDRESS: ProductTabHeaderAddress = {
  address1: "",
  city: "",
  state: "",
  zip: "",
};

function headerPart(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function tabHeaderFromRisk(risk: {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null | undefined): ProductTabHeaderAddress {
  return {
    address1: headerPart(risk?.address1),
    city: headerPart(risk?.city),
    state: headerPart(risk?.state),
    zip: headerPart(risk?.zip),
  };
}

function tabHeaderField(
  values: SheetValues,
  ownsSheet: boolean,
  instanceKey: string,
  field: string,
): string {
  if (!values) return "";
  const key = ownsSheet ? field : sidecarField(instanceKey, field);
  return cellValue(values, key);
}

function tabHeaderLocation(
  values: SheetValues,
  ownsSheet: boolean,
  instanceKey: string,
  streetKey: string,
  cityKey: string,
  stateKey: string,
  zipKey: string,
): ProductTabHeaderAddress {
  return {
    address1: tabHeaderField(values, ownsSheet, instanceKey, streetKey),
    city: tabHeaderField(values, ownsSheet, instanceKey, cityKey),
    state: tabHeaderField(values, ownsSheet, instanceKey, stateKey),
    zip: tabHeaderField(values, ownsSheet, instanceKey, zipKey),
  };
}

function tabHeaderHasStreet(parts: ProductTabHeaderAddress): boolean {
  return Boolean(parts.address1);
}

/** A one-line mailing already includes city. Don't print that city again. */
function tabHeaderMailingLine(parts: ProductTabHeaderAddress): ProductTabHeaderAddress {
  if (parts.city && parts.address1.toLowerCase().includes(parts.city.toLowerCase())) {
    return { address1: parts.address1, city: "", state: "", zip: "" };
  }
  return parts;
}

/**
 * Header insured + mailing for the active product tab.
 * Insured uses the same source as the tab label: this tab's risk, then this
 * form's address1 / premises / garaging. Mailing is this form's mailing_address.
 * Never property_address, property_oneliner, deal custom fields, or the contact.
 */
export function headerAddressesForProductTab(input: {
  instanceKey: string;
  ownsSheet: boolean;
  sheetValues?: SheetValues;
  ownRisk?: {
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
}): { insured: ProductTabHeaderAddress; mailing: ProductTabHeaderAddress } {
  const values = input.sheetValues;
  const fromRisk = tabHeaderFromRisk(input.ownRisk);
  const fromAddress1 = tabHeaderLocation(values, input.ownsSheet, input.instanceKey, "address1", "city", "state", "zip");
  const fromPremises = tabHeaderLocation(
    values,
    input.ownsSheet,
    input.instanceKey,
    "premises_address",
    "premises_city",
    "premises_state",
    "premises_zip",
  );
  const premises =
    tabHeaderHasStreet(fromPremises) &&
    !fromPremises.city &&
    !fromPremises.state &&
    !fromPremises.zip &&
    !tabHeaderHasStreet(fromAddress1)
      ? { ...fromPremises, city: fromAddress1.city, state: fromAddress1.state, zip: fromAddress1.zip }
      : fromPremises;
  const fromGarage = tabHeaderLocation(
    values,
    input.ownsSheet,
    input.instanceKey,
    "garaging_address",
    "garaging_city",
    "garaging_state",
    "garaging_zip",
  );

  let mailing = tabHeaderLocation(
    values,
    input.ownsSheet,
    input.instanceKey,
    "mailing_address",
    "mailing_city",
    "mailing_state",
    "mailing_zip",
  );
  const premisesSame = /^(yes|true|1)$/i.test(
    tabHeaderField(values, input.ownsSheet, input.instanceKey, "premises_same_as_business"),
  );
  if (premisesSame && tabHeaderHasStreet(mailing) && !mailing.city && !mailing.state && !mailing.zip) {
    mailing = {
      address1: mailing.address1,
      city: tabHeaderField(values, input.ownsSheet, input.instanceKey, "city"),
      state: tabHeaderField(values, input.ownsSheet, input.instanceKey, "state"),
      zip: tabHeaderField(values, input.ownsSheet, input.instanceKey, "zip"),
    };
  }

  let insured = tabHeaderHasStreet(fromRisk)
    ? fromRisk
    : tabHeaderHasStreet(fromAddress1)
      ? fromAddress1
      : tabHeaderHasStreet(premises)
        ? premises
        : tabHeaderHasStreet(fromGarage)
          ? fromGarage
          : { ...EMPTY_TAB_HEADER_ADDRESS };

  if (!tabHeaderHasStreet(insured) && tabHeaderHasStreet(mailing) && premisesSame) {
    insured = { ...mailing };
  }
  if (!tabHeaderHasStreet(insured) && input.ownsSheet && values) {
    const applicant = cellValue(values, "applicant_address");
    if (applicant) insured = { address1: applicant, city: "", state: "", zip: "" };
  }

  return { insured, mailing: tabHeaderMailingLine(mailing) };
}

/**
 * The unscoped risk (product_key null) belongs to the first property tab,
 * otherwise the first auto tab, otherwise the first tab. Later tabs do not share it.
 */
export function headerRiskOwnerKey(
  instances: readonly Pick<ProductInstance, "key" | "productId">[],
): string | null {
  return legacyPropertyOwnerKey(instances) ?? legacyAutoOwnerKey(instances) ?? instances[0]?.key ?? null;
}

/**
 * Match a risk to one product tab. A keyed row wins. An unscoped row
 * (product_key null) belongs only to legacyOwnerKey — the first property product.
 */
export function tabRiskForInstance<T extends { productKey?: string | null }>(
  rows: readonly T[],
  instanceKey: string,
  legacyOwnerKey: string | null,
): T | null {
  const keyed = rows.find((row) => String(row.productKey ?? "").trim() === instanceKey);
  if (keyed) return keyed;
  if (legacyOwnerKey && instanceKey === legacyOwnerKey) {
    return rows.find((row) => !String(row.productKey ?? "").trim()) ?? null;
  }
  return null;
}

export function riskBelongsToInstance(input: {
  productKey: string | null | undefined;
  instanceKey: string;
  legacyOwnerKey: string | null;
}): boolean {
  const key = String(input.productKey ?? "").trim();
  if (key) return key === input.instanceKey;
  return Boolean(input.legacyOwnerKey && input.instanceKey === input.legacyOwnerKey);
}

export type ResolvedProductAddress = {
  address: PropertyAddress;
  source: "sheet" | "sidecar" | "risk" | "deal" | "blank";
};

/**
 * Address for one product tab.
 * A non-owner with nothing saved yet gets the deal-level pre-fill.
 * A sibling risk is not an input — callers must pass only this product's row.
 */
export function resolveProductPropertyAddress(input: {
  instanceKey: string;
  ownsSheet: boolean;
  legacyOwner: boolean;
  storedDeal: StoredValues;
  sheetValues?: SheetValues;
  /** DP1/DP3: do not treat the owner's mailing address as the rental. */
  dwellingFire?: boolean;
  ownRisk?: {
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    county?: string | null;
  } | null;
}): ResolvedProductAddress {
  const fromSheet = addressFromSheetValues(input.sheetValues, input.instanceKey, input.ownsSheet);
  if (addressHasLocation(fromSheet)) {
    return { address: fromSheet, source: input.ownsSheet ? "sheet" : "sidecar" };
  }
  const fromRisk = addressFromRiskRow(input.ownRisk);
  if (addressHasLocation(fromRisk)) {
    return { address: { ...fromRisk, unit: fromSheet.unit }, source: "risk" };
  }
  const prefill = dealLevelPropertyAddress(input.storedDeal, { dwellingFire: input.dwellingFire });
  if (addressHasLocation(prefill)) return { address: prefill, source: "deal" };
  return { address: { ...EMPTY_PROPERTY_ADDRESS }, source: "blank" };
}

export function insuredFieldsFromAddress(address: PropertyAddress): Record<string, string> {
  return {
    [DEAL_INSURED_ADDRESS_KEYS.street]: address.street,
    [DEAL_INSURED_ADDRESS_KEYS.unit]: address.unit,
    [DEAL_INSURED_ADDRESS_KEYS.city]: address.city,
    [DEAL_INSURED_ADDRESS_KEYS.state]: address.state,
    [DEAL_INSURED_ADDRESS_KEYS.zip]: address.zip,
    [DEAL_INSURED_ADDRESS_KEYS.county]: address.county,
  };
}

export function addressFromInsuredFields(values: StoredValues): PropertyAddress {
  return readMapped(values, DEAL_INSURED_ADDRESS_KEYS);
}

export function addressFromSheetSubmission(submitted: Record<string, string | null | undefined>): PropertyAddress {
  const pick = (key: string) => String(submitted[key] ?? "").replace(/\s+/g, " ").trim();
  return {
    street: pick("address1") || pick("property_address"),
    unit: pick("mailing_unit"),
    city: pick("city"),
    state: pick("state"),
    zip: pick("zip"),
    county: pick("county"),
  };
}

/** Keep the deal-level insured keys. A product edit must not replace them. */
export function restoreDealInsuredFields(
  posted: Record<string, string>,
  previous: StoredValues,
): Record<string, string> {
  const next = { ...posted };
  for (const key of INSURED_ADDRESS_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(previous ?? {}, key)) {
      next[key] = String(previous?.[key] ?? "");
    } else {
      delete next[key];
    }
  }
  return next;
}

export function sheetAddressCells(
  address: PropertyAddress,
  instanceKey: string,
  ownsSheet: boolean,
): Record<string, QuoteSheetFieldValue> {
  const write = (field: string, value: string) => {
    const text = value.trim();
    const key = ownsSheet ? field : sidecarField(instanceKey, field);
    return [
      key,
      text
        ? { value: text, status: "confirmed" as const, source: "agent" as const, sourceLabel: "Deal address" }
        : { value: "", status: "missing" as const, source: "blank" as const },
    ] as const;
  };
  return Object.fromEntries([
    write("address1", address.street),
    write("mailing_unit", address.unit),
    write("city", address.city),
    write("state", address.state),
    write("zip", address.zip),
    write("county", address.county),
  ]);
}

const SHARED_SHEET_ADDRESS_FIELDS = ["address1", "mailing_unit", "city", "state", "zip", "county", "property_address"] as const;

/** Put a product address onto the form without writing the shared sheet's address. */
export function overlaySheetAddress(
  values: Record<string, QuoteSheetFieldValue>,
  address: PropertyAddress,
  ownsSheet: boolean,
): Record<string, QuoteSheetFieldValue> {
  if (ownsSheet) return values;
  const next: Record<string, QuoteSheetFieldValue> = { ...values };
  const cell = (value: string): QuoteSheetFieldValue => ({
    value,
    status: value.trim() ? "confirmed" : "missing",
    source: value.trim() ? "agent" : "blank",
  });
  next.address1 = cell(address.street);
  next.mailing_unit = cell(address.unit);
  next.city = cell(address.city);
  next.state = cell(address.state);
  next.zip = cell(address.zip);
  next.county = cell(address.county);
  return next;
}

const SHARED_PROPERTY_FACT_FIELDS = [
  ...SHARED_SHEET_ADDRESS_FIELDS,
  ...PROPERTY_CHARACTERISTIC_FIELDS,
] as const;

function characteristicSidecarCells(
  submitted: Record<string, string | null | undefined> | null | undefined,
  instanceKey: string,
): Record<string, QuoteSheetFieldValue> {
  if (!submitted) return {};
  const out: Record<string, QuoteSheetFieldValue> = {};
  for (const field of PROPERTY_CHARACTERISTIC_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(submitted, field)) continue;
    const text = String(submitted[field] ?? "").replace(/\s+/g, " ").trim();
    out[sidecarField(instanceKey, field)] = text
      ? { value: text, status: "confirmed", source: "agent" }
      : { value: "", status: "missing", source: "blank" };
  }
  return out;
}

/**
 * Show this product's address and its own (often still blank) characteristics
 * on a sheet it shares with the first property. Does not mutate the stored sheet.
 */
export function overlaySharedProductSheet(
  values: Record<string, QuoteSheetFieldValue>,
  instanceKey: string,
  address: PropertyAddress,
): Record<string, QuoteSheetFieldValue> {
  const next = overlaySheetAddress(values, address, false);
  for (const field of PROPERTY_CHARACTERISTIC_FIELDS) {
    const text = cellValue(values, sidecarField(instanceKey, field));
    next[field] = text
      ? { value: text, status: "confirmed", source: "agent" }
      : { value: "", status: "missing", source: "blank" };
  }
  return next;
}

/** Cells to copy onto this product's risk. A shared sheet must not donate the other building's facts. */
export function riskSyncValuesForInstance(
  values: Record<string, QuoteSheetFieldValue>,
  instanceKey: string,
  ownsSheet: boolean,
): Record<string, QuoteSheetFieldValue> {
  if (ownsSheet) return values;
  const out: Record<string, QuoteSheetFieldValue> = {};
  for (const field of PROPERTY_CHARACTERISTIC_FIELDS) {
    const cell = values[sidecarField(instanceKey, field)];
    if (cell) out[field] = cell;
  }
  return out;
}

/** After a shared-sheet save, keep the owner's cells and store this product beside them. */
export function splitSharedSheetAddressSave(input: {
  previous: Record<string, QuoteSheetFieldValue>;
  merged: Record<string, QuoteSheetFieldValue>;
  instanceKey: string;
  submitted: PropertyAddress;
  characteristicSource?: Record<string, string | null | undefined> | null;
}): Record<string, QuoteSheetFieldValue> {
  const next = { ...input.merged };
  for (const field of SHARED_PROPERTY_FACT_FIELDS) {
    if (input.previous[field]) next[field] = input.previous[field];
    else delete next[field];
  }
  return {
    ...next,
    ...sheetAddressCells(input.submitted, input.instanceKey, false),
    ...characteristicSidecarCells(input.characteristicSource, input.instanceKey),
  };
}

export function editProductAddress<T extends { key: string; address: PropertyAddress }>(
  rows: readonly T[],
  key: string,
  next: PropertyAddress,
): T[] {
  return rows.map((row) => (row.key === key ? { ...row, address: { ...next } } : { ...row, address: { ...row.address } }));
}

/** Red tab error only after a shop that is still missing quotes — not on a new Gathering copy. */
export function productTabShowsError(gap: { shopped?: boolean; complete?: boolean } | null | undefined): boolean {
  return Boolean(gap && gap.shopped && !gap.complete);
}

export function sheetAddressNeedsPrefill(
  values: SheetValues,
  instanceKey: string,
  ownsSheet: boolean,
): boolean {
  return !addressHasLocation(addressFromSheetValues(values, instanceKey, ownsSheet));
}
