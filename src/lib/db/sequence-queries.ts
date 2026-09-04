import { and, eq } from "drizzle-orm";
import { INSURANCE_SEQUENCES } from "@/lib/campaign-sequences/catalog";
import { SEQUENCE_SLUGS } from "@/lib/campaign-sequences/types";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { CAMPAIGN_SEQUENCE_IDS } from "@/lib/fixtures/ids";
import { db } from "./index";
import { campaignSequences } from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

const SEQUENCE_ID_BY_SLUG: Record<string, string> = {
  lead_nurture: CAMPAIGN_SEQUENCE_IDS.leadNurture,
  quote_follow_up: CAMPAIGN_SEQUENCE_IDS.quoteFollowUp,
  renewal_60_30: CAMPAIGN_SEQUENCE_IDS.renewal6030,
  cross_sell: CAMPAIGN_SEQUENCE_IDS.crossSell,
  review_ask: CAMPAIGN_SEQUENCE_IDS.reviewAsk,
};

export async function ensureCampaignSequences() {
  const existing = await db
    .select({ slug: campaignSequences.slug })
    .from(campaignSequences)
    .where(eq(campaignSequences.tenantId, tenant()));
  const have = new Set(existing.map((row) => row.slug));
  const missing = INSURANCE_SEQUENCES.filter((sequence) => !have.has(sequence.slug));
  if (missing.length === 0) return;
  await db
    .insert(campaignSequences)
    .values(
      missing.map((sequence) => ({
        id: SEQUENCE_ID_BY_SLUG[sequence.slug],
        tenantId: tenant(),
        slug: sequence.slug,
        name: sequence.name,
        summary: sequence.summary,
        audience: sequence.audience,
        anchor: sequence.anchor,
        enabled: true,
        steps: [...sequence.steps],
      })),
    )
    .onConflictDoNothing();
}

export async function listCampaignSequences() {
  try {
    await ensureCampaignSequences();
    const rows = await db
      .select()
      .from(campaignSequences)
      .where(eq(campaignSequences.tenantId, tenant()));
    const order = new Map(SEQUENCE_SLUGS.map((slug, index) => [slug, index]));
    return rows.sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/campaign_sequences|42P01|does not exist/i.test(message)) return [];
    throw error;
  }
}

export async function getCampaignSequence(id: string) {
  const [row] = await db
    .select()
    .from(campaignSequences)
    .where(and(eq(campaignSequences.tenantId, tenant()), eq(campaignSequences.id, id)));
  return row ?? null;
}
