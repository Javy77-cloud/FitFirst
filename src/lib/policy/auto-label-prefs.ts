import { eq, and, isNotNull, ne, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings, policies } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import {
  DEFAULT_POLICY_LABEL_TEMPLATE,
  normalizePolicyLabelTemplate,
  type PolicyLabelTemplate,
} from "@/lib/policy/auto-label";

export async function getAgencyPolicyLabelTemplate(): Promise<PolicyLabelTemplate> {
  try {
    const [row] = await db
      .select({ policyLabelTemplate: agencySettings.policyLabelTemplate })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1);
    return normalizePolicyLabelTemplate(row?.policyLabelTemplate ?? null);
  } catch {
    return {
      fields: [...DEFAULT_POLICY_LABEL_TEMPLATE.fields],
      separator: DEFAULT_POLICY_LABEL_TEMPLATE.separator,
    };
  }
}

export async function saveAgencyPolicyLabelTemplate(
  template: PolicyLabelTemplate | null,
): Promise<PolicyLabelTemplate> {
  const next =
    template == null
      ? null
      : normalizePolicyLabelTemplate(template);
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
    .limit(1);
  if (existing) {
    await db
      .update(agencySettings)
      .set({ policyLabelTemplate: next, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      policyLabelTemplate: next,
    });
  }
  return next ?? {
    fields: [...DEFAULT_POLICY_LABEL_TEMPLATE.fields],
    separator: DEFAULT_POLICY_LABEL_TEMPLATE.separator,
  };
}

/** Default false — rename stays off the policy record until Admin enables it. */
export async function getAllowPolicyLabelOverride(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ allow: agencySettings.allowPolicyLabelOverride })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1);
    return Boolean(row?.allow);
  } catch {
    return false;
  }
}

export async function saveAllowPolicyLabelOverride(allow: boolean): Promise<boolean> {
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
    .limit(1);
  if (existing) {
    await db
      .update(agencySettings)
      .set({ allowPolicyLabelOverride: allow, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      allowPolicyLabelOverride: allow,
    });
  }
  return allow;
}

export async function countPolicyLabelOverrides(): Promise<number> {
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(policies)
      .where(
        and(
          eq(policies.tenantId, DEFAULT_TENANT_ID),
          isNotNull(policies.labelOverride),
          ne(policies.labelOverride, ""),
        ),
      );
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function clearAllPolicyLabelOverrides(): Promise<number> {
  const rows = await db
    .select({ id: policies.id })
    .from(policies)
    .where(
      and(
        eq(policies.tenantId, DEFAULT_TENANT_ID),
        isNotNull(policies.labelOverride),
        ne(policies.labelOverride, ""),
      ),
    );
  if (rows.length === 0) return 0;
  await db
    .update(policies)
    .set({ labelOverride: null, updatedAt: new Date() })
    .where(
      and(
        eq(policies.tenantId, DEFAULT_TENANT_ID),
        isNotNull(policies.labelOverride),
        ne(policies.labelOverride, ""),
      ),
    );
  return rows.length;
}
