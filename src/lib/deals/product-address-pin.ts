import { dealProductDef } from "@/lib/deals/deal-products";
import { isDwellingFireProduct } from "@/lib/deals/dwelling-addresses";
import { sheetFormForProduct } from "@/lib/deals/product-chip-label";
import {
  PRODUCT_INSTANCE_SEPARATOR,
  storageLineForInstance,
  type ProductInstance,
} from "@/lib/deals/product-instances";
import {
  addressFromRiskRow,
  addressHasLocation,
  dealLevelPropertyAddress,
  EMPTY_PROPERTY_ADDRESS,
  isPropertyCoveringProduct,
  legacyPropertyOwnerKey,
  type PropertyAddress,
} from "@/lib/deals/product-property";

/**
 * Which quote-sheet line and risk row a property tab may use.
 *
 * Shop order gives the plain `home` line to the first property product.
 * A dec can land on that line with a different form (DP3 facts on an HO3
 * chip). That sheet is not an address source for the chip that merely owns
 * the line. The product the form belongs to reads it. The unscoped risk
 * (product_key null) follows the same rule and is never copied onto a second
 * property product.
 */

type SheetValues = Record<string, { value?: string | null } | null | undefined> | null | undefined;

export type PropertySheetRef = {
  line: string;
  values?: SheetValues;
};

export type PropertyRiskRef = {
  productKey?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  county?: string | null;
};

const DIRECTIONALS: Record<string, string> = {
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  northeast: "ne",
  northwest: "nw",
  southeast: "se",
  southwest: "sw",
  n: "n",
  s: "s",
  e: "e",
  w: "w",
  ne: "ne",
  nw: "nw",
  se: "se",
  sw: "sw",
};

const STREET_SUFFIXES = new Set([
  "st",
  "street",
  "ave",
  "avenue",
  "blvd",
  "boulevard",
  "dr",
  "drive",
  "rd",
  "road",
  "ln",
  "lane",
  "ct",
  "court",
  "cir",
  "circle",
  "pl",
  "place",
  "ter",
  "terrace",
  "way",
  "pkwy",
  "parkway",
  "hwy",
  "highway",
  "trl",
  "trail",
]);

function cell(values: SheetValues, key: string): string {
  return String(values?.[key]?.value ?? "").replace(/\s+/g, " ").trim();
}

/** Dec `form` wins over the shop stamp `quoting_form` when both are set. */
export function policyFormOnSheet(values: SheetValues): string {
  return cell(values, "form") || cell(values, "quoting_form");
}

export function quotingFormForProductSheet(
  productId: ProductInstance["productId"],
  values: SheetValues,
): string | null {
  const extracted = cell(values, "form");
  const stamped = cell(values, "quoting_form");
  // A dec form that belongs to another product wins over a shop stamp.
  // Gloria's `home` line is form DP3 with quoting_form left at HO3.
  if (extracted) {
    return sheetFormForProduct(productId, extracted);
  }
  if (stamped && sheetFormForProduct(productId, stamped)) return stamped;
  return null;
}

/** House number + direction + name. NW and Northwest, Ter and Terrace, match. */
export function propertyStreetKey(street: string | null | undefined): string {
  const tokens = String(street ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => DIRECTIONALS[token] ?? token);
  while (tokens.length && STREET_SUFFIXES.has(tokens[tokens.length - 1]!)) tokens.pop();
  return tokens.join("");
}

export function propertyStreetsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = propertyStreetKey(a);
  const right = propertyStreetKey(b);
  if (!left || !right) return false;
  return left === right;
}

/**
 * True when this sheet's policy form belongs to a sibling product, not `instance`.
 * A sheet with no form stays with its line owner.
 */
export function sheetIsForeignToInstance(
  instance: Pick<ProductInstance, "key" | "productId">,
  peers: readonly Pick<ProductInstance, "key" | "productId">[],
  values: SheetValues,
): boolean {
  const form = policyFormOnSheet(values);
  if (!form) return false;
  if (sheetFormForProduct(instance.productId, form)) return false;
  return peers.some(
    (peer) => peer.key !== instance.key && Boolean(sheetFormForProduct(peer.productId, form)),
  );
}

function sheetScore(values: SheetValues): number {
  if (!values) return 0;
  let score = 0;
  if (cell(values, "address1")) score += 1;
  if (cell(values, "form")) score += 4;
  for (const field of ["occupancy", "coverage_a", "year_built", "construction"] as const) {
    if (cell(values, field)) score += 2;
  }
  return score;
}

function sheetByLine(sheets: readonly PropertySheetRef[], line: string): SheetValues {
  return sheets.find((row) => row.line === line)?.values ?? null;
}

