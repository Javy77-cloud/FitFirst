"use client";

import { useState } from "react";
import { PackageLineCheckboxes } from "@/components/deals/package-line-checkboxes";
import { normalizePackageLines, type PcPackageLine } from "@/lib/deals/package-lines";

export function NewDealCreateFields({
  initialLines,
  sourceDealId,
}: {
  initialLines: readonly PcPackageLine[];
  sourceDealId?: string | null;
}) {
  const [packageLines, setPackageLines] = useState<PcPackageLine[]>(() =>
    normalizePackageLines(initialLines),
  );

  return (
    <div className="space-y-3" data-ff-new-deal-create-fields="">
      <input type="hidden" name="intent" value="new-shop" />
      {sourceDealId ? <input type="hidden" name="sourceDealId" value={sourceDealId} /> : null}
      <PackageLineCheckboxes
        selected={packageLines}
        onChange={setPackageLines}
        idPrefix="new-deal-pkg"
      />
    </div>
  );
}
