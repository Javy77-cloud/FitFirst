import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";

export type AgencyBrand = {
  name: string;
  logoUrl: string | null;
  emailSignature: string;
  fiscalYearStartMonth: number;
};

export async function loadAgencyBrand(): Promise<AgencyBrand> {
  const [row] = await db
    .select()
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  const name = row?.agencyName?.trim();
  return {
    name: name || "Agency",
    logoUrl: row?.logoPath ? `/${row.logoPath.replace(/^\/+/, "")}` : null,
    emailSignature: row?.emailSignature ?? "",
    fiscalYearStartMonth: row?.fiscalYearStartMonth ?? 1,
  };
}
