import { and, eq, or, isNull } from "drizzle-orm";
import { AGENCY_BRAND, DEFAULT_TENANT_ID, defaultColumnLayout } from "@/lib/domain";
import { getDeskActor } from "@/lib/brand/desk-role";
import { resolveUiPrefs, type ResolvedUiPrefs } from "@/lib/brand/resolve";
import { db } from "./index";
import { agencyBrand, agentUiPrefs, emailSignatures } from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function getAgencyBrand() {
  const [row] = await db
    .select()
    .from(agencyBrand)
    .where(eq(agencyBrand.tenantId, tenant()));
  return row ?? null;
}

export async function getDefaultSignature() {
  const [row] = await db
    .select()
    .from(emailSignatures)
    .where(
      and(
        eq(emailSignatures.tenantId, tenant()),
        eq(emailSignatures.isDefault, true),
        or(eq(emailSignatures.approvalStatus, "live"), isNull(emailSignatures.approvalStatus)),
      ),
    );
  if (row) return row;
  const [any] = await db
    .select()
    .from(emailSignatures)
    .where(eq(emailSignatures.tenantId, tenant()));
  return any ?? null;
}

export async function listEmailSignatures() {
  return db.select().from(emailSignatures).where(eq(emailSignatures.tenantId, tenant()));
}

export async function getAgentPrefs(actorKey: string) {
  const [row] = await db
    .select()
    .from(agentUiPrefs)
    .where(and(eq(agentUiPrefs.tenantId, tenant()), eq(agentUiPrefs.actorKey, actorKey)));
  return row ?? null;
}

export async function getResolvedDesk(): Promise<
  ResolvedUiPrefs & { actor: Awaited<ReturnType<typeof getDeskActor>>; isAdmin: boolean }
> {
  const actor = await getDeskActor();
  const [brand, prefs] = await Promise.all([
    getAgencyBrand(),
    getAgentPrefs(actor.key),
  ]);
  return {
    ...resolveUiPrefs(brand, prefs),
    actor,
    isAdmin: actor.role === "admin",
  };
}

export function emptyBrandFallback() {
  return {
    agencyName: AGENCY_BRAND.name,
    logoUrl: null as string | null,
    colorPreset: "agency" as const,
    fontPreset: "plex" as const,
    density: "comfortable" as const,
    columnLayout: defaultColumnLayout(),
    colorSource: "agency" as const,
  };
}
