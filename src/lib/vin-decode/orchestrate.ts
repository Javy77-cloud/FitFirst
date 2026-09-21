import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ApplyFillResult } from "@/lib/quote-sheet/apply";
import { applyVinFactsToSheet } from "./apply";
import { decodeVinValues } from "./client";
import { mapVinDecodeToFacts } from "./map";
import { collectSheetVehicleVins } from "./vehicles";
import { toastForVinDecode } from "./toast";
import type { VinDecodeFact, VinDecodeSourceId } from "./types";
import { NHTSA_VPIC_LABEL } from "./types";

type FetchLike = typeof fetch;

export type VinDecodeFillBundle = ApplyFillResult & {
  sourcesUsed: VinDecodeSourceId[];
  vinsDecoded: string[];
  message: string;
  toast: string;
  status: "ok" | "no_vin" | "error";
};

/**
 * Decode every VIN on the Auto sheet and empty-only fill year / make / model / engine.
 * Reasonable rate: sequential calls; client caches per VIN.
 */
export async function orchestrateVinDecodeFill(input: {
  values: Record<string, QuoteSheetFieldValue>;
  product?: string | null;
  fetchImpl?: FetchLike;
}): Promise<VinDecodeFillBundle> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const vehicles = collectSheetVehicleVins(input.values, input.product);
  if (!vehicles.length) {
    return {
      status: "no_vin",
      values: input.values,
      filledKeys: [],
      skippedKeys: [],
      sourcesUsed: [],
      vinsDecoded: [],
      message: "No decodable VIN on the Auto sheet.",
      toast: toastForVinDecode({ filledCount: 0, skippedCount: 0 }),
    };
  }

  let values = { ...input.values };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];
  const vinsDecoded: string[] = [];
  const allFacts: VinDecodeFact[] = [];
  const errors: string[] = [];

  for (const vehicle of vehicles) {
    const decoded = await decodeVinValues(vehicle.vin, fetchImpl);
    if (!decoded.ok) {
      errors.push(decoded.message);
      continue;
    }
    vinsDecoded.push(decoded.vin);
    const facts = mapVinDecodeToFacts(decoded.values, vehicle.keys);
    allFacts.push(...facts);
    const applied = applyVinFactsToSheet(values, facts);
    values = applied.values;
    filledKeys.push(...applied.filledKeys);
    skippedKeys.push(...applied.skippedKeys);
  }

  const sourcesUsed: VinDecodeSourceId[] = vinsDecoded.length ? ["nhtsa-vpic"] : [];
  const status: VinDecodeFillBundle["status"] = vinsDecoded.length
    ? "ok"
    : errors.length
      ? "error"
      : "no_vin";

  const message = vinsDecoded.length
    ? `Decoded ${vinsDecoded.length} VIN(s) via ${NHTSA_VPIC_LABEL}; filled ${filledKeys.length}, skipped ${skippedKeys.length}.`
    : errors[0] || "NHTSA vPIC decode failed.";

  return {
    status,
    values,
    filledKeys,
    skippedKeys,
    sourcesUsed,
    vinsDecoded,
    message,
    toast: toastForVinDecode({
      filledCount: filledKeys.length,
      skippedCount: skippedKeys.length,
      vinCount: vinsDecoded.length,
    }),
  };
}
