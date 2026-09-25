/**
 * Weekend wording switch for desk email.
 *
 * Every row starts as draft. Draft leaves the current subject and body on the
 * existing send path. Set status to "chosen" after the wording is accepted.
 * This module does not send mail.
 */

export type TemplateDecision = "keep" | "drop" | "rewrite";
export type TemplateRevisionStatus = "draft" | "chosen";

export type TemplateRevision = {
  decision: TemplateDecision;
  status: TemplateRevisionStatus;
  subject?: string;
  body?: string;
  subjectEs?: string;
  bodyEs?: string;
};

export const MACRO_LEAD_FOLLOWUP_KEY = "macro-lead-followup";
export const MACRO_LEAD_FOLLOWUP_SUBJECT = "Checking in, {{record.firstName}}";

const REVIEW_EN_BODY = `Hi {{contact_first_name}},

It's Javier with {{agency_name}}. Thanks for trusting us with your {{policy_type}}. If we earned it, would you leave a short Google review? {{review_link}}

{{signature}}`;

const REVIEW_ES_BODY = `Hola {{contact_first_name}},

Soy Javier de {{agency_name}}. Gracias por confiar en nosotros con tu {{policy_type}}. Si te pareció bien el servicio, ¿nos dejas una reseña corta en Google? {{review_link}}

{{signature}}`;

const CHECKIN_EN_BODY = `Hi {{contact_first_name}},

You've been my client at {{agency_name}} for four months now (since {{won_date}}). Is everything okay with your {{policy_type}}? If something changed or you need a hand, call or text me.

{{signature}}`;

const CHECKIN_ES_BODY = `Hola {{contact_first_name}},

Ya llevas cuatro meses como cliente de {{agency_name}} (desde {{won_date}}). ¿Todo bien con tu {{policy_type}}? Si cambió algo o te puedo ayudar, llámame o mándame un mensaje.

{{signature}}`;

const RENEWAL_EN_BODY = `Hi {{contact_first_name}},

I know your {{policy_type}} renewal is coming. I will be in touch well before it so we can look at options together. No action needed from you today.

{{signature}}`;

const RENEWAL_ES_BODY = `Hola {{contact_first_name}},

Sé que se acerca la renovación de tu {{policy_type}}. Te voy a escribir con tiempo para revisar opciones juntos. Hoy no tienes que hacer nada.

{{signature}}`;

function chaseBody(middle: string): string {
  return `Hi {{contact_first_name}},

${middle}

{{signature}}`;
}

export const TEMPLATE_REVISIONS: Record<string, TemplateRevision> = {
  "google-review-request": {
    decision: "rewrite",
    status: "draft",
    subject: "Quick Google review? — {{agency_name}}",
    subjectEs: "¿Una reseña rápida en Google? — {{agency_name}}",
    body: REVIEW_EN_BODY,
    bodyEs: REVIEW_ES_BODY,
  },
  "four-month-check-in": {
    decision: "rewrite",
    status: "draft",
    subject: "You've been my client for four months — {{agency_name}}",
    subjectEs: "Llevas cuatro meses como cliente — {{agency_name}}",
    body: CHECKIN_EN_BODY,
    bodyEs: CHECKIN_ES_BODY,
  },
  "renewal-awareness": {
    decision: "rewrite",
    status: "draft",
    subject: "I know your renewal is coming — {{agency_name}}",
    subjectEs: "Sé que se acerca tu renovación — {{agency_name}}",
    body: RENEWAL_EN_BODY,
    bodyEs: RENEWAL_ES_BODY,
  },
  "seq-lead-nurture-welcome": { decision: "keep", status: "draft" },
  "seq-lead-nurture-followup": { decision: "keep", status: "draft" },
  "seq-quote-ready": { decision: "keep", status: "draft" },
  "seq-quote-nudge": { decision: "keep", status: "draft" },
  "seq-renewal-60": { decision: "keep", status: "draft" },
  "seq-renewal-30": { decision: "keep", status: "draft" },
  "seq-cross-sell": { decision: "keep", status: "draft" },
  "seq-review-ask": { decision: "keep", status: "draft" },
  "renewal-chase-under30": {
    decision: "rewrite",
    status: "draft",
    subject: "We're on your renewal — {{days_phrase_lower}}",
    body: chaseBody(
      "We know your policy{{policy_bit}} is renewing. {{days_phrase}}. We are watching it and working more quotes if we need them.\n\nNo action needed unless something changed — reply here and we will handle it.",
    ),
  },
  "renewal-chase-30to60": {
    decision: "rewrite",
    status: "draft",
    subject: "Watching your renewal — {{days_phrase_lower}}",
    body: chaseBody(
      "We know your policy{{policy_bit}} is coming up for renewal. {{days_phrase}}. We are watching the carrier offer and will shop more quotes if we need a better option.\n\nSit tight unless something at the house or with drivers changed.",
    ),
  },
  "renewal-chase-60to90": {
    decision: "rewrite",
    status: "draft",
    subject: "We know this is renewing — {{days_phrase_lower}}",
    body: chaseBody(
      "Just a note that we know your policy{{policy_bit}} is renewing. {{days_phrase}}. We are already watching it and will work more quotes if needed.\n\nNothing for you to do today.",
    ),
  },
  "renewal-chase-90plus": {
    decision: "rewrite",
    status: "draft",
    subject: "We know this is renewing — {{days_phrase_lower}}",
    body: chaseBody(
      "We know your policy{{policy_bit}} is on the renewal calendar. {{days_phrase}}. We are watching it early and will shop more quotes if we need them.\n\nNo homework on your side unless something changed.",
    ),
  },
  "client-quote": {
    decision: "rewrite",
    status: "draft",
    subject: "Your quote — {{agency_name}}",
    body: `Hi {{contact_first_name}},

Your quote is ready to review. Reply to this email if you want to walk through it.

{{signature}}`,
  },
  "campaign-wind-mit": {
    decision: "rewrite",
    status: "draft",
    subject: "Need your wind mitigation inspection",
    body: `Hi {{contact_first_name}},

Please send the wind mit so we can finish shopping.

{{signature}}`,
  },
  "campaign-hurricane": {
    decision: "rewrite",
    status: "draft",
    subject: "Review your deductible before storm season",
    body: `Hi {{contact_first_name}},

A short reminder to review hurricane deductibles.

{{signature}}`,
  },
  "campaign-renewal-watch": { decision: "drop", status: "draft" },
  "wire-thank-you": { decision: "drop", status: "draft" },
  "wire-google-review": { decision: "drop", status: "draft" },
  [MACRO_LEAD_FOLLOWUP_KEY]: { decision: "drop", status: "draft" },
};

