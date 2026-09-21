import type { VinDecodeFact, VinDecodeValues, VinSheetKeyBag } from "./types";
import { NHTSA_VPIC_LABEL } from "./types";
import { titleCaseMake } from "./normalize";

/**
 * Rating-facing engine line from vPIC specs.
 * EngineModel is often a manufacturer code (K20C4) and EngineConfiguration
 * is "In-Line" — keep displacement / cylinders / HP in front, then the code.
 */
function buildEngineSummary(decoded: VinDecodeValues): string {
  const bits: string[] = [];
  const liters = decoded.displacementL.trim();
  if (liters) bits.push(`${liters}L`);
  const cylinders = decoded.engineCylinders.trim();
  if (cylinders) bits.push(`${cylinders} cyl`);
  const hp = decoded.engineHP.trim();
  if (hp) bits.push(`${hp} hp`);
  const spec = bits.join(" · ");
  const model = decoded.engine.trim();
  if (!model) return spec;
  if (!spec) return model;
  if (spec.toLowerCase().includes(model.toLowerCase())) return spec;
  return `${spec} · ${model}`;
}

function buildSafetySummary(decoded: VinDecodeValues): string {
  const bits: string[] = [];
  if (decoded.abs) bits.push(`ABS: ${decoded.abs}`);
  if (decoded.airBagLocFront) bits.push(`Front airbag: ${decoded.airBagLocFront}`);
  return bits.join(" · ");
}

/**
 * Map flat DecodeVinValues → Auto sheet keys for one vehicle unit.
 * Always maps year / make / model when present.
 * Fuel / body / engine / safety only when the key bag has a sheet home.
 * Usage, ownership, ownership length, lienholder, purchased new, OCN, and
 * annual miles are not vPIC fields — do not invent them here.
 */
export function mapVinDecodeToFacts(
  decoded: VinDecodeValues,
  keys: VinSheetKeyBag,
): VinDecodeFact[] {
  const facts: VinDecodeFact[] = [];
  const push = (sheetKey: string | undefined, value: string) => {
    if (!sheetKey) return;
    const next = value.trim();
    if (!next) return;
    facts.push({ sheetKey, value: next, sourceLabel: NHTSA_VPIC_LABEL });
  };

  push(keys.year, decoded.modelYear);
  push(keys.make, titleCaseMake(decoded.make) || decoded.make);
  push(keys.model, decoded.model);
  push(keys.fuel, decoded.fuelTypePrimary);
  push(keys.bodyClass, decoded.bodyClass || decoded.vehicleType);
  push(keys.engine, buildEngineSummary(decoded));
  push(keys.safety, buildSafetySummary(decoded));
  return facts;
}

export function parseDecodeVinValuesRow(
  row: Record<string, unknown> | null | undefined,
): VinDecodeValues {
  const str = (key: string) => String(row?.[key] ?? "").trim();
  return {
    make: str("Make"),
    model: str("Model"),
    modelYear: str("ModelYear"),
    trim: str("Trim"),
    series: str("Series"),
    bodyClass: str("BodyClass"),
    vehicleType: str("VehicleType"),
    fuelTypePrimary: str("FuelTypePrimary"),
    engine: str("EngineModel") || str("EngineConfiguration"),
    displacementL: str("DisplacementL"),
    engineCylinders: str("EngineCylinders"),
    engineHP: str("EngineHP"),
    abs: str("ABS"),
    airBagLocFront: str("AirBagLocFront"),
    errorCode: str("ErrorCode"),
    errorText: str("ErrorText"),
  };
}

export function decodeLooksSuccessful(decoded: VinDecodeValues): boolean {
  if (decoded.make || decoded.model || decoded.modelYear) return true;
  return decoded.errorCode === "0" || decoded.errorCode.startsWith("0,");
}
