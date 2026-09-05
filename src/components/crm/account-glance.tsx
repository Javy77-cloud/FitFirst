import { RecordLink } from "@/components/record-links";

export function AccountGlance({
  policyCount,
  activePolicyCount,
  dealCount,
  activityCount,
  emailOptOut,
  smsOptOut,
}: {
  policyCount: number;
  activePolicyCount: number;
  dealCount: number;
  activityCount: number;
  emailOptOut?: boolean;
  smsOptOut?: boolean;
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">At a glance</h2>
      <p className="mt-1 text-helper text-muted-foreground">
        Related policies, shops, and activity on this record. Quotes on a deal are not policies.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Policies</dt>
          <dd>
            <strong>{policyCount}</strong>
            <span className="ml-1 text-helper text-muted-foreground">lifetime</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">In force</dt>
          <dd>
            <strong>{activePolicyCount}</strong>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Deals</dt>
          <dd>
            <strong>{dealCount}</strong>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Activities</dt>
          <dd>
            <strong>{activityCount}</strong>
          </dd>
        </div>
      </dl>
      {emailOptOut != null || smsOptOut != null ? (
        <p className="mt-3 text-sm">
          {emailOptOut ? (
            <span className="mr-3 rounded-sm bg-muted px-1.5 py-0.5 text-helper uppercase">Email opted out</span>
          ) : (
            <span className="mr-3 text-helper text-muted-foreground">Email ok</span>
          )}
          {smsOptOut ? (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-helper uppercase">SMS opted out</span>
          ) : (
            <span className="text-helper text-muted-foreground">SMS ok</span>
          )}
          <span className="ml-3">
            <RecordLink href="#optouts">Edit opt-outs</RecordLink>
          </span>
        </p>
      ) : null}
    </section>
  );
}