export type ResolvedCopy = { send: true; subject: string; body: string } | { send: false };

export function resolveTemplateText(
  key: string,
  locale: "en" | "es",
  current: { subject: string; body: string },
  revisions: Record<string, TemplateRevision> = TEMPLATE_REVISIONS,
): ResolvedCopy {
  const row = revisionRow(key, revisions);
  if (!row || row.status !== "chosen") {
    return { send: true, subject: current.subject, body: current.body };
  }
  if (row.decision === "drop") return { send: false };
  if (row.decision === "rewrite") {
    if (locale === "es" && row.subjectEs && row.bodyEs) {
      return { send: true, subject: row.subjectEs, body: row.bodyEs };
    }
    if (row.subject && row.body) return { send: true, subject: row.subject, body: row.body };
  }
  return { send: true, subject: current.subject, body: current.body };
}

export function chosenDrop(
  key: string,
  revisions: Record<string, TemplateRevision> = TEMPLATE_REVISIONS,
): boolean {
  const row = revisionRow(key, revisions);
  return Boolean(row && row.status === "chosen" && row.decision === "drop");
}

export function deskFallbackCopy(
  key: string,
  template: {
    subject?: string | null;
    body?: string | null;
    subjectEn?: string | null;
    bodyEn?: string | null;
  },
  revisions?: Record<string, TemplateRevision>,
): ResolvedCopy {
  return resolveTemplateText(
    key,
    "en",
    {
      subject: (template.subjectEn || template.subject || "").trim(),
      body: (template.bodyEn || template.body || "").trim(),
    },
    revisions,
  );
}

/** Skip a due job only when a chosen drop still matches the stored template body. */
export function jobBlockedByChosenDrop(
  input: {
    slug: string;
    jobBody: string | null | undefined;
    templateBody: string | null | undefined;
  },
  revisions?: Record<string, TemplateRevision>,
): boolean {
  if (!chosenDrop(input.slug, revisions)) return false;
  const job = (input.jobBody ?? "").trim();
  const tpl = (input.templateBody ?? "").trim();
  if (!job) return true;
  if (tpl && (job === tpl || job.includes(tpl))) return true;
  return false;
}

const WIRE_JOB_KEYS: Record<string, string> = {
  thank_you: "wire-thank-you",
  google_review: "wire-google-review",
};

/** Database slugs for the wire stubs, distinct from the seeded review template. */
const REVISION_KEY_BY_SLUG: Record<string, string> = {
  "thank-you": "wire-thank-you",
  "google-review": "wire-google-review",
};

function revisionRow(
  key: string,
  revisions: Record<string, TemplateRevision>,
): TemplateRevision | undefined {
  return revisions[key] ?? revisions[REVISION_KEY_BY_SLUG[key] ?? ""];
}

export function wireJobAllowed(
  kind: string,
  revisions?: Record<string, TemplateRevision>,
): boolean {
  const key = WIRE_JOB_KEYS[kind];
  if (!key) return true;
  return !chosenDrop(key, revisions);
}

export function fillNamedTokens(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (full, key: string) => {
    const mapped = values[key.toLowerCase()];
    return mapped === undefined ? full : mapped;
  });
}
