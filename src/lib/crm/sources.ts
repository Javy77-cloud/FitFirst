/** Shared Lead / Deal / Contact source picklist. One catalog — do not fork per module. */

export const INDUSTRY_SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Website" },
  { value: "call_in", label: "Call-in" },
  { value: "walk_in", label: "Walk-in" },
  { value: "partner", label: "Partner" },
  { value: "aor", label: "AOR" },
  { value: "cross_sell", label: "Cross-sell" },
  { value: "renewal", label: "Renewal" },
  { value: "direct_mail", label: "Direct mail" },
  { value: "radio_tv", label: "Radio / TV" },
  { value: "event", label: "Event" },
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "google_ads", label: "Google Ads" },
  { value: "google_business_profile", label: "Google Business Profile" },
  { value: "carrier_lead", label: "Carrier lead" },
  { value: "book", label: "Book of business" },
  { value: "existing_client", label: "Existing client" },
  { value: "other", label: "Other" },
] as const;

/** Desk intake values already stored on seeded / inbound rows. Keep valid so filters do not break. */
export const DESK_INTAKE_SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "phone", label: "Phone" },
  { value: "social", label: "Social" },
  { value: "dropped_dec", label: "Dropped dec" },
  { value: "dec_drop", label: "Dec drop" },
  { value: "email_stub", label: "Email stub" },
  { value: "social_stub", label: "Social stub" },
  { value: "inbound_email", label: "Inbound email" },
  { value: "commercial_intake", label: "Commercial intake" },
] as const;

export const RECORD_SOURCE_GROUPS = [
  { id: "industry", label: "How they found us", options: INDUSTRY_SOURCES },
  { id: "intake", label: "Desk intake", options: DESK_INTAKE_SOURCES },
] as const;

export const RECORD_SOURCES = [...INDUSTRY_SOURCES, ...DESK_INTAKE_SOURCES] as const;

export type RecordSource = (typeof RECORD_SOURCES)[number]["value"];

/** Values only — same order as the shared catalog. Used by Lead / Deal / Contact picklists. */
export const LEAD_SOURCES = RECORD_SOURCES.map((row) => row.value);

const LABEL_BY_VALUE = Object.fromEntries(RECORD_SOURCES.map((row) => [row.value, row.label])) as Record<
  string,
  string
>;

export function isKnownSource(value: string | null | undefined): value is RecordSource {
  return Boolean(value && value in LABEL_BY_VALUE);
}

export function sourceLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  return LABEL_BY_VALUE[raw] ?? raw.replaceAll("_", " ");
}

export function sourceFilterOptions(): { value: string; label: string }[] {
  return RECORD_SOURCES.map((row) => ({ value: row.value, label: row.label }));
}

export function normalizeRecordSource(
  value: string | null | undefined,
  fallback: string | null = "manual",
): string | null {
  const raw = (value ?? "").trim();
  return raw || fallback;
}