/**
 * Line this tab reads and writes.
 * A foreign plain `home` line is left for the product the form fits.
 * This product uses `home~{key}` until it has its own row.
 * A thin duplicate (address copied, facts blank) adopts the foreign dec line.
 */
export function boundStorageLineForInstance(
  instance: ProductInstance,
  peers: readonly ProductInstance[],
  sheets: readonly PropertySheetRef[],
): string {
  const canonical = storageLineForInstance(instance, peers);
  const own = sheetByLine(sheets, canonical);
  if (own && sheetIsForeignToInstance(instance, peers, own)) {
    const shop = dealProductDef(instance.productId).shopLine;
    return `${shop}${PRODUCT_INSTANCE_SEPARATOR}${instance.key}`;
  }
  const ownScore = sheetScore(own);
  const ownStreet = cell(own, "address1");
  let best: { line: string; score: number } | null = null;
  for (const sheet of sheets) {
    if (sheet.line === canonical || !sheet.values) continue;
    const owner = peers.find((peer) => storageLineForInstance(peer, peers) === sheet.line);
    if (!owner || !sheetIsForeignToInstance(owner, peers, sheet.values)) continue;
    const form = policyFormOnSheet(sheet.values);
    if (!form || !sheetFormForProduct(instance.productId, form)) continue;
    const score = sheetScore(sheet.values);
    if (score < ownScore + 4) continue;
    const theirStreet = cell(sheet.values, "address1");
    if (ownStreet && theirStreet && !propertyStreetsMatch(ownStreet, theirStreet)) continue;
    if (!best || score > best.score) best = { line: sheet.line, score };
  }
  return best?.line ?? canonical;
}

/**
 * The unscoped risk belongs to the first property product, unless that
 * product's line is a sibling's form and the street matches that form.
 * Then it belongs to the matching product only — not to every tab.
 */
export function unscopedRiskInstanceKey(
  risk: PropertyRiskRef,
  instances: readonly ProductInstance[],
  sheets: readonly PropertySheetRef[],
): string | null {
  const legacy = legacyPropertyOwnerKey(instances);
  if (!legacy) return null;
  const legacyInst = instances.find((row) => row.key === legacy);
  if (!legacyInst) return null;
  const canonical = storageLineForInstance(legacyInst, instances);
  const legacySheet = sheetByLine(sheets, canonical);
  if (!legacySheet || !sheetIsForeignToInstance(legacyInst, instances, legacySheet)) return legacy;
  const street = String(risk.address1 ?? "").trim();
  if (!street) return null;
  const form = policyFormOnSheet(legacySheet);
  const match = instances.find((inst) => {
    if (!sheetFormForProduct(inst.productId, form)) return false;
    const ownStreet = cell(sheetByLine(sheets, storageLineForInstance(inst, instances)), "address1");
    if (ownStreet && propertyStreetsMatch(ownStreet, street)) return true;
    return propertyStreetsMatch(cell(legacySheet, "address1"), street);
  });
  return match?.key ?? null;
}

export type PinnedPropertyAddress = {
  address: PropertyAddress;
  source: "sheet" | "risk" | "deal" | "blank";
};

function riskRowFor(
  instance: ProductInstance,
  instances: readonly ProductInstance[],
  sheets: readonly PropertySheetRef[],
  risks: readonly PropertyRiskRef[],
): PropertyRiskRef | null {
  const keyed = risks.find((row) => String(row.productKey ?? "").trim() === instance.key);
  if (keyed) return keyed;
  const unscoped = risks.find((row) => !String(row.productKey ?? "").trim());
  if (!unscoped) return null;
  return unscopedRiskInstanceKey(unscoped, instances, sheets) === instance.key ? unscoped : null;
}

function pinFromSheetOrRisk(
  instance: ProductInstance,
  instances: readonly ProductInstance[],
  sheets: readonly PropertySheetRef[],
  risks: readonly PropertyRiskRef[],
): PinnedPropertyAddress {
  const canonical = storageLineForInstance(instance, instances);
  const bound = boundStorageLineForInstance(instance, instances, sheets);
  const sheetValues = sheetByLine(sheets, bound);
  // address1 only. property_address is a shared oneliner and must not label a sibling tab.
  const fromSheet: PropertyAddress = {
    street: cell(sheetValues, "address1"),
    unit: cell(sheetValues, "mailing_unit"),
    city: cell(sheetValues, "city"),
    state: cell(sheetValues, "state"),
    zip: cell(sheetValues, "zip"),
    county: cell(sheetValues, "county"),
  };
  const risk = riskRowFor(instance, instances, sheets, risks);
  const fromRisk = addressFromRiskRow(risk);
  const ownSheetIsForeign = Boolean(
    sheetByLine(sheets, canonical) &&
      sheetIsForeignToInstance(instance, instances, sheetByLine(sheets, canonical)),
  );

  if (ownSheetIsForeign) {
    if (addressHasLocation(fromSheet)) return { address: fromSheet, source: "sheet" };
    if (risk?.productKey && addressHasLocation(fromRisk)) return { address: fromRisk, source: "risk" };
    return { address: { ...EMPTY_PROPERTY_ADDRESS }, source: "blank" };
  }
  if (bound !== canonical && addressHasLocation(fromSheet)) {
    return { address: fromSheet, source: "sheet" };
  }
  if (addressHasLocation(fromRisk)) return { address: fromRisk, source: "risk" };
  if (addressHasLocation(fromSheet)) return { address: fromSheet, source: "sheet" };
  return { address: { ...EMPTY_PROPERTY_ADDRESS }, source: "blank" };
}

