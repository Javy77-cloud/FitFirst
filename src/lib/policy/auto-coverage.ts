/**
 * Personal auto (PAP) coverage rows on the policy Coverage tab.
 * Limits, deductibles, and per-coverage premiums Fill writes into coverage_limits
 * and the current term's comprehensive / collision deductibles.
 */

export type AutoCoverageSource = {
  coverageLimits?: Record<string, string> | null;
  comprehensiveDeductible?: string | null;
  collisionDeductible?: string | null;
};

export type AutoCoverageRow = {
  key: string;
  label: string;
  limit: string;
  deductible: string;
  premium: string;
};

export type AutoCoverageExtra = {
  key: string;
  label: string;
  value: string;
};

const BLANK = "—";

function show(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || BLANK;
}

function limit(limits: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const hit = limits[key]?.trim();
    if (hit) return hit;
  }
  return "";
}

const LINES: Array<{
  key: string;
  label: string;
  limit?: string[];
  deductible?: string[];
  premium?: string[];
  termDeductible?: "comprehensive" | "collision";
}> = [
  { key: "liability_bi", label: "Bodily injury", limit: ["liability_bi"], premium: ["liability_bi_premium"] },
  { key: "liability_pd", label: "Property damage", limit: ["liability_pd"], premium: ["liability_pd_premium"] },
  {
    key: "pip",
    label: "PIP",
    limit: ["pip"],
    deductible: ["pip_deductible"],
    premium: ["pip_premium"],
  },
  { key: "med_pay", label: "Medical payments", limit: ["med_pay"], premium: ["med_pay_premium"] },
  { key: "um_uim", label: "UM / UIM", limit: ["um_uim"], premium: ["um_uim_premium"] },
  { key: "um_pd", label: "UM property damage", limit: ["um_pd"], premium: ["um_pd_premium"] },
  {
    key: "comprehensive",
    label: "Comprehensive",
    deductible: ["comp_deductible", "comprehensive_deductible"],
    premium: ["comp_premium"],
    termDeductible: "comprehensive",
  },
  {
    key: "collision",
    label: "Collision",
    deductible: ["collision_deductible"],
    premium: ["collision_premium"],
    termDeductible: "collision",
  },
  { key: "rental", label: "Rental", limit: ["rental"], premium: ["rental_premium"] },
  { key: "towing", label: "Towing", limit: ["towing"], premium: ["towing_premium"] },
  { key: "glass", label: "Glass", deductible: ["glass"], premium: ["glass_premium"] },
];

export function autoCoverageSchedule(source: AutoCoverageSource): AutoCoverageRow[] {
  const limits = source.coverageLimits ?? {};
  const rows: AutoCoverageRow[] = LINES.map((line) => {
    const term =
      line.termDeductible === "comprehensive"
        ? source.comprehensiveDeductible
        : line.termDeductible === "collision"
          ? source.collisionDeductible
          : "";
    return {
      key: line.key,
      label: line.label,
      limit: show(line.limit ? limit(limits, ...line.limit) : ""),
      deductible: show(term || (line.deductible ? limit(limits, ...line.deductible) : "")),
      premium: show(line.premium ? limit(limits, ...line.premium) : ""),
    };
  });

  for (let index = 2; index <= 4; index += 1) {
    const compDed = limit(limits, `vehicle_${index}_comprehensive`, `vehicle_${index}_comp_deductible`);
    const compPrem = limit(limits, `vehicle_${index}_comp_premium`);
    const collDed = limit(limits, `vehicle_${index}_collision`, `vehicle_${index}_collision_deductible`);
    const collPrem = limit(limits, `vehicle_${index}_collision_premium`);
    if (compDed || compPrem) {
      rows.push({
        key: `vehicle_${index}_comprehensive`,
        label: `Vehicle ${index} comprehensive`,
        limit: BLANK,
        deductible: show(compDed),
        premium: show(compPrem),
      });
    }
    if (collDed || collPrem) {
      rows.push({
        key: `vehicle_${index}_collision`,
        label: `Vehicle ${index} collision`,
        limit: BLANK,
        deductible: show(collDed),
        premium: show(collPrem),
      });
    }
  }
  return rows;
}

export function autoCoverageExtras(source: AutoCoverageSource): AutoCoverageExtra[] {
  const limits = source.coverageLimits ?? {};
  return [
    { key: "um_stacked", label: "UM stacked", value: show(limits.um_stacked) },
    { key: "discounts", label: "Discounts", value: show(limits.discounts) },
  ];
}
