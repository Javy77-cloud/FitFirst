/**
 * LOB-adaptive Overview sections — template-driven by policy line.
 * Uses existing fields when present; honest empties otherwise.
 */

import { appointmentLine } from "@/lib/domain-ams";
import { formatDay, formatMoney } from "@/lib/domain";
import { isDwellingFireProduct } from "@/lib/deals/dwelling-addresses";
import {
  ERRORS_OMISSIONS_SHORT,
  isErrorsOmissionsProduct,
  liabilityDeductible,
  liabilityLimitText,
  liabilityRetroDate,
} from "@/lib/policy/eo";
import { isResidentialHomeForm } from "@/lib/quote-sheet/home-inspections";

export type LobOverviewFamily =
  | "auto"
  | "homeowners"
  | "life"
  | "health"
  | "wc"
  | "gl"
  | "bop"
  | "other";

export type LobOverviewField = {
  key: string;
  label: string;
  value: string;
  empty: boolean;
  href?: string;
  hint?: string;
};

export type LobOverviewSection = {
  id: string;
  title: string;
  fields: LobOverviewField[];
  /** Pointer-only (e.g. mortgagee form lives on Coverage). */
  pointer?: { label: string; href: string };
};

export function resolveLobOverviewFamily(input: {
  lineOfBusiness?: string | null;
  policyType?: string | null;
  insuranceType?: string | null;
  policySubType?: string | null;
  formType?: string | null;
}): LobOverviewFamily {
  const line = appointmentLine(input.lineOfBusiness ?? "");
  const blob = [
    input.lineOfBusiness,
    input.policyType,
    input.insuranceType,
    input.policySubType,
    input.formType,
  ]
    .map((part) => (part ?? "").toLowerCase())
    .join(" ");

  if (line === "AUTO" || /\b(auto|pa|personal.?auto)\b/.test(blob)) return "auto";
  const residentialHome = [input.lineOfBusiness, input.policyType, input.policySubType, input.formType].some(
    (part) => isResidentialHomeForm(part) || isDwellingFireProduct(part),
  );
  if (line === "HO" || residentialHome || /\b(home|ho[3456]|dp[13]|homeowner)\b/.test(blob)) {
    return "homeowners";
  }
  if (line === "LIFE" || /\blife\b/.test(blob) || input.insuranceType === "Life") return "life";
  if (line === "HEALTH" || /\bhealth|medicare|marketplace\b/.test(blob) || input.insuranceType === "Health") {
    return "health";
  }
  if (line === "WC" || /\bworkers?.?comp|wc\b/.test(blob)) return "wc";
  if (line === "BOP" || /\bbop\b/.test(blob)) return "bop";
  if (line === "GL" || /\bgeneral.?liab|\bgl\b/.test(blob)) return "gl";
  if (isErrorsOmissionsProduct(input.formType, input.policySubType, input.policyType, input.lineOfBusiness)) {
    return "gl";
  }
  return "other";
}

function field(
  key: string,
  label: string,
  value: string | null | undefined,
  opts?: { href?: string; hint?: string },
): LobOverviewField {
  const trimmed = value?.toString().trim() ?? "";
  const empty = !trimmed;
  return {
    key,
    label,
    value: empty ? "—" : trimmed,
    empty,
    href: opts?.href,
    hint: empty ? opts?.hint ?? "Not on file yet." : undefined,
  };
}

function present(
  key: string,
  label: string,
  value: string | null | undefined,
): LobOverviewField | null {
  const row = field(key, label, value, { hint: "" });
  return row.empty ? null : row;
}

function limit(limits: Record<string, string> | null | undefined, ...keys: string[]): string | null {
  if (!limits) return null;
  for (const key of keys) {
    const hit = limits[key]?.trim();
    if (hit) return hit;
    const loose = Object.entries(limits).find(
      ([k, v]) => k.toLowerCase() === key.toLowerCase() && v?.trim(),
    );
    if (loose?.[1]?.trim()) return loose[1].trim();
  }
  return null;
}

