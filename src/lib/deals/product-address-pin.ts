import { addressFingerprint } from "@/lib/address/compare";
import { parseAddressVerifyMeta } from "@/lib/address/verify-state";
import { dealProductDef } from "@/lib/deals/deal-products";
import { isDwellingFireProduct } from "@/lib/deals/dwelling-addresses";
import { sheetFormForProduct } from "@/lib/deals/product-chip-label";
import {
  PRODUCT_INSTANCE_SEPARATOR,
  storageLineForInstance,
  type ProductInstance,
} from "@/lib/deals/product-instances";
import {
  addressFromInsuredFields,
  addressFromRiskRow,
  addressHasLocation,
  dealLevelPropertyAddress,
  EMPTY_PROPERTY_ADDRESS,
  isPropertyCoveringProduct,
  legacyPropertyOwnerKey,
  type ProductTabHeaderAddress,
  type PropertyAddress,
} from "@/lib/deals/product-property";

/**
 * Which quote-sheet line and risk row a property tab may use.
 *
 * Shop order gives the plain `home` line to the first property product.
 * A dec `form` on that line (DP3 facts stamped HO3) does not move the
 * location onto the sibling. The unscoped risk stays with the first
 * property product. A later product does not reuse that street, and does
 * not reuse another product's keyed street, unless it has its own risk row.
 * Deal Details insured address stays the deal field. When that street
 * differs from the first product's location, the header shows the deal
 * street and the chip keeps the location.
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
 * A shop stamp (`sheet_product` / `quoting_form`) keeps the line with that product.
 * An extracted `form` does not steal it. A sheet with no form stays with its line owner.
 */
