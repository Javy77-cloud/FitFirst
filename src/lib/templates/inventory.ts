import { sequenceEmailTemplates } from "@/lib/campaign-sequences/catalog";
import { CAMPAIGN_EMAIL_PRESETS } from "@/lib/templates/campaign-presets";
import { SEEDED_TEMPLATE_COPY } from "@/lib/templates/copy";
import { TEMPLATE_REVISIONS, type TemplateDecision } from "@/lib/templates/revision";

export type DeskEmailInventoryRow = {
  key: string;
  name: string;
  source: string;
  subject: string;
  body: string;
  subjectEs?: string;
  bodyEs?: string;
  fires: string;
  sendPath: string;
  /** No email template reads writeLife / writeHealth. */
  healthLifeGate: "none";
  decision: TemplateDecision;
  notes: string;
};

const SEEDED_FIRES: Record<string, { fires: string; sendPath: string; notes: string }> = {
  "google-review-request": {
    fires: "Trigger closed-won-google-review: Closed Won + 4 days, emailClient on, Google send-from. Also the template id on the lead follow-up macro, which overrides this body.",
    sendPath: "scheduleWonClientEmails in src/lib/templates/schedule.ts queues a merged job. processDueEmailJobs sends that job through the connected inbox. Quick Comms and renewal cross-sell read the row through sendDeskEmail.",
    notes: "Rewrite: keep the sentences, drop the example-copy footer and the hardcoded Javier / phone close, and end on {{signature}}. First-name greeting is already there.",
  },
  "four-month-check-in": {
    fires: "Trigger closed-won-4-month-checkin: Closed Won + 4 months, emailClient on.",
    sendPath: "Same schedule queue as the review request. Nothing else fires this slug.",
    notes: "Rewrite: same sentences, {{signature}} instead of the Javier close, example footer removed.",
  },
  "renewal-awareness": {
    fires: "Triggers renewal-60 and renewal-30 share this one template. Policy expiration minus 60 days and minus 30 days. Each also opens a broker task.",
    sendPath: "schedulePolicyRenewalEmails queues the merged job. The 90/60/30 chase notes are a separate set.",
    notes: "Rewrite: same sentences, {{signature}} instead of the Javier close. One body covers both windows, which is worth knowing before the weekend send.",
  },
};

function seededRows(): DeskEmailInventoryRow[] {
  return [SEEDED_TEMPLATE_COPY.googleReview, SEEDED_TEMPLATE_COPY.checkin4mo, SEEDED_TEMPLATE_COPY.renewal].map(
    (copy) => {
      const meta = SEEDED_FIRES[copy.slug];
      return {
        key: copy.slug,
        name: copy.name,
        source: "src/lib/templates/copy.ts",
        subject: copy.subjectEn,
        body: copy.bodyEn,
        subjectEs: copy.subjectEs,
        bodyEs: copy.bodyEs,
        fires: meta.fires,
        sendPath: meta.sendPath,
        healthLifeGate: "none" as const,
        decision: TEMPLATE_REVISIONS[copy.slug].decision,
        notes: meta.notes,
      };
    },
  );
}

const SEQUENCE_META: Record<string, { fires: string; notes: string }> = {
  "seq-lead-nurture-welcome": {
    fires: "Lead nurture sequence, same day as lead created. Sequence toggle does not send.",
    notes: "Keep. Already greets {{contact_first_name}} and closes with {{signature}}.",
  },
  "seq-lead-nurture-followup": {
    fires: "Lead nurture sequence, 7 days after lead created. Sequence toggle does not send.",
    notes: "Keep. First name and signature slots are already in the body.",
  },
  "seq-quote-ready": {
    fires: "Quote follow-up sequence, 1 day after quote sent. Sequence toggle does not send.",
    notes: "Keep. Separate from the live client-quote Gmail body.",
  },
  "seq-quote-nudge": {
    fires: "Quote follow-up sequence, 7 days after quote sent. Sequence toggle does not send.",
    notes: "Keep.",
  },
  "seq-renewal-60": {
    fires: "60/30 renewal sequence, 60 days before renewal. Sequence toggle does not send.",
    notes: "Keep. Overlaps the renewal-awareness trigger and the chase note. Pick one voice before send.",
  },
  "seq-renewal-30": {
    fires: "60/30 renewal sequence, 30 days before renewal. Sequence toggle does not send.",
    notes: "Keep. Same overlap as the 60-day sequence note.",
  },
  "seq-cross-sell": {
    fires: "Cross-sell sequence, same day a household gap is spotted. Sequence toggle does not send.",
    notes: "Keep. Copy is home / auto / flood. It does not mention life or health, and it is not hidden by those toggles.",
  },
  "seq-review-ask": {
    fires: "Review ask sequence, 14 days after bind / Closed Won. Sequence toggle does not send.",
    notes: "Keep this shape. It duplicates google-review-request and the wire google-review stub. Prefer one review email.",
  },
};

