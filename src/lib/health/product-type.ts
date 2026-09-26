/**
 * Marketplace medical, standalone dental, and vision are separate products.
 * Dedup stays inside one product type.
 */

export const HEALTH_PRODUCT_TYPES = ["medical", "dental", "vision"] as const;
export type HealthProductType = (typeof HEALTH_PRODUCT_TYPES)[number];

export type HealthProductInput = {
  lineOfBusiness?: string | null;
  insuranceType?: string | null;
  policyType?: string | null;
  policySubType?: string | null;
  sourceProduct?: string | null;
  planType?: string | null;
  /** Explicit product when the agent or payload already classified it. */
  productType?: string | null;
};

function classifyToken(value: string | null | undefined): HealthProductType | null {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (/\bdental\b/.test(text)) return "dental";
  if (/\bvision\b/.test(text)) return "vision";
  if (
    /\b(medical|marketplace|medicare|medigap|mapd|health_ma|health_marketplace|aca)\b/.test(text)
  ) {
    return "medical";
  }
  return null;
}

export function isHealthProductType(value: string | null | undefined): value is HealthProductType {
  return (HEALTH_PRODUCT_TYPES as readonly string[]).includes(value ?? "");
}

/**
 * Dental and vision win over a generic Health line.
 * A HEALTH line with no finer type is marketplace medical.
 */
export function healthProductType(input: HealthProductInput): HealthProductType | null {
  const ordered = [
    input.productType,
    input.sourceProduct,
    input.policySubType,
    input.planType,
    input.policyType,
    input.insuranceType,
  ];
  for (const token of ordered) {
    const hit = classifyToken(token);
    if (hit) return hit;
  }
  const line = `${input.lineOfBusiness ?? ""} ${input.insuranceType ?? ""}`.toLowerCase();
  if (line.includes("health")) return "medical";
  return null;
}

export function healthProductsAreDistinct(
  left: HealthProductType | null,
  right: HealthProductType | null,
): boolean {
  return left != null && right != null && left !== right;
}
