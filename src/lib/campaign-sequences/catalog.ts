import type { SequenceDefinition } from "./types";

/** Canonical five sequences. Seed copies these into campaign_sequences. */
export const INSURANCE_SEQUENCES: readonly SequenceDefinition[] = [
  {
    slug: "lead_nurture",
    name: "Lead nurture",
    summary:
      "New inquiry stays warm: thank-you, confirm the line they want, then a same-week follow-up if they go quiet.",
    audience: "New leads — no Deal yet, or Deal still in New / Contacted",
    anchor: "lead created",
    steps: [
      {
        key: "lead-call",
        kind: "task",
        offsetDays: 0,
        title: "Call the new lead",
        taskTitle: "Call new lead — confirm insurance wanted and best time to shop",
        taskKind: "lead_nurture",
      },
      {
        key: "lead-thanks",
        kind: "email_template",
        offsetDays: 0,
        title: "Thanks for reaching out",
        templateSlug: "seq-lead-nurture-welcome",
        emailSubject: "Thanks for reaching out — we'll shop this the right way",
        emailBody:
          "Hi {{contact_first_name}},\n\nThanks for asking us to look at your insurance. We'll confirm the line you want, gather the dec / photos we need, and shop appointed markets — quotes are not coverage until we bind.\n\nReply with a good time to talk.\n\n{{signature}}",
      },
      {
        key: "lead-follow-task",
        kind: "task",
        offsetDays: 3,
        title: "Follow up if no reply",
        taskTitle: "Lead nurture follow-up — still waiting on a reply",
        taskKind: "lead_nurture",
      },
      {
        key: "lead-still-shopping",
        kind: "email_template",
        offsetDays: 7,
        title: "Still shopping?",
        templateSlug: "seq-lead-nurture-followup",
        emailSubject: "Still shopping? We can compare your markets this week",
        emailBody:
          "Hi {{contact_first_name}},\n\nChecking in. If you still want us to shop {{policy_type}}, send the current dec or a time to talk and we'll start the Quote Sheet.\n\n{{signature}}",
      },
    ],
  },
  {
    slug: "quote_follow_up",
    name: "Quote follow-up",
    summary:
      "After Quote Sent: walk the numbers, answer questions, then nudge before the shop goes cold. Does not bind.",
    audience: "Deals in Quote Sent — including Ana's unbound HO3 shop",
    anchor: "quote sent",
    steps: [
      {
        key: "quote-walk",
        kind: "task",
        offsetDays: 0,
        title: "Walk the quotes",
        taskTitle: "Walk the quote sheet with the client — cheapest first, not bindable unless green",
        taskKind: "quote_follow_up",
      },
      {
        key: "quote-ready",
        kind: "email_template",
        offsetDays: 1,
        title: "Your quotes are ready",
        templateSlug: "seq-quote-ready",
        emailSubject: "Your quotes are ready — review before we bind",
        emailBody:
          "Hi {{contact_first_name}},\n\nYour quotes are on the desk. We ranked them cheapest first. A quote is not a policy — tell us which option you want (or what to re-shop) and we'll handle the bind packet.\n\n{{signature}}",
      },
      {
        key: "quote-check",
        kind: "task",
        offsetDays: 5,
        title: "Check bind or re-shop",
        taskTitle: "Quote follow-up — bind, re-shop, or close the file",
        taskKind: "quote_follow_up",
      },
      {
        key: "quote-nudge",
        kind: "email_template",
        offsetDays: 7,
        title: "Any questions on the quote?",
        templateSlug: "seq-quote-nudge",
        emailSubject: "Any questions on the quote?",
        emailBody:
          "Hi {{contact_first_name}},\n\nWanted to make sure the quote packet was clear. If deductibles, wind mit, or a carrier question is holding this up, reply and we'll sort it. Still shopping — nothing is bound until you say so.\n\n{{signature}}",
      },
    ],
  },
  {
    slug: "renewal_60_30",
    name: "60 / 30 renewal",
    summary:
      "Shop at 60 days, present options at 30. Task plus a client email stub at each window. $ at risk stays on the work queue.",
    audience: "In-force / bound / pending policies inside the 60-day renewal window",
    anchor: "renewal date",
    steps: [
      {
        key: "rn-60-task",
        kind: "task",
        offsetDays: -60,
        title: "Start the renewal shop",
        taskTitle: "60-day renewal shop — pull dec, shop appointed markets",
        taskKind: "renewal_60",
      },
      {
        key: "rn-60-email",
        kind: "email_template",
        offsetDays: -60,
        title: "Renewal is 60 days out",
        templateSlug: "seq-renewal-60",
        emailSubject: "Your renewal is 60 days out — we'll shop it",
        emailBody:
          "Hi {{contact_first_name}},\n\n{{policy_type}} renews soon. We'll shop your current carrier and appointed markets and come back with options before the 30-day window. No action needed unless your address, roof, or vehicles changed.\n\n{{signature}}",
      },
      {
        key: "rn-30-task",
        kind: "task",
        offsetDays: -30,
        title: "Present renewal options",
        taskTitle: "30-day renewal — present options and record the compare",
        taskKind: "renewal_30",
      },
      {
        key: "rn-30-email",
        kind: "email_template",
        offsetDays: -30,
        title: "30 days to renewal",
        templateSlug: "seq-renewal-30",
        emailSubject: "30 days to renewal — here are your options",
        emailBody:
          "Hi {{contact_first_name}},\n\nThirty days to renewal. We have current vs proposed numbers ready. Tell us if you want to stay, switch, or change deductibles before the carrier issues the term.\n\n{{signature}}",
      },
    ],
  },
  {
    slug: "cross_sell",
    name: "Cross-sell",
    summary:
      "Household gap pass: HO / Auto / Flood companions. One task to review the book, one email stub, one follow-up.",
    audience: "Clients with an in-force personal line who are missing a companion policy",
    anchor: "gap spotted",
    steps: [
      {
        key: "xsell-review",
        kind: "task",
        offsetDays: 0,
        title: "Review household gaps",
        taskTitle: "Cross-sell review — HO / Auto / Flood gaps on this household",
        taskKind: "cross_sell",
      },
      {
        key: "xsell-email",
        kind: "email_template",
        offsetDays: 0,
        title: "You may be missing a companion policy",
        templateSlug: "seq-cross-sell",
        emailSubject: "A gap we noticed on your book",
        emailBody:
          "Hi {{contact_first_name}},\n\nWhile reviewing your file we noticed you may be missing a companion policy (home, auto, or flood). If you want us to quote the gap, reply and we'll open a Deal — quotes stay quotes until you bind.\n\n{{signature}}",
      },
      {
        key: "xsell-follow",
        kind: "task",
        offsetDays: 14,
        title: "Follow up on the gap",
        taskTitle: "Cross-sell follow-up — still an open household gap",
        taskKind: "cross_sell",
      },
    ],
  },
  {
    slug: "review_ask",
    name: "Review ask",
    summary:
      "After bind / Closed Won: wait two weeks, then a Task plus the Google-review email stub. Hung on won date, not pipeline stage.",
    audience: "Newly bound personal or commercial clients (not shopping-only contacts)",
    anchor: "bind / closed won",
    steps: [
      {
        key: "review-task",
        kind: "task",
        offsetDays: 14,
        title: "Ask for a Google review",
        taskTitle: "Review ask — send the Google review stub if the bind is still happy",
        taskKind: "review_ask",
      },
      {
        key: "review-email",
        kind: "email_template",
        offsetDays: 14,
        title: "How did we do?",
        templateSlug: "seq-review-ask",
        emailSubject: "How did we do? A quick review helps the next family we shop",
        emailBody:
          "Hi {{contact_first_name}},\n\nThanks for binding with {{agency_name}}. If the process felt right, a short Google review helps the next family we shop. {{review_link}}\n\n{{signature}}",
      },
    ],
  },
] as const;

export function sequenceBySlug(slug: string): SequenceDefinition | undefined {
  return INSURANCE_SEQUENCES.find((row) => row.slug === slug);
}

export function sequenceEmailTemplates(): {
  slug: string;
  name: string;
  subject: string;
  body: string;
}[] {
  const seen = new Set<string>();
  const templates: { slug: string; name: string; subject: string; body: string }[] = [];
  for (const sequence of INSURANCE_SEQUENCES) {
    for (const step of sequence.steps) {
      if (step.kind !== "email_template" || !step.templateSlug || !step.emailSubject) continue;
      if (seen.has(step.templateSlug)) continue;
      seen.add(step.templateSlug);
      templates.push({
        slug: step.templateSlug,
        name: `${sequence.name} — ${step.title}`,
        subject: step.emailSubject,
        body: step.emailBody ?? "",
      });
    }
  }
  return templates;
}
