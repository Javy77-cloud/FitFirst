import { INSURANCE_SEQUENCES, sequenceEmailTemplates } from "@/lib/campaign-sequences/catalog";
import { db } from "./index";
import { campaignSequences, emailTemplates } from "./schema";
import {
  CAMPAIGN_SEQUENCE_IDS,
  SEQUENCE_TEMPLATE_IDS,
  TENANT_ID,
} from "../fixtures/ids";

const SEQUENCE_ID_BY_SLUG: Record<(typeof INSURANCE_SEQUENCES)[number]["slug"], string> = {
  lead_nurture: CAMPAIGN_SEQUENCE_IDS.leadNurture,
  quote_follow_up: CAMPAIGN_SEQUENCE_IDS.quoteFollowUp,
  renewal_60_30: CAMPAIGN_SEQUENCE_IDS.renewal6030,
  cross_sell: CAMPAIGN_SEQUENCE_IDS.crossSell,
  review_ask: CAMPAIGN_SEQUENCE_IDS.reviewAsk,
};

const TEMPLATE_ID_BY_SLUG: Record<string, string> = {
  "seq-lead-nurture-welcome": SEQUENCE_TEMPLATE_IDS.leadNurtureWelcome,
  "seq-lead-nurture-followup": SEQUENCE_TEMPLATE_IDS.leadNurtureFollowup,
  "seq-quote-ready": SEQUENCE_TEMPLATE_IDS.quoteReady,
  "seq-quote-nudge": SEQUENCE_TEMPLATE_IDS.quoteNudge,
  "seq-renewal-60": SEQUENCE_TEMPLATE_IDS.renewal60,
  "seq-renewal-30": SEQUENCE_TEMPLATE_IDS.renewal30,
  "seq-cross-sell": SEQUENCE_TEMPLATE_IDS.crossSell,
  "seq-review-ask": SEQUENCE_TEMPLATE_IDS.reviewAsk,
};

export async function seedCampaignSequences() {
  await db
    .insert(campaignSequences)
    .values(
      INSURANCE_SEQUENCES.map((sequence) => ({
        id: SEQUENCE_ID_BY_SLUG[sequence.slug],
        tenantId: TENANT_ID,
        slug: sequence.slug,
        name: sequence.name,
        summary: sequence.summary,
        audience: sequence.audience,
        anchor: sequence.anchor,
        enabled: true,
        steps: [...sequence.steps],
      })),
    )
    .onConflictDoNothing({ target: campaignSequences.id });

  const templates = sequenceEmailTemplates();
  await db
    .insert(emailTemplates)
    .values(
      templates.map((template) => ({
        id: TEMPLATE_ID_BY_SLUG[template.slug],
        tenantId: TENANT_ID,
        slug: template.slug,
        name: template.name,
        subject: template.subject,
        body: template.body,
        locale: "en",
      })),
    )
    .onConflictDoNothing({ target: emailTemplates.id });
}