function sequenceRows(): DeskEmailInventoryRow[] {
  return sequenceEmailTemplates().map((template) => {
    const meta = SEQUENCE_META[template.slug];
    return {
      key: template.slug,
      name: template.name,
      source: "src/lib/campaign-sequences/catalog.ts",
      subject: template.subject,
      body: template.body,
      fires: meta.fires,
      sendPath:
        "Seeded into email_templates for the picker. An agent can queue one through sendDeskEmail (Quick Comms or renewal cross-sell). The sequence screen itself does not send.",
      healthLifeGate: "none" as const,
      decision: TEMPLATE_REVISIONS[template.slug].decision,
      notes: meta.notes,
    };
  });
}

const CHASE_ROWS: DeskEmailInventoryRow[] = [
  {
    key: "renewal-chase-under30",
    name: "30-day renewal chase",
    source: "src/lib/renewal/chase.ts",
    subject: "We're on your renewal — {{days_phrase_lower}}",
    body: "Hi {first name}. We know your policy is renewing. Closes with “— Your FitFirst agent”.",
    fires: "Agent clicks Send 30-day note on a policy inside 30 days.",
    sendPath: "sendRenewalChase → sendDeskEmail. Remind never sends. Send now is the live Gmail path.",
    healthLifeGate: "none",
    decision: "rewrite",
    notes: "Rewrite: keep the sentences and the first-name greeting. Remove the hardcoded FitFirst close. {{signature}} is filled by the existing signature append on sendDeskEmail.",
  },
  {
    key: "renewal-chase-30to60",
    name: "60-day renewal chase",
    source: "src/lib/renewal/chase.ts",
    subject: "Watching your renewal — {{days_phrase_lower}}",
    body: "Hi {first name}. We know your policy is coming up for renewal. Closes with “— Your FitFirst agent”.",
    fires: "Agent clicks Send 60-day note (30–60 days out).",
    sendPath: "sendRenewalChase → sendDeskEmail.",
    healthLifeGate: "none",
    decision: "rewrite",
    notes: "Rewrite: same treatment as the 30-day note.",
  },
  {
    key: "renewal-chase-60to90",
    name: "90-day renewal chase",
    source: "src/lib/renewal/chase.ts",
    subject: "We know this is renewing — {{days_phrase_lower}}",
    body: "Hi {first name}. Just a note that we know your policy is renewing. Closes with “— Your FitFirst agent”.",
    fires: "Agent clicks Send 90-day note (60–90 days out).",
    sendPath: "sendRenewalChase → sendDeskEmail.",
    healthLifeGate: "none",
    decision: "rewrite",
    notes: "Rewrite: same treatment as the 30-day note.",
  },
  {
    key: "renewal-chase-90plus",
    name: "Early renewal chase",
    source: "src/lib/renewal/chase.ts",
    subject: "We know this is renewing — {{days_phrase_lower}}",
    body: "Hi {first name}. Policy is on the renewal calendar. Closes with “— Your FitFirst agent”.",
    fires: "Agent clicks the chase action when the policy is more than 90 days out. Same button label as the 90-day note.",
    sendPath: "sendRenewalChase → sendDeskEmail.",
    healthLifeGate: "none",
    decision: "rewrite",
    notes: "Rewrite: same treatment. Subject matches the 60–90 note, so the two are easy to confuse.",
  },
];

