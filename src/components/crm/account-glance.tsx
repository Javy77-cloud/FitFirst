
import { formatMoney } from "@/lib/domain";

export function AccountGlance({
  policyCount,
  activePolicyCount,
  dealCount,
  activityCount,
  lifetimeValue,
  emailOptOut,
  smsOptOut,
  defaultOpen = true,
}: {
  policyCount: number;
  activePolicyCount: number;
  dealCount: number;
  activityCount: number;
  lifetimeValue?: number | string | null;
  emailOptOut?: boolean;
  smsOptOut?: boolean;
  /** When false, render without outer card chrome (caller wraps). */
  defaultOpen?: boolean;
}) {
  return (
    <section className="ff-card mb-4 p-4" data-ff-at-a-glance="" data-ff-glance-open={defaultOpen ? "1" : "0"}>
      <h2 className="text-base font-semibold text-navy">At a Glance</h2>
      <p className="mt-1 text-helper text-muted-foreground">
        Related Policies, Shops, And Activity On This Record. Quotes On A Deal Are Not Policies.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Policies</dt>
          <dd>
            <strong>{policyCount}</strong>
            <span className="ml-1 text-helper text-muted-foreground">Lifetime</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">In Force</dt>
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
        {lifetimeValue != null ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Lifetime Value</dt>
            <dd>
              <strong>{formatMoney(lifetimeValue)}</strong>
            </dd>
          </div>
        ) : null}
      </dl>
      {emailOptOut != null || smsOptOut != null ? (
        <p className="mt-3 text-sm">
          {emailOptOut ? (
            <span className="mr-3 rounded-sm bg-muted px-1.5 py-0.5 text-helper uppercase">Email Opted Out</span>
          ) : (
            <span className="mr-3 text-helper text-muted-foreground">Email Ok</span>
          )}
          {smsOptOut ? (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-helper uppercase">SMS Opted Out</span>
          ) : (
            <span className="text-helper text-muted-foreground">SMS Ok</span>
          )}
        </p>
      ) : null}
    </section>
  );
}