export function sheetIsForeignToInstance(
  instance: Pick<ProductInstance, "key" | "productId">,
  peers: readonly Pick<ProductInstance, "key" | "productId">[],
  values: SheetValues,
): boolean {
  const stampedProduct = cell(values, "sheet_product");
  if (stampedProduct && stampedProduct === instance.productId) return false;
  const stampedForm = cell(values, "quoting_form");
  if (stampedForm && sheetFormForProduct(instance.productId, stampedForm)) return false;
  const extracted = cell(values, "form");
  if (!extracted) return false;
  if (sheetFormForProduct(instance.productId, extracted)) return false;
  return peers.some(
    (peer) => peer.key !== instance.key && Boolean(sheetFormForProduct(peer.productId, extracted)),
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
  keepOneProductPerStreet(pins, input.instances, input.risks);
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

/** One insured street per property tab. The legacy owner keeps a shared street; a keyed risk wins over that. */
function keepOneProductPerStreet(
  pins: Map<string, PinnedPropertyAddress>,
  instances: readonly ProductInstance[],
  risks: readonly PropertyRiskRef[],
): void {
  const groups = new Map<string, string[]>();
  for (const instance of instances) {
    const pin = pins.get(instance.key);
    if (!pin || !addressHasLocation(pin.address)) continue;
    const streetKey = propertyStreetKey(pin.address.street);
    if (!streetKey) continue;
    const list = groups.get(streetKey) ?? [];
    list.push(instance.key);
    groups.set(streetKey, list);
  }
  const legacy = legacyPropertyOwnerKey(instances);
  for (const keys of groups.values()) {
    if (keys.length < 2) continue;
    const keyed = keys.find((key) =>
      risks.some(
        (row) =>
          String(row.productKey ?? "").trim() === key &&
          propertyStreetsMatch(row.address1, pins.get(key)?.address.street),
      ),
    );
    const winner = keyed ?? (legacy && keys.includes(legacy) ? legacy : keys[0]);
    for (const key of keys) {
      if (key === winner) continue;
      pins.set(key, { address: { ...EMPTY_PROPERTY_ADDRESS }, source: "blank" });
    }
  }
}

const HEADER_INSURED_SHEET_KEYS = [
  "address1",
  "city",
  "state",
  "zip",
  "county",
  "premises_address",
  "premises_city",
  "premises_state",
  "premises_zip",
  "garaging_address",
  "garaging_city",
  "garaging_state",
  "garaging_zip",
  "applicant_address",
  "property_address",
] as const;

/**
 * Package-header "Insured address" for the first property product.
 * The chip and risk stay the location (Gloria HO3: 10358 Doral). When Deal
 * Details insured is a different street (8944), the header shows that street
 * — not the risk and not a sibling mailing (16021). Keyed copies and a blank
 * pin are left alone.
 */
export function headerWithSplitInsuredAddress<
  T extends { insured: ProductTabHeaderAddress; mailing: ProductTabHeaderAddress },
>(input: {
  instanceKey: string;
  legacyOwnerKey: string | null;
  locationStreet: string | null | undefined;
  dealStored?: Record<string, string | null | undefined> | null;
  header: T;
}): T {
  if (!input.legacyOwnerKey || input.instanceKey !== input.legacyOwnerKey) return input.header;
  if (!propertyStreetKey(input.locationStreet)) return input.header;
  const insured = addressFromInsuredFields(input.dealStored);
  if (!insured.street || propertyStreetsMatch(input.locationStreet, insured.street)) return input.header;
  return {
    ...input.header,
    insured: {
      address1: insured.street,
      city: insured.city,
      state: insured.state,
      zip: insured.zip,
    },
  };
}

/**
 * Applicant on the open sheet is the insured person, not the risk and not
 * another product's street. Display only — does not write the sheet.
 */
const SHEET_MAILING_KEYS = ["mailing_address", "mailing_city", "mailing_state", "mailing_zip"] as const;

function blankSheetCell(current: { value?: string | null } | null | undefined) {
  return current ? { ...current, value: "" } : { value: "" };
}

export function sheetWithProductInsuredAddress(
  values: SheetValues,
  input: {
    instanceKey: string;
    legacyOwnerKey: string | null;
    locationStreet: string | null | undefined;
    dealStored?: Record<string, string | null | undefined> | null;
    /** Other products' risk streets. They must not sit on this sheet as mailing or applicant. */
    foreignStreets?: readonly (string | null | undefined)[];
  },
): SheetValues {
  if (!values) return values;
  let next = values;
  const mailing = cell(next, "mailing_address");
  if (
    streetIsProductLocation(mailing, input.foreignStreets, input.locationStreet) &&
    !propertyStreetsMatch(mailing, addressFromInsuredFields(input.dealStored).street)
  ) {
    next = { ...next };
    for (const key of SHEET_MAILING_KEYS) {
      next[key] = blankSheetCell(next[key]);
    }
  }
  if (!input.legacyOwnerKey || input.instanceKey !== input.legacyOwnerKey) return next;
  if (!propertyStreetKey(input.locationStreet)) return next;
  const insured = addressFromInsuredFields(input.dealStored);
  if (!insured.street || propertyStreetsMatch(input.locationStreet, insured.street)) return next;
  const applicant = cell(next, "applicant_address");
  if (!applicant || propertyStreetsMatch(applicant, insured.street)) return next;
  if (propertyStreetsMatch(applicant, input.locationStreet)) return next;
  if (!streetIsProductLocation(applicant, input.foreignStreets, insured.street)) return next;
  const current = next.applicant_address;
  return {
    ...next,
    applicant_address: current ? { ...current, value: insured.street } : { value: insured.street },
  };
}

/** Header insured location follows the pin. A blank pin does not fall through to a sibling street on the sheet. */
export function headerSheetForPinnedAddress(
  values: SheetValues,
  pin: PinnedPropertyAddress | null | undefined,
): SheetValues {
  if (!values || (pin && addressHasLocation(pin.address))) return values;
  const next: NonNullable<SheetValues> = { ...values };
  for (const key of HEADER_INSURED_SHEET_KEYS) {
    const current = next[key];
    if (!current) continue;
    next[key] = { ...current, value: "" };
  }
  return next;
}

const CONTACT_MAILING_KEYS = [
  "contact_mailing_address",
  "contact_mailing_unit",
  "contact_mailing_city",
  "contact_mailing_state",
  "contact_mailing_zip",
  "contact_mailing_county",
  "contact_mailing_address__verify",
] as const;

const DEAL_INSURED_PART_KEYS = [
  "mailing_address",
  "mailing_unit",
  "city",
  "state",
  "zip",
  "county",
  "mailing_address__verify",
] as const;

function streetIsProductLocation(
  street: string | null | undefined,
  productLocationStreets: readonly (string | null | undefined)[] | undefined,
  exceptStreet?: string | null,
): boolean {
  if (!propertyStreetKey(street)) return false;
  return (productLocationStreets ?? []).some(
    (row) => propertyStreetsMatch(row, street) && !propertyStreetsMatch(row, exceptStreet),
  );
}

/**
 * Deal Details insured address is the deal field (`mailing_address`), not the
 * active product's risk and not the mailing street. A same-as flag or a verify
 * fingerprint for a different street must not present mailing as insured.
 * A contact-mailing street that is another product's location is cleared so
 * "mailing same as insured" cannot paint that product onto the insured field.
 */
export function dealDetailsStoredAddresses(
  stored: Record<string, string | null | undefined> | null | undefined,
  options?: { productLocationStreets?: readonly (string | null | undefined)[] },
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(stored ?? {})) {
    if (value != null) next[key] = String(value);
  }
  const insuredStreet = next.mailing_address ?? "";
  let mailingStreet = next.contact_mailing_address ?? "";
  if (
    streetIsProductLocation(mailingStreet, options?.productLocationStreets, insuredStreet)
  ) {
    for (const key of CONTACT_MAILING_KEYS) next[key] = "";
    mailingStreet = "";
    next.mailing_same_as_insured = "false";
  }
  if (insuredStreet && mailingStreet && !propertyStreetsMatch(insuredStreet, mailingStreet)) {
    next.mailing_same_as_insured = "false";
  }
  const meta = parseAddressVerifyMeta(next.mailing_address__verify);
  const insuredFingerprint = addressFingerprint({
    street: insuredStreet,
    city: next.city ?? "",
    state: next.state ?? "",
    zip: next.zip ?? "",
    county: next.county ?? "",
    country: "US",
  });
  if (meta?.fingerprint && insuredFingerprint && meta.fingerprint !== insuredFingerprint) {
    next.mailing_address__verify = "";
  }
  return next;
}

/**
 * A Deal Details save must not replace the insured street with another
 * product's location (16021 or 10358 over 8944). Mailing is never copied
 * onto insured.
 */
export function keepDealInsuredOffProductStreets(input: {
  previous: Record<string, string | null | undefined> | null | undefined;
  next: Record<string, string>;
  productLocationStreets?: readonly (string | null | undefined)[];
}): Record<string, string> {
  const previous = input.previous ?? {};
  const prevStreet = String(previous.mailing_address ?? "");
  const nextStreet = input.next.mailing_address ?? "";
  if (!propertyStreetKey(prevStreet) || propertyStreetsMatch(prevStreet, nextStreet)) {
    return dealDetailsStoredAddresses(input.next, {
      productLocationStreets: input.productLocationStreets,
    });
  }
  const hitsProduct = streetIsProductLocation(nextStreet, input.productLocationStreets, prevStreet);
  const guarded = { ...input.next };
  if (hitsProduct) {
    for (const key of DEAL_INSURED_PART_KEYS) {
      guarded[key] = String(previous[key] ?? "");
    }
    guarded.mailing_address__verify = "";
  }
  return dealDetailsStoredAddresses(guarded, {
    productLocationStreets: input.productLocationStreets,
  });
}

/** A later product must not insert a second risk on the unscoped building. */
export function mayInsertSeparatePropertyRisk(input: {
  instanceKey: string;
  legacyOwnerKey: string | null;
  addressStreet: string | null | undefined;
  unscopedStreet: string | null | undefined;
  claimMatchingUnscoped?: boolean;
}): boolean {
  if (input.claimMatchingUnscoped) return false;
  if (input.legacyOwnerKey && input.instanceKey === input.legacyOwnerKey) return false;
  if (propertyStreetsMatch(input.addressStreet, input.unscopedStreet)) return false;
  return Boolean(propertyStreetKey(input.addressStreet));
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
