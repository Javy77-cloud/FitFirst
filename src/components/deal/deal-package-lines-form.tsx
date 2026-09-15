"use client";

import { useState } from "react";
import { setDealPackageLines } from "@/app/actions/quote-sheet";
import { PackageLineCheckboxes } from "@/components/deals/package-line-checkboxes";
import {
  normalizeSelectedPackageLines,
  packageFamilyOf,
  type PackageLine,
} from "@/lib/deals/package-lines";

export function DealPackageLinesForm({
  dealId,
  selected,
  activeLine,
  tab,
}: {
  dealId: string;
  selected: readonly PackageLine[];
  activeLine?: string | null;
  tab?: string | null;
}) {
  const family = packageFamilyOf(selected);
  const [lines, setLines] = useState<PackageLine[]>(() => normalizeSelectedPackageLines(selected));

  return (
    <form action={setDealPackageLines} className="mt-2" data-ff-deal-package-edit="">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="currentLine" value={activeLine ?? ""} />
      <input type="hidden" name="tab" value={tab ?? ""} />
      <PackageLineCheckboxes
        selected={lines}
        onChange={setLines}
        idPrefix={`deal-${dealId}-pkg`}
        family={family}
      />
      <button
        type="submit"
        className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
        data-ff-deal-package-save=""
      >
        Update package lines
      </button>
    </form>
  );
}
