import Link from "next/link";
import {
  createHealthSherpaContactAction,
  linkHealthSherpaEnrollmentAction,
} from "@/app/actions/healthsherpa";
import { Button } from "@/components/ui/button";
import {
  HEALTHSHERPA_EXTERNAL_ID_STAMP,
  HEALTHSHERPA_REVIEW_BLURB,
} from "@/lib/healthsherpa/copy";
import {
  contactPickerLabel,
  type HealthSherpaReviewContact,
  type HealthSherpaReviewRow,
} from "@/lib/healthsherpa/review";

export function HealthSherpaReviewQueue({
  rows,
  contacts,
  focusId,
}: {
  rows: HealthSherpaReviewRow[];
  contacts: HealthSherpaReviewContact[];
  focusId?: string | null;
}) {
  return (
    <div data-ff-healthsherpa-review="">
      <p className="mb-2 max-w-3xl text-sm text-muted-foreground">{HEALTHSHERPA_REVIEW_BLURB}</p>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground" data-ff-healthsherpa-external-id="">
        {HEALTHSHERPA_EXTERNAL_ID_STAMP}
      </p>
      {rows.length === 0 ? (
        <section className="ff-card p-4">
          <p className="text-sm text-muted-foreground">
            No unmatched HealthSherpa enrollments. Strong inbound matches attach automatically.
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const focused = focusId === row.id;
            return (
              <li
                key={row.id}
                id={`enrollment-${row.id}`}
                className={`ff-card p-4 ${focused ? "border-primary/50" : ""}`}
                data-ff-healthsherpa-review-row={row.id}
                data-ff-match-status={row.matchStatus}
                data-ff-match-reason={row.matchReason}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-navy">
                      {row.lastName}, {row.firstName}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {row.email ?? "No email"} · {row.phone ?? "No phone"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {row.product === "marketplace" ? "Marketplace" : "Medicare"}
                      {row.planLabel ? ` · ${row.planLabel}` : ""}
                      {row.confirmationNumber ? ` · ${row.confirmationNumber}` : ""}
                      {" · "}
                      {row.matchStatus === "needs_review" ? "Needs review" : "Unmatched"} ({row.matchReasonLabel})
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <form
                    action={linkHealthSherpaEnrollmentAction}
                    className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end"
                    data-ff-healthsherpa-link=""
                  >
                    <input type="hidden" name="enrollmentId" value={row.id} />
                    <label className="min-w-0 flex-1 text-xs text-muted-foreground">
                      Existing contact
                      <select
                        name="contactId"
                        required
                        defaultValue={row.candidateContactId ?? ""}
                        className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-navy"
                        data-ff-healthsherpa-link-contact=""
                      >
                        <option value="">Select a contact…</option>
                        {contacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contactPickerLabel(contact)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button type="submit" size="sm" data-ff-healthsherpa-link-submit="">
                      Link to existing contact
                    </Button>
                  </form>
                  <form action={createHealthSherpaContactAction} data-ff-healthsherpa-create="">
                    <input type="hidden" name="enrollmentId" value={row.id} />
                    <Button type="submit" size="sm" variant="outline" data-ff-healthsherpa-create-submit="">
                      Create new contact
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-sm">
        <Link href="/contacts" className="text-primary hover:underline">
          Back to Contacts
        </Link>
      </p>
    </div>
  );
}
