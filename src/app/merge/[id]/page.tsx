import Link from "next/link";
import { notFound } from "next/navigation";
import { dismissMergeCandidate, mergeDuplicatePair } from "@/app/actions/merge";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getMergeReview } from "@/lib/db/queries";
import { formatDay } from "@/lib/domain";
import { fieldPreview, reasonLabels } from "@/lib/merge/preview";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function RelatedList({
  title,
  items,
}: {
  title: string;
  items: { id: string; label: string; meta?: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">None</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <span className="font-medium">{item.label}</span>
              {item.meta ? <span className="text-muted-foreground"> · {item.meta}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function MergeReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await getMergeReview(id);
  if (!review) notFound();

  const { candidate, entityType, left, right } = review;
  const merged = candidate.status === "merged";
  const keeperId = candidate.keeperId;
  const reasons = reasonLabels(candidate.matchReasons ?? []);
  const preview = fieldPreview(
    entityType as "contact" | "lead",
    left.person as unknown as Record<string, unknown>,
    right.person as unknown as Record<string, unknown>,
  );

  const side = (bundle: typeof left) => ({
    deals: bundle.deals.map((d) => ({
      id: d.id,
      label: d.title,
      meta: d.pipelineStage,
    })),
    policies: bundle.policies.map((p) => ({
      id: p.id,
      label: p.policyNumber,
      meta: p.lineOfBusiness,
    })),
    locations: bundle.locations.map((l) => ({
      id: l.id,
      label: l.label || l.address1 || "Location",
      meta: [l.city, l.state].filter(Boolean).join(", "),
    })),
    activities: bundle.activities.map((a) => ({
      id: a.id,
      label: a.title,
      meta: a.kind,
    })),
  });

  const leftRelated = side(left);
  const rightRelated = side(right);

  return (
    <AppShell
      title={merged ? "Merge complete" : "Review duplicate"}
      actions={
        <Link href="/merge" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to queue
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {reasons.map((reason) => (
          <Badge key={reason} variant="secondary">
            {reason}
          </Badge>
        ))}
        <Badge variant={merged ? "secondary" : "outline"}>{merged ? "Merged" : "Open"}</Badge>
      </div>

      {merged ? (
        <div className="mb-4 rounded-md border border-border bg-fit-green-bg px-4 py-3 text-sm text-fit-green">
          Duplicate retired (archived), not deleted. Missing fields were copied onto the keeper.
          Deals, policies, locations, and activities now follow {keeperId === left.person.id ? `${left.person.firstName} ${left.person.lastName}` : `${right.person.firstName} ${right.person.lastName}`}.
        </div>
      ) : (
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Pick the surviving record. Blank fields on that record take values from the other.
          Filled fields stay put. Notes append so nothing is lost. The duplicate is archived.
        </p>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {[
          { key: "left", bundle: left, related: leftRelated, retired: left.person.status === "archived" },
          { key: "right", bundle: right, related: rightRelated, retired: right.person.status === "archived" },
        ].map(({ key, bundle, related, retired }) => (
          <section key={key} className="ff-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-navy">
                  {bundle.person.firstName} {bundle.person.lastName}
                </h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {entityType}
                  {retired ? " · archived" : ""}
                  {keeperId === bundle.person.id ? " · keeper" : ""}
                </p>
              </div>
              {retired ? <Badge variant="outline">Retired</Badge> : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd>{bundle.person.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd>{"phone" in bundle.person ? bundle.person.phone || "—" : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Address</dt>
                <dd>
                  {[bundle.person.mailingAddress, bundle.person.city, bundle.person.state, bundle.person.zip]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">DOB</dt>
                <dd>{formatDay(bundle.person.dateOfBirth)}</dd>
              </div>
            </dl>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <RelatedList title="Deals" items={related.deals} />
              <RelatedList title="Policies" items={related.policies} />
              <RelatedList title="Locations" items={related.locations} />
              <RelatedList title="Activities" items={related.activities} />
            </div>
          </section>
        ))}
      </div>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Field plan if the left record is keeper
        </div>
        <table className="ff-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Left</th>
              <th>Right</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr key={row.field}>
                <td>{row.field}</td>
                <td>{row.keeper}</td>
                <td>{row.duplicate}</td>
                <td className="capitalize">
                  {row.action === "copy" ? "Copy from right" : row.action === "append" ? "Append both" : "Keep left"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!merged ? (
        <form action={mergeDuplicatePair} className="mt-4 ff-card space-y-4 p-4">
          <input type="hidden" name="candidateId" value={candidate.id} />
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="leftId" value={left.person.id} />
          <input type="hidden" name="rightId" value={right.person.id} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-navy">Surviving record</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="keeperId"
                value={left.person.id}
                defaultChecked
                className="accent-primary"
              />
              Keep {left.person.firstName} {left.person.lastName} (left) · retire the right record
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="keeperId" value={right.person.id} className="accent-primary" />
              Keep {right.person.firstName} {right.person.lastName} (right) · retire the left record
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Merge without deleting</Button>
            <Button type="submit" variant="outline" formAction={dismissMergeCandidate}>
              Dismiss pair
            </Button>
          </div>
        </form>
      ) : null}
    </AppShell>
  );
}
