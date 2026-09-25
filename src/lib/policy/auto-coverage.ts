/**
 * Personal auto (PAP) coverage rows on the policy Coverage tab.
 * Limits, deductibles, and per-coverage premiums Fill writes into coverage_limits
 * and the current term's comprehensive / collision deductibles.
 */
import {
  formatAutoDollarDeductible,
  isAbsentCoverageToken,
  isAutoDollarDeductible,
  PHYS_DAM_COVERED_MARK,
} from "@/lib/extraction/gemini/auto-deductible";

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

/**
 * Gemini keys Fill must be able to write onto the PAP Coverage schedule.
 * One key per cell: limit, deductible, and premium, plus UM stacked and discounts.
 * `comprehensive_deductible` is accepted as an alias of `comp_deductible`.
 */
export const PAP_COVERAGE_FILL_KEYS = [
  "liability_bi",
  "liability_bi_premium",
  "liability_pd",
  "liability_pd_premium",
  "pip",
  "pip_deductible",
  "pip_premium",
  "med_pay",
  "med_pay_premium",
  "um_uim",
  "um_uim_premium",
  "um_pd",
  "um_pd_premium",
  "comp_deductible",
  "comp_premium",
  "collision_deductible",
  "collision_premium",
  "rental",
  "rental_premium",
  "towing",
  "towing_premium",
  "glass",
  "glass_premium",
  "um_stacked",
  "discounts",
] as const;

/** Coverage example Fill used to teach Gemini — limits only, no line premiums. */
export const PAP_COVERAGE_FILL_KEYS_BEFORE = [
  "liability_bi",
  "liability_pd",
  "um_uim",
  "pip",
  "comp_deductible",
  "collision_deductible",
] as const;

const BLANK = "—";

function show(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || BLANK;
}

function showDeductible(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return BLANK;
  return formatAutoDollarDeductible(trimmed) || BLANK;
}

/** Dollar deductible with no printed limit is covered. The schedule shows ✓. */
function showPhysDamLimit(stored: string, deductible: string): string {
  if (isAutoDollarDeductible(formatAutoDollarDeductible(deductible)) && isAbsentCoverageToken(stored)) {
    return PHYS_DAM_COVERED_MARK;
  }
  return show(stored);
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
  {
    key: "liability_bi",
    label: "Bodily injury",
    limit: ["liability_bi"],
    deductible: ["liability_bi_deductible"],
    premium: ["liability_bi_premium"],
  },
  {
    key: "liability_pd",
    label: "Property damage",
    limit: ["liability_pd"],
    deductible: ["liability_pd_deductible"],
    premium: ["liability_pd_premium"],
  },
  {
    key: "pip",
    label: "PIP",
    limit: ["pip"],
    deductible: ["pip_deductible"],
    premium: ["pip_premium"],
  },
  {
    key: "med_pay",
    label: "Medical payments",
    limit: ["med_pay"],
    deductible: ["med_pay_deductible"],
    premium: ["med_pay_premium"],
  },
  {
    key: "um_uim",
    label: "UM / UIM",
    limit: ["um_uim"],
    deductible: ["um_uim_deductible"],
    premium: ["um_uim_premium"],
  },
  {
    key: "um_pd",
    label: "UM property damage",
    limit: ["um_pd"],
    deductible: ["um_pd_deductible"],
    premium: ["um_pd_premium"],
  },
  {
    key: "comprehensive",
    label: "Comprehensive",
    limit: ["comp_limit"],
    deductible: ["comp_deductible", "comprehensive_deductible"],
    premium: ["comp_premium"],
    termDeductible: "comprehensive",
  },
  {
    key: "collision",
    label: "Collision",
    limit: ["collision_limit"],
    deductible: ["collision_deductible"],
    premium: ["collision_premium"],
    termDeductible: "collision",
  },
  {
    key: "rental",
    label: "Rental",
    limit: ["rental"],
    deductible: ["rental_deductible"],
    premium: ["rental_premium"],
  },
  {
    key: "towing",
    label: "Towing",
    limit: ["towing"],
    deductible: ["towing_deductible"],
    premium: ["towing_premium"],
  },
  {
    key: "glass",
    label: "Glass",
    limit: ["glass_limit"],
    deductible: ["glass"],
    premium: ["glass_premium"],
  },
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
    const deductible = term || (line.deductible ? limit(limits, ...line.deductible) : "");
    const storedLimit = line.limit ? limit(limits, ...line.limit) : "";
    const physDam = line.key === "comprehensive" || line.key === "collision";
    return {
      key: line.key,
      label: line.label,
      limit: physDam ? showPhysDamLimit(storedLimit, deductible) : show(storedLimit),
      deductible: line.deductible || line.termDeductible ? showDeductible(deductible) : show(""),
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
        limit: showPhysDamLimit("", compDed),
        deductible: showDeductible(compDed),
        premium: show(compPrem),
      });
    }
    if (collDed || collPrem) {
      rows.push({
        key: `vehicle_${index}_collision`,
        label: `Vehicle ${index} collision`,
        limit: showPhysDamLimit("", collDed),
        deductible: showDeductible(collDed),
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
