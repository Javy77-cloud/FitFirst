import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { buildSocialPulse, type SocialPulseSnapshot } from "./pulse";

export async function loadGbpMonitorPolicy(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ allow: agencySettings.allowAgentsMonitorGbp })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
    return Boolean(row?.allow);
  } catch {
    return false;
  }
}

export async function loadSocialPulse(role: "admin" | "agent"): Promise<SocialPulseSnapshot> {
  const [items, allowAgentsMonitorGbp] = await Promise.all([
    listCatalogItems(),
    loadGbpMonitorPolicy(),
  ]);
  return buildSocialPulse({
    items: items.filter((item) => item.category === "social"),
    role,
    allowAgentsMonitorGbp,
  });
}
