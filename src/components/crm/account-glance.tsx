
import { CheckCircle2, XCircle } from "lucide-react";
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
  commsFormat = "legacy",
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
  /** "status" = Email: OK · SMS: OK with icons (Contacts). Default keeps Business pages unchanged. */
  commsFormat?: "legacy" | "status";
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
        commsFormat === "status" ? (
          <p
            className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            data-ff-glance-comms="status"
          >
            <span className="inline-flex items-center gap-1">
              Email:{" "}
              {emailOptOut ? (
                <>
                  <XCircle className="size-3.5 text-[#BF0A30]" aria-hidden />
                  <span className="font-medium text-[#BF0A30]">Opted Out</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
                  <span className="font-medium text-emerald-700">OK</span>
                </>
              )}
            </span>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              SMS:{" "}
              {smsOptOut ? (
                <>
                  <XCircle className="size-3.5 text-[#BF0A30]" aria-hidden />
                  <span className="font-medium text-[#BF0A30]">Opted Out</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
                  <span className="font-medium text-emerald-700">OK</span>
                </>
              )}
            </span>
          </p>
        ) : (
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
        )
      ) : null}
    </section>
  );
}
