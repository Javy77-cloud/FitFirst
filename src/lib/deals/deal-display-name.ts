/**
 * Stack / Radar party label: primary applicant only.
 * Never append a co-applicant / secondary named insured, and never show the
 * same person twice when a case-variant duplicate was stored.
 */
export function primaryApplicantDisplayName(raw: string | null | undefined): string {
  let value = (raw ?? "").trim();
  if (!value || value === "—" || value === "–" || value === "-") return "";

  // insuredContactName historically joined "Primary · Secondary".
  const coApp = value.split(/\s+[·•]\s+/);
  if (coApp.length > 1) {
    value = (coApp[0] ?? "").trim();
  }
  if (!value) return "";

  // "Rosa Castellanos ROSA CASTELLANOS" → keep the first casing.
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2 && tokens.length % 2 === 0) {
    const mid = tokens.length / 2;
    const left = tokens.slice(0, mid);
    const right = tokens.slice(mid);
    if (left.join(" ").toLowerCase() === right.join(" ").toLowerCase()) {
      return left.join(" ");
    }
  }

  return value;
}