/**
 * Insured address for every property tab on one deal.
 * A product with nothing of its own may use the deal insured street (the
 * first property only). It never uses another tab's sheet, the deal mailing
 * street when that street is already another product, or the unscoped risk
 * once that row belongs to a sibling form.
 */
export function pinPropertyAddresses(input: {
  instances: readonly ProductInstance[];
  sheets: readonly PropertySheetRef[];
  risks: readonly PropertyRiskRef[];
  storedDeal?: Record<string, string | null | undefined> | null;
}): Map<string, PinnedPropertyAddress> {
  const pins = new Map<string, PinnedPropertyAddress>();
  for (const instance of input.instances) {
    if (!isPropertyCoveringProduct(instance.productId)) {
      pins.set(instance.key, { address: { ...EMPTY_PROPERTY_ADDRESS }, source: "blank" });
      continue;
    }
    pins.set(instance.key, pinFromSheetOrRisk(instance, input.instances, input.sheets, input.risks));
  }
  const legacy = legacyPropertyOwnerKey(input.instances);
  if (!legacy) return pins;
  const current = pins.get(legacy);
  if (current && addressHasLocation(current.address)) return pins;
  const legacyInst = input.instances.find((row) => row.key === legacy);
  if (!legacyInst) return pins;
  const dwellingFire = isDwellingFireProduct(
    dealProductDef(legacyInst.productId).quotingForm,
    legacyInst.productId,
  );
  const prefill = dealLevelPropertyAddress(input.storedDeal, { dwellingFire });
  if (!addressHasLocation(prefill)) return pins;
  const taken = [...pins.entries()].some(
    ([key, pin]) => key !== legacy && propertyStreetsMatch(pin.address.street, prefill.street),
  );
  if (taken) return pins;
  pins.set(legacy, { address: prefill, source: "deal" });
  return pins;
}

export type PropertyRiskWriteTarget = {
  instanceKey: string;
  /** Move the null product_key row onto this product when the streets match. */
  claimMatchingUnscoped: boolean;
  /** Do not overwrite the null row with a different street. */
  preserveUnscoped: boolean;
};

/**
 * Where a sheet save or fill may write the property risk.
 * A plain `home` line whose form is a sibling's (DP3 on the HO3 line) writes
 * that sibling's keyed row and does not replace the other building.
 */
export function propertyRiskWriteTarget(input: {
  instances: readonly ProductInstance[];
  storageLine: string;
  values: SheetValues;
}): PropertyRiskWriteTarget | null {
  const instances = input.instances;
  const canonicalOwner = instances.find(
    (row) => storageLineForInstance(row, instances) === input.storageLine,
  );
  if (canonicalOwner && isPropertyCoveringProduct(canonicalOwner.productId)) {
    if (!sheetIsForeignToInstance(canonicalOwner, instances, input.values)) {
      return { instanceKey: canonicalOwner.key, claimMatchingUnscoped: false, preserveUnscoped: false };
    }
    const form = policyFormOnSheet(input.values);
    const target = instances.find(
      (row) => row.key !== canonicalOwner.key && Boolean(sheetFormForProduct(row.productId, form)),
    );
    if (target) {
      return { instanceKey: target.key, claimMatchingUnscoped: true, preserveUnscoped: true };
    }
    return { instanceKey: canonicalOwner.key, claimMatchingUnscoped: false, preserveUnscoped: true };
  }
  const displaced = instances.find((row) => {
    if (!isPropertyCoveringProduct(row.productId)) return false;
    const shop = dealProductDef(row.productId).shopLine;
    const suffixed = `${shop}${PRODUCT_INSTANCE_SEPARATOR}${row.key}`;
    return suffixed === input.storageLine && storageLineForInstance(row, instances) !== input.storageLine;
  });
  if (!displaced) return null;
  return { instanceKey: displaced.key, claimMatchingUnscoped: false, preserveUnscoped: true };
}
