"use client";

import { useState } from "react";
import { PackageFamilyToggle } from "@/components/deals/package-family-toggle";
import { PackageLineCheckboxes } from "@/components/deals/package-line-checkboxes";
import {
  normalizeSelectedPackageLines,
  packageFamilyOf,
  type PackageFamily,
  type PackageLine,
} from "@/lib/deals/package-lines";

function defaultsFor(family: PackageFamily): PackageLine[] {
  return family === "commercial" ? ["general_liability"] : ["home"];
}

export function NewDealCreateFields({
  initialLines,
  sourceDealId,
}: {
  initialLines: readonly PackageLine[];
  sourceDealId?: string | null;
}) {
  const [family, setFamily] = useState<PackageFamily>(() => packageFamilyOf(initialLines));
  const [packageLines, setPackageLines] = useState<PackageLine[]>(() =>
    normalizeSelectedPackageLines(initialLines),
  );

  function onFamilyChange(next: PackageFamily) {
    setFamily(next);
    setPackageLines(defaultsFor(next));
  }

  return (
    <div className="space-y-3" data-ff-new-deal-create-fields="">
      <input type="hidden" name="intent" value="new-shop" />
      {sourceDealId ? <input type="hidden" name="sourceDealId" value={sourceDealId} /> : null}
      <input type="hidden" name="packageFamily" value={family} />
      <PackageFamilyToggle family={family} onChange={onFamilyChange} />
      <PackageLineCheckboxes
        selected={packageLines}
        onChange={setPackageLines}
        idPrefix="new-deal-pkg"
        family={family}
      />
    </div>
  );
}
