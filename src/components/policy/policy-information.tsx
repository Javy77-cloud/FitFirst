import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { RecordLink } from "@/components/record-links";
import {
  policyInformationFields,
  type PolicyInfoSource,
} from "@/lib/desk/policy-information";

export function PolicyInformationCard({
  policy,
  carrierName,
  contact,
  account,
  locationLabel,
}: {
  policy: PolicyInfoSource;
  carrierName?: string | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  account?: { id: string; name: string } | null;
  locationLabel?: string | null;
}) {
  const fields = policyInformationFields({
    policy,
    carrierName,
    contact,
    account,
    locationLabel,
  });

  return (
    <section id="policy-information" className="ff-card mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Policy Information</h2>
        <PolicyStatusBadge status={policy.status} />
      </div>
      <p className="mt-1 text-base text-muted-foreground">
        In-force record after bind. Quotes stay on the deal. Servicing and files are below.
      </p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key}>
            <dt className="text-helper text-muted-foreground">{field.label}</dt>
            <dd className="font-medium text-navy">
              {field.key === "status" ? (
                <PolicyStatusBadge status={field.value} />
              ) : field.href ? (
                <RecordLink href={field.href}>{field.value}</RecordLink>
              ) : (
                field.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
