"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { runDecodeVin } from "@/app/actions/quote-sheet";
import { Button } from "@/components/ui/button";
import { flashAction } from "@/lib/flash-client";
import type { ShopLine } from "@/lib/domain";
import { DECODE_VIN_LABEL } from "@/lib/vin-decode";
import { isNhtsaTransportFailure } from "@/lib/vin-decode/client";
import {
  paintSheetInputs,
  readRiskProfileVins,
  recoverVinDecodeFromBrowser,
} from "@/lib/vin-decode/browser";

/** Sheet helper: free NHTSA vPIC decode → empty-only year/make/model/body/fuel/engine. */
export function DecodeVinButton({
  dealId,
  line,
}: {
  dealId: string;
  line: ShopLine;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setBusy(true);
    setError("");
    const formVins = readRiskProfileVins();
    try {
      let result = await runDecodeVin({ dealId, line, formVins });
      if (!result.ok && isNhtsaTransportFailure(result.error)) {
        result = await recoverVinDecodeFromBrowser({ dealId, line, formVins });
      }
      if (!result.ok) {
        setError(result.error || "Could not decode VIN");
        flashAction(result.error || "Could not decode VIN", "error");
        return;
      }
      paintSheetInputs(result.filled);
      flashAction(result.toast);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Decode VIN failed";
      if (isNhtsaTransportFailure(message) || /unexpected|failed to fetch|network/i.test(message)) {
        try {
          const recovered = await recoverVinDecodeFromBrowser({ dealId, line, formVins });
          if (recovered.ok) {
            paintSheetInputs(recovered.filled);
            flashAction(recovered.toast);
            router.refresh();
            return;
          }
          setError(recovered.error);
          flashAction(recovered.error, "error");
          return;
        } catch {
          /* fall through to the original message */
        }
      }
      setError(message);
      flashAction(message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (line !== "auto") return null;

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="xs"
        variant="outline"
        disabled={busy}
        onClick={() => void onClick()}
        className="h-5 self-start px-1.5 text-[10px] font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-sm"
        data-ff-decode-vin-btn=""
        title="Decode VIN via free NHTSA vPIC (empty cells only)"
      >
        {busy ? "…" : DECODE_VIN_LABEL}
      </Button>
      {error ? (
        <p className="text-[10px] leading-snug text-destructive" data-ff-decode-vin-error="" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