export type LobOverviewInput = {
  policyId: string;
  lineOfBusiness: string;
  policyType?: string | null;
  insuranceType?: string | null;
  policySubType?: string | null;
  formType?: string | null;
  coverageA?: number | null;
  faceAmount?: string | number | null;
  coverageLimits?: Record<string, string> | null;
  premisesAddress?: string | null;
  premisesCity?: string | null;
  premisesState?: string | null;
  premisesZip?: string | null;
  yearBuilt?: number | null;
  roofYear?: number | null;
  construction?: string | null;
  typeOfResidence?: string | null;
  monthsOccupied?: string | null;
  vehicleCount?: number;
  account?: {
    wcClassCode?: string | null;
    payrollTotal?: string | number | null;
    operations?: string | null;
    operationsDescription?: string | null;
  } | null;
  beneficiaryLabel?: string | null;
  ridersLabel?: string | null;
  additionalInsuredCount?: number;
  mortgageeCount?: number;
  occupancy?: string | null;
  families?: string | null;
  dwellingType?: string | null;
  county?: string | null;
  dwellingReplacementCost?: string | null;
  personalPropertyReplacementCost?: string | null;
  mailingAddress?: string | null;
  mobileHomeUnit?: string | null;
  scheduledStructures?: string | null;
};

export function buildLobOverviewSections(input: LobOverviewInput): LobOverviewSection[] {
  const family = resolveLobOverviewFamily(input);
  const covA = input.coverageA != null ? formatMoney(input.coverageA) : null;
  const face = input.faceAmount != null && input.faceAmount !== "" ? formatMoney(input.faceAmount) : null;

  if (family === "auto") {
    return [
      {
        id: "vehicles",
        title: "Vehicles",
        fields: [
          field(
            "vehicleCount",
            "Vehicles on policy",
            input.vehicleCount != null && input.vehicleCount > 0
              ? String(input.vehicleCount)
              : null,
            { hint: "Add vehicles on this Auto policy — none listed yet." },
          ),
        ],
      },
    ];
  }

  if (family === "homeowners") {
    return [
      {
        id: "dwelling",
        title: "Dwelling",
        fields: [
          field("coverageA", "Coverage A / dwelling", covA, {
            hint: "Coverage A not keyed on this policy yet.",
          }),
          field(
            "yearBuilt",
            "Year built",
            input.yearBuilt != null ? String(input.yearBuilt) : null,
            { hint: "Year built not on the risk or Risk Profile yet." },
          ),
          field("construction", "Construction", input.construction),
          ...[
            present("occupancy", "Occupancy", input.occupancy),
            present("typeOfResidence", "Type of residence", input.typeOfResidence),
            present("monthsOccupied", "Months occupied", input.monthsOccupied),
            present(
              "roofYear",
              "Year of roof",
              input.roofYear != null ? String(input.roofYear) : null,
            ),
            present("families", "Number of families", input.families),
            present("dwellingType", "Dwelling type", input.dwellingType),
            present("county", "County", input.county),
            present("dwellingRc", "Dwelling replacement cost", input.dwellingReplacementCost),
            present(
              "personalPropertyRc",
              "Personal property replacement cost",
              input.personalPropertyReplacementCost,
            ),
            present("mailingAddress", "Mailing address", input.mailingAddress),
            present("mobileHomeUnit", "Mobile home unit", input.mobileHomeUnit),
            present("scheduledStructures", "Scheduled structures", input.scheduledStructures),
          ].filter((row): row is LobOverviewField => row != null),
        ],
      },
      {
        id: "mortgagee",
        title: "Mortgagee",
        fields: [
          field(
            "mortgageeCount",
            "Mortgagees on file",
            input.mortgageeCount != null && input.mortgageeCount > 0
              ? String(input.mortgageeCount)
              : null,
            {
              hint: "No mortgagee on this policy yet. Add the lender on Coverage.",
            },
          ),
        ],
        pointer: {
          label: "Mortgagee form lives on Coverage",
          href: `/policies/${input.policyId}?tab=coverage#mortgagee`,
        },
      },
    ];
  }

  if (family === "life") {
    return [
      {
        id: "life",
        title: "Life",
        fields: [
          field("beneficiary", "Beneficiary", input.beneficiaryLabel, {
            hint: "Beneficiary not linked yet — create/link a contact when the lender/insured names one.",
          }),
          field("faceAmount", "Face amount", face, {
            hint: "Face amount not on file.",
          }),
          field("riders", "Riders", input.ridersLabel, {
            hint: "No riders keyed. Endorsement forms land on Coverage.",
          }),
        ],
      },
    ];
  }

  if (family === "health") {
    return [
      {
        id: "health",
        title: "Health plan",
        fields: [
          field(
            "planType",
            "Plan type",
            limit(input.coverageLimits, "planType", "plan_type", "Plan type") ||
              input.policySubType ||
              input.policyType,
            { hint: "Plan type not on file." },
          ),
          field(
            "deductible",
            "Deductible",
            limit(input.coverageLimits, "deductible", "Deductible"),
            { hint: "Deductible not on file." },
          ),
          field(
            "network",
            "Network",
            limit(input.coverageLimits, "network", "Network"),
            { hint: "Network not on file." },
          ),
        ],
      },
    ];
  }

  if (family === "wc") {
    return [
      {
        id: "wc",
        title: "Workers comp",
        fields: [
          field("classCodes", "Class codes", input.account?.wcClassCode, {
            hint: "Class codes not on the business yet.",
          }),
          field(
            "payroll",
            "Payroll",
            input.account?.payrollTotal != null && input.account.payrollTotal !== ""
              ? formatMoney(input.account.payrollTotal)
              : null,
            { hint: "Payroll not on the business yet." },
          ),
          field(
            "emod",
            "Experience mod",
            limit(input.coverageLimits, "experienceMod", "experience_mod", "emod", "E-mod"),
            { hint: "Experience mod not on file." },
          ),
        ],
      },
    ];
  }

  if (family === "gl") {
    const eo = isErrorsOmissionsProduct(input.formType, input.policySubType, input.policyType);
    if (eo) {
      const retro = liabilityRetroDate(input.coverageLimits);
      return [
        {
          id: "gl",
          title: ERRORS_OMISSIONS_SHORT,
          fields: [
            field("limits", "Limits", liabilityLimitText(input.coverageLimits), {
              hint: "Liability limits not keyed yet.",
            }),
            field("deductible", "Deductible", liabilityDeductible(input.coverageLimits), {
              hint: "Deductible not on file.",
            }),
            ...(retro
              ? [field("retroDate", "Retro date", retro)]
              : []),
          ],
        },
      ];
    }
    return [
      {
        id: "gl",
        title: "General liability",
        fields: [
          field(
            "limits",
            "Limits",
            limit(
              input.coverageLimits,
              "generalAggregate",
              "eachOccurrence",
              "general_aggregate",
              "each_occurrence",
            ) ||
              (input.coverageLimits
                ? Object.entries(input.coverageLimits)
                    .filter(([, v]) => v?.trim())
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")
                : null),
            { hint: "GL limits not keyed yet." },
          ),
          field(
            "operations",
            "Operations",
            input.account?.operationsDescription || input.account?.operations,
            { hint: "Operations description not on the business yet." },
          ),
          field(
            "ai",
            "Additional insureds",
            input.additionalInsuredCount != null && input.additionalInsuredCount > 0
              ? String(input.additionalInsuredCount)
              : null,
            { hint: "No additional insureds on file. Manage on Coverage." },
          ),
        ],
        pointer: {
          label: "Additional insured form on Coverage",
          href: `/policies/${input.policyId}?tab=coverage#additional-insured`,
        },
      },
    ];
  }

  if (family === "bop") {
    return [
      {
        id: "bop",
        title: "BOP property",
        fields: [
          field(
            "building",
            "Building",
            limit(input.coverageLimits, "building", "Building", "coverageA") || covA,
            { hint: "Building limit not on file." },
          ),
          field(
            "bpp",
            "BPP",
            limit(input.coverageLimits, "bpp", "BPP", "bpp_limit", "businessPersonalProperty"),
            { hint: "Business personal property limit not on file." },
          ),
          field(
            "bi",
            "Business income",
            limit(input.coverageLimits, "businessIncome", "business_income", "BI"),
            { hint: "Business income limit not on file." },
          ),
        ],
      },
    ];
  }

  return [
    {
      id: "line",
      title: "Line details",
      fields: [
        field("line", "Line", input.lineOfBusiness || null, {
          hint: "Line of business missing on this record.",
        }),
        field("form", "Form / type", input.formType || input.policyType),
        field("coverageA", "Coverage A", covA),
        field("faceAmount", "Face amount", face),
      ],
    },
  ];
}

export function lobOverviewFamilyLabel(family: LobOverviewFamily): string {
  switch (family) {
    case "auto":
      return "Auto";
    case "homeowners":
      return "Homeowners";
    case "life":
      return "Life";
    case "health":
      return "Health";
    case "wc":
      return "Workers comp";
    case "gl":
      return "General liability";
    case "bop":
      return "BOP";
    default:
      return "Policy";
  }
}

/** Re-export formatDay for tests that assert empty-state wording only. */
export { formatDay };
