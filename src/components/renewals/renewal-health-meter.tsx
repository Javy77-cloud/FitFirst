import { cn } from "@/lib/utils";

function Pips({ stars, hot }: { stars: number; hot?: boolean }) {
  const filled = Math.max(1, Math.min(5, Math.round(stars)));
  return (
    <span className="ff-renewal-health-pips" aria-hidden>
      {[1, 2, 3, 4, 5].map((pip) => (
        <i key={pip} className={cn(pip <= filled && "is-on", hot && filled <= 2 && pip <= filled && "is-hot")} />
      ))}
    </span>
  );
}

function asStars(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function RenewalHealthMeter({
  stars,
  policyStars,
  flagged,
  source,
}: {
  stars: number;
  policyStars?: number;
  flagged?: boolean;
  source?: "rated" | "model";
}) {
  const client = asStars(stars);
  const policy = policyStars == null ? undefined : asStars(policyStars);
  return (
    <div
      className={cn("ff-renewal-health", flagged && "is-flagged")}
      data-ff-client-health={Math.round(client)}
      data-ff-policy-health={policy != null ? Math.round(policy) : undefined}
      data-ff-health-flagged={flagged ? "true" : "false"}
      data-ff-health-source={source ?? "model"}
      title={
        flagged
          ? "Flagged — two ratings under 3"
          : `Client ${client.toFixed(1)} · Policy ${(policy ?? client).toFixed(1)}`
      }
    >
      <span className="ff-renewal-health-pair">
        <span className="ff-renewal-health-label">Client</span>
        <Pips stars={client} hot={flagged || client <= 2} />
      </span>
      {policy != null ? (
        <span className="ff-renewal-health-pair">
          <span className="ff-renewal-health-label">Policy</span>
          <Pips stars={policy} hot={policy <= 2} />
        </span>
      ) : null}
      {flagged ? <span className="ff-renewal-health-flag">Flag</span> : null}
    </div>
  );
}
