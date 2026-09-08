"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { runComputeMilesToCoast } from "@/app/actions/quote-sheet";
import { Button } from "@/components/ui/button";
import { flashAction } from "@/lib/flash-client";
import type { ShopLine } from "@/lib/domain";

/** Sheet helper: recalculate free INTERNAL miles_to_coast onto the Home master sheet. */
export function MilesToCoastButton({
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
      const result = await runComputeMilesToCoast({ dealId, line });
      if (!result.ok) {
        flashAction(result.error || "Could not compute miles to coast", "error");
        return;
      }
      flashAction(`Miles to coast: ${result.miles}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Miles to coast failed";
      flashAction(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      disabled={busy}
      onClick={() => void onClick()}
      className="h-5 self-start px-1.5 text-[10px] font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-sm"
      data-ff-miles-to-coast-btn=""
      title="Recalculate miles to Florida coast (free shoreline geometry)"
    >
      {busy ? "…" : "Calc coast"}
    </Button>
  );
}
