import { shopInAppetiteAction } from "@/app/actions/quotes";
import { FitBadge } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import type { CarrierMatch } from "@/lib/appetite/match";

export function MarketsPanel({
  dealId,
  matches,
}: {
  dealId: string;
  matches: CarrierMatch[];
}) {
  const greens = matches.filter((m) => m.band === "green");
  const yellows = matches.filter((m) => m.band === "yellow");
  const reds = matches.filter((m) => m.band === "red");

  return (
    <div className="space-y-4">
      <div className="ff-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="text-sm font-semibold text-navy">Filter first, then rank</h3>
          <p className="text-xs text-muted-foreground">
            {greens.length} green · {yellows.length} yellow · {reds.length} red. Red markets are
            not submitted. Yellow needs an override. Portal adapters are empty — no carrier
            logins.
          </p>
        </div>
        <form action={shopInAppetiteAction}>
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" size="sm" disabled={greens.length === 0}>
            Build stub quotes for green markets
          </Button>
        </form>
      </div>
      <MarketTable title="Shop these" rows={greens} empty="No in-appetite markets for this risk." />
      <MarketTable title="Stretch — override only" rows={yellows} empty="No stretch markets." />
      <MarketTable title="Skip" rows={reds} empty="Nothing to skip." />
    </div>
  );
}

function MarketTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: CarrierMatch[];
  empty: string;
}) {
  return (
    <section className="ff-card overflow-hidden">
      <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">{title}</div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <table className="ff-table">
          <thead>
            <tr>
              <th>Carrier</th>
              <th>Fit</th>
              <th>Score</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.carrierId}>
                <td className="font-medium">
                  {row.carrierName}
                  {row.learnedDecline ? (
                    <div className="text-[11px] text-fit-red">Learned from decline log</div>
                  ) : null}
                </td>
                <td>
                  <FitBadge band={row.band} />
                </td>
                <td>{row.fitScore}</td>
                <td className="text-xs">
                  {row.reasons
                    .filter((r) => r.severity !== "pass")
                    .map((r) => r.message)
                    .join(" · ") || "Clears structured appetite."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
