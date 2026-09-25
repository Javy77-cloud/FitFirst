/**
 * Personal auto (PAP) coverage rows on the policy Coverage tab.
 * Liability, PIP, medical payments, and UM are policy-wide.
 * Comprehensive, collision, rental, towing, and glass are per vehicle.
 */
import {
  formatAutoDollarDeductible,
  isAbsentCoverageToken,
  isAutoDollarDeductible,
  PHYS_DAM_COVERED_MARK,
  physDamLimitForDeductible,
} from "@/lib/extraction/gemini/auto-deductible";

export type AutoCoverageSource = {
  coverageLimits?: Record<string, string> | null;
  comprehensiveDeductible?: string | null;
  collisionDeductible?: string | null;
  vehicles?: AutoCoverageVehicle[] | null;
};

export type AutoCoverageVehicle = {
  id?: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
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

export type AutoCoverageSection = {
  key: string;
  heading: string;
  rows: AutoCoverageRow[];
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
const NONE = "None";

/** Vehicles overview: checkmark when that car has the coverage, otherwise None. */
export function physicalDamageOverviewMark(raw: string | null | undefined): "✓" | "None" {
  const formatted = formatAutoDollarDeductible(String(raw ?? ""));
  if (
    isAutoDollarDeductible(formatted) ||
    formatted === PHYS_DAM_COVERED_MARK ||
    /^(yes|y|included|full|acv|actual cash value)$/i.test(formatted)
  ) {
    return PHYS_DAM_COVERED_MARK;
  }
  return NONE;
}

export function autoVehicleHeading(vehicle: AutoCoverageVehicle): string {
  const name = [vehicle.year, vehicle.make, vehicle.model]
    .filter((part) => part != null && String(part).trim() !== "")
    .join(" ");
  const vin = vehicle.vin?.trim() ?? "";
  if (name && vin) return `Vehicle: ${name} — VIN ${vin}`;
  if (vin) return `Vehicle: VIN ${vin}`;
  if (name) return `Vehicle: ${name}`;
  return "Vehicle";
}

function show(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || BLANK;
}

function limitOf(limits: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const hit = limits[key]?.trim();
    if (hit) return hit;
  }
  return "";
}

/** First real value. Explicit None only wins when nothing else was printed. */
function firstCoverage(...values: Array<string | null | undefined>): string {
  let sawNone = false;
  for (const value of values) {
    const text = value?.trim() ?? "";
    if (!text || text === BLANK || text === "-") continue;
    if (isAbsentCoverageToken(text)) {
      sawNone = true;
      continue;
    }
    return text;
  }
  return sawNone ? NONE : "";
}

function presentDeductible(raw: string, absent: "—" | "None"): string {
  const text = raw.trim();
  if (!text || text === BLANK || text === "-") return absent;
  if (isAbsentCoverageToken(text)) return NONE;
  return formatAutoDollarDeductible(text) || absent;
}

function presentMoney(raw: string, absent: "—" | "None"): string {
  const text = raw.trim();
  if (!text || text === BLANK || text === "-") return absent;
  if (isAbsentCoverageToken(text)) return NONE;
  return text;
}

const POLICY_LINES: Array<{
  key: string;
  label: string;
  limit: string[];
  deductible: string[];
  premium: string[];
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
];

type VehicleLine = {
  key: string;
  label: string;
  read: (
    index: number,
    vehicle: AutoCoverageVehicle | undefined,
    limits: Record<string, string>,
    source: AutoCoverageSource,
  ) => {
    limit: string;
    deductible: string;
    premium: string;
  };
};

function vehicleKeys(index: number, ...suffixes: string[]): string[] {
  return suffixes.map((suffix) => `vehicle_${index}_${suffix}`);
}

const VEHICLE_LINES: VehicleLine[] = [
  {
    key: "comprehensive",
    label: "Comprehensive",
    read: (index, vehicle, limits, source) => {
      const deductible = firstCoverage(
        vehicle?.comprehensiveDeductible,
        ...vehicleKeys(index, "comp_deductible", "comprehensive").map((key) => limits[key]),
        index === 1 ? limits.comp_deductible : "",
        index === 1 ? limits.comprehensive_deductible : "",
        index === 1 ? source.comprehensiveDeductible : "",
      );
      const explicit = firstCoverage(
        ...vehicleKeys(index, "comp_limit").map((key) => limits[key]),
        index === 1 ? limits.comp_limit : "",
      );
      return {
        limit: physDamLimitForDeductible(explicit, deductible),
        deductible,
        premium: firstCoverage(
          ...vehicleKeys(index, "comp_premium").map((key) => limits[key]),
          index === 1 ? limits.comp_premium : "",
        ),
      };
    },
  },
  {
    key: "collision",
    label: "Collision",
    read: (index, vehicle, limits, source) => {
      const deductible = firstCoverage(
        vehicle?.collisionDeductible,
        ...vehicleKeys(index, "collision_deductible", "collision").map((key) => limits[key]),
        index === 1 ? limits.collision_deductible : "",
        index === 1 ? source.collisionDeductible : "",
      );
      const explicit = firstCoverage(
        ...vehicleKeys(index, "collision_limit").map((key) => limits[key]),
        index === 1 ? limits.collision_limit : "",
      );
      return {
        limit: physDamLimitForDeductible(explicit, deductible),
        deductible,
        premium: firstCoverage(
          ...vehicleKeys(index, "collision_premium").map((key) => limits[key]),
          index === 1 ? limits.collision_premium : "",
        ),
      };
    },
  },
  {
    key: "rental",
    label: "Rental",
    read: (index, _vehicle, limits) => ({
      limit: firstCoverage(
        ...vehicleKeys(index, "rental").map((key) => limits[key]),
        index === 1 ? limits.rental : "",
      ),
      deductible: firstCoverage(
        ...vehicleKeys(index, "rental_deductible").map((key) => limits[key]),
        index === 1 ? limits.rental_deductible : "",
      ),
      premium: firstCoverage(
        ...vehicleKeys(index, "rental_premium").map((key) => limits[key]),
        index === 1 ? limits.rental_premium : "",
      ),
    }),
  },
  {
    key: "towing",
    label: "Towing",
    read: (index, _vehicle, limits) => ({
      limit: firstCoverage(
        ...vehicleKeys(index, "towing").map((key) => limits[key]),
        index === 1 ? limits.towing : "",
        index === 1 ? limits.ers : "",
      ),
      deductible: firstCoverage(
        ...vehicleKeys(index, "towing_deductible").map((key) => limits[key]),
        index === 1 ? limits.towing_deductible : "",
      ),
      premium: firstCoverage(
        ...vehicleKeys(index, "towing_premium").map((key) => limits[key]),
        index === 1 ? limits.towing_premium : "",
      ),
    }),
  },
  {
    key: "glass",
    label: "Glass",
    read: (index, _vehicle, limits) => ({
      limit: firstCoverage(
        ...vehicleKeys(index, "glass_limit").map((key) => limits[key]),
        index === 1 ? limits.glass_limit : "",
      ),
      deductible: firstCoverage(
        ...vehicleKeys(index, "glass").map((key) => limits[key]),
        index === 1 ? limits.glass : "",
      ),
      premium: firstCoverage(
        ...vehicleKeys(index, "glass_premium").map((key) => limits[key]),
        index === 1 ? limits.glass_premium : "",
      ),
    }),
  },
];

/** Policy-wide coverages. The same limits apply to every vehicle on the policy. */
export function autoCoverageSchedule(source: AutoCoverageSource): AutoCoverageRow[] {
  const limits = source.coverageLimits ?? {};
  return POLICY_LINES.map((line) => ({
    key: line.key,
    label: line.label,
    limit: show(limitOf(limits, ...line.limit)),
    deductible: presentDeductible(limitOf(limits, ...line.deductible), BLANK),
    premium: show(limitOf(limits, ...line.premium)),
  }));
}

function vehicleSection(
  source: AutoCoverageSource,
  index: number,
  vehicle: AutoCoverageVehicle | undefined,
): AutoCoverageSection {
  const limits = source.coverageLimits ?? {};
  const heading = vehicle ? autoVehicleHeading(vehicle) : index === 1 ? "Vehicle" : `Vehicle: ${index}`;
  return {
    key: vehicle?.id || vehicle?.vin || `vehicle-${index}`,
    heading,
    rows: VEHICLE_LINES.map((line) => {
      const read = line.read(index, vehicle, limits, source);
      const physical = line.key === "comprehensive" || line.key === "collision";
      return {
        key: `${index}:${line.key}`,
        label: line.label,
        limit: physical ? read.limit || NONE : presentMoney(read.limit, NONE),
        deductible: presentDeductible(read.deductible, NONE),
        premium: presentMoney(read.premium, NONE),
      };
    }),
  };
}

function prefixedPhysical(limits: Record<string, string>, index: number): boolean {
  return Object.keys(limits).some((key) => key.startsWith(`vehicle_${index}_`));
}

function vehicleOnePhysical(source: AutoCoverageSource): boolean {
  const limits = source.coverageLimits ?? {};
  return Boolean(
    source.comprehensiveDeductible?.trim() ||
      source.collisionDeductible?.trim() ||
      limits.comp_deductible ||
      limits.collision_deductible ||
      limits.comp_premium ||
      limits.collision_premium ||
      limits.rental ||
      limits.towing ||
      limits.ers ||
      limits.glass ||
      limits.glass_limit ||
      prefixedPhysical(limits, 1),
  );
}

/** One labeled block per vehicle. Physical damage that is missing is None, not a dash. */
export function autoVehicleCoverageBlocks(source: AutoCoverageSource): AutoCoverageSection[] {
  const listed = source.vehicles ?? [];
  if (listed.length > 0) {
    return listed.map((vehicle, index) => vehicleSection(source, index + 1, vehicle));
  }
  const limits = source.coverageLimits ?? {};
  const blocks: AutoCoverageSection[] = [];
  if (vehicleOnePhysical(source)) blocks.push(vehicleSection(source, 1, undefined));
  for (let index = 2; index <= 4; index += 1) {
    if (prefixedPhysical(limits, index)) blocks.push(vehicleSection(source, index, undefined));
  }
  return blocks;
}

export function autoCoverageExtras(source: AutoCoverageSource): AutoCoverageExtra[] {
  const limits = source.coverageLimits ?? {};
  return [
    { key: "um_stacked", label: "UM stacked", value: show(limits.um_stacked) },
    { key: "discounts", label: "Discounts", value: show(limits.discounts) },
  ];
}
