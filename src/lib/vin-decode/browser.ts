import { runDecodeVin } from "@/app/actions/quote-sheet";
import { decodeVinValues } from "./client";
import { isDecodableVin } from "./normalize";
import { paintSheetInputs } from "./paint";

export { paintSheetInputs };
import { isVehicleVinSheetKey } from "./vehicles";
import type { VinDecodeValues } from "./types";

export type VinFilledCell = { sheetKey: string; value: string };

export type BrowserVinDecodeResult =
  | { ok: true; toast: string; filled: VinFilledCell[]; filledCount: number }
  | { ok: false; error: string };

/** VINs currently typed on the Auto Risk Profile, including ones not saved yet. */
export function readRiskProfileVins(root?: ParentNode | null): Record<string, string> {
  if (typeof document === "undefined") return {};
  const scope = root ?? document;
  const form =
    scope instanceof Document
      ? scope.getElementById("ff-master-sheet-save")
      : scope.querySelector?.("#ff-master-sheet-save");
  if (!(form instanceof HTMLFormElement)) return {};
  const vins: Record<string, string> = {};
  const data = new FormData(form);
  for (const [key, value] of data.entries()) {
    if (typeof value !== "string" || !isVehicleVinSheetKey(key)) continue;
    if (!isDecodableVin(value)) continue;
    vins[key] = value;
  }
  return vins;
}

/**
 * Call vPIC from the browser. NHTSA sends Access-Control-Allow-Origin: *,
 * so this still works when the Vercel server cannot reach vpic.nhtsa.dot.gov.
 */
export async function recoverVinDecodeFromBrowser(input: {
  dealId: string;
  line: string;
  formVins?: Record<string, string>;
}): Promise<BrowserVinDecodeResult> {
  const formVins = input.formVins ?? readRiskProfileVins();
  const vins = [...new Set(Object.values(formVins).filter((vin) => isDecodableVin(vin)))];
  if (!vins.length) {
    return { ok: false, error: "Add a 17-character VIN on the Auto sheet first." };
  }
  const prefetched: Array<{ vin: string; values: VinDecodeValues }> = [];
  const errors: string[] = [];
  for (const vin of vins) {
    const decoded = await decodeVinValues(vin);
    if (decoded.ok) prefetched.push({ vin: decoded.vin, values: decoded.values });
    else errors.push(decoded.message);
  }
  if (!prefetched.length) {
    return { ok: false, error: errors[0] || "NHTSA vPIC decode failed" };
  }
  const applied = await runDecodeVin({
    dealId: input.dealId,
    line: input.line,
    formVins,
    prefetched,
  });
  if (!applied.ok) return applied;
  paintSheetInputs(applied.filled);
  if (errors.length && applied.filledCount === 0) {
    return { ok: false, error: errors[0] || applied.toast };
  }
  return applied;
}