export function listDeskEmailInventory(): DeskEmailInventoryRow[] {
  const campaigns: DeskEmailInventoryRow[] = CAMPAIGN_EMAIL_PRESETS.map((preset) => ({
    key: preset.key,
    name: preset.name,
    source: "src/lib/templates/campaign-presets.ts",
    subject: preset.subject,
    body: preset.body,
    fires: `Campaigns form default for “${preset.name}”. Audience ${preset.audienceType} = ${preset.audienceValue}.`,
    sendPath:
      "upsertCampaign stores a draft. stubSendCampaign writes a would-send log through sendCampaignEmail and does not open a mailbox.",
    healthLifeGate: "none" as const,
    decision: TEMPLATE_REVISIONS[preset.key].decision,
    notes:
      preset.key === "campaign-renewal-watch"
        ? "Drop. The body says it is a placeholder. Renewal wording already lives on renewal-awareness and the chase notes."
        : preset.key === "campaign-hurricane"
          ? "Rewrite: keep the deductible sentence, delete the “No SMTP in this build” line, add a first-name greeting and {{signature}}."
          : "Rewrite: keep the wind-mit sentence, add a first-name greeting and {{signature}}.",
  }));

  const extras: DeskEmailInventoryRow[] = [
    {
      key: "client-quote",
      name: "Client quote email",
      source: "src/lib/comms/quote-delivery-store.ts",
      subject: "Your FitFirst quote",
      body: "Hi {full client name},\n\nYour quote is ready to review. Reply to this email if you want to walk through it.",
      fires: "A deal product moves into a late stage that requires a client send, and no provider message id is on the deal yet.",
      sendPath: "deliverClientQuoteEmail → sendGmailMessage. This does not go through sendDeskEmail, so the signature append there does not run until a chosen rewrite asks for {{signature}}.",
      healthLifeGate: "none",
      decision: "rewrite",
      notes: "Rewrite: first name instead of the full name, {{agency_name}} in the subject, {{signature}} in the body. Not gated: a life or health deal that reaches this stage still uses this same email. writeLife and writeHealth only hide those lines in pickers.",
    },
    {
      key: "wire-thank-you",
      name: "Closed Won thank you",
      source: "src/lib/db/seed-wire.ts",
      subject: "Thank you for binding with FitFirst",
      body: "Hung on won date. ARCHIVE must not cancel this.",
      fires: "Bind inserts a queued job: won date + 1 day, kind thank_you. The job stores no rendered subject or body.",
      sendPath: "create-policy bind loop in src/app/actions/crm.ts → email_send_jobs → processDueEmailJobs.",
      healthLifeGate: "none",
      decision: "drop",
      notes: "Drop. This is a scheduler stub, not a client letter. There is no separate thank-you body to promote.",
    },
    {
      key: "wire-google-review",
      name: "Google review ask (wire stub)",
      source: "src/lib/db/seed-wire.ts",
      subject: "How did we do?",
      body: "Review ask hung on won date, not pipeline stage.",
      fires: "Bind inserts a queued job: won date + 4 days, kind google_review. Slug google-review, not google-review-request.",
      sendPath: "Same bind loop as the thank-you stub.",
      healthLifeGate: "none",
      decision: "drop",
      notes: "Drop. The client review copy is google-review-request (and the sequence stub seq-review-ask). This row must not be what a weekend job sends.",
    },
    {
      key: "macro-lead-followup",
      name: "Mark contacted + follow-up",
      source: "src/lib/db/seed-developer-hub.ts",
      subject: "Checking in, {{record.firstName}}",
      body: "Hi {{record.firstName}} — we logged a follow-up from the desk. This stays in the outbound stub queue.",
      fires: "Manual Developer Hub macro on a lead. Skips Ana Dib. Points at the google-review template id and then replaces the body with this stub.",
      sendPath: "queueMacroEmail inserts email_send_jobs with sendFromProvider stub. It does not call Gmail.",
      healthLifeGate: "none",
      decision: "drop",
      notes: "Drop. The body tells the client it is a stub. Do not send it as-is.",
    },
  ];

  return [...seededRows(), ...sequenceRows(), ...CHASE_ROWS, ...campaigns, ...extras];
}
