"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { runDecodeVin } from "@/app/actions/quote-sheet";
import { Button } from "@/components/ui/button";
import { flashAction } from "@/lib/flash-client";
import type { ShopLine } from "@/lib/domain";
import { DECODE_VIN_LABEL } from "@/lib/vin-decode";

/** Sheet helper: free NHTSA vPIC decode → empty-only year/make/model. */
export function DecodeVinButton({
  dealId,
  line,
}: {
  dealId: string;
  line: ShopLine;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const result = await runDecodeVin({ dealId, line });
      if (!result.ok) {
        flashAction(result.error || "Could not decode VIN", "error");
        return;
      }
      flashAction(result.toast);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decode VIN failed";
      flashAction(message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (line !== "auto") return null;

  return (
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
  );
}
