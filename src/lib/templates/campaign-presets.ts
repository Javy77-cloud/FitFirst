/** Campaign form presets. The campaign action records a would-send stub and does not mail. */

export const CAMPAIGN_EMAIL_PRESETS = [
  {
    key: "campaign-wind-mit",
    name: "Wind mit chase",
    subject: "Need your wind mitigation inspection",
    body: "Please send the wind mit so we can finish shopping.",
    audienceType: "tag",
    audienceValue: "ho3",
  },
  {
    key: "campaign-hurricane",
    name: "Hurricane season reminder",
    subject: "Review your deductible before storm season",
    body: "A short reminder to review hurricane deductibles. No SMTP in this build.",
    audienceType: "pipeline_stage",
    audienceValue: "shopping",
  },
  {
    key: "campaign-renewal-watch",
    name: "Renewal-watch note",
    subject: "We will shop your renewal 60 days out",
    body: "Placeholder renewal template. Audience is the renewal-watch tag when you add it.",
    audienceType: "tag",
    audienceValue: "renewal-watch",
  },
] as const;

export type CampaignEmailPreset = (typeof CAMPAIGN_EMAIL_PRESETS)[number];
