import { RENEWAL_HANDLED_FILTER_LABEL } from "@/lib/renewal/handled";

export type HandledStampSurface = "board" | "dossier" | "band" | "stack";

/**
 * Shared rubber stamp for Client staying / Handled / Renewal agreed.
 * Copy is always an existing product label. Ink color lives on --ff-stamp-ink.
 */
export function HandledStamp({
  label,
  surface,
}: {
  label: string;
  surface: HandledStampSurface;
}) {
  if (surface === "dossier") {
    return (
      <div
        className="ff-renewal-agreed-stamp"
        data-ff-renewal-agreed-stamp=""
        data-ff-handled-stamp="dossier"
      >
        <div className="ff-deal-status-stamp" data-ff-deal-status-stamp="done">
          <span className="ff-deal-status-stamp-ink ff-handled-stamp-ink">{label}</span>
        </div>
      </div>
    );
  }
  if (surface === "band") {
    return (
      <span
        className="ff-renewal-agreed-badge ff-handled-stamp-ink"
        data-ff-renewal-agreed=""
        data-ff-handled-stamp="band"
      >
        {label}
      </span>
    );
  }
  if (surface === "stack") {
    return (
      <span
        className="ff-deal-status-stamp-ink ff-deal-notice-compact-ink ff-policy-renewal-agreed ff-handled-stamp-ink"
        data-ff-renewal-agreed=""
        data-ff-handled-stamp="stack"
      >
        {label}
      </span>
    );
  }
  return (
    <span className="ff-handled-stamp" data-ff-handled-stamp="board" data-ff-renewal-handled="">
      <span className="ff-handled-stamp-ink">{label}</span>
    </span>
  );
}

/** Renewals board card. The quiet filter name is the existing "Handled" label. */
export function RenewalBoardHandledStamp() {
  return <HandledStamp surface="board" label={RENEWAL_HANDLED_FILTER_LABEL} />;
}
