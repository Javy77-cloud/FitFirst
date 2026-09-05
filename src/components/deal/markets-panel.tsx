import Link from "next/link";
import { shopInAppetiteAction } from "@/app/actions/quotes";
import { FitBadge } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import type { CarrierMatch } from "@/lib/appetite/match";
import {
  appointmentLabel,
  dontWriteNote,
  isAppointedMatch,
  marketWhy,
} from "@/lib/appetite/present";

export function MarketsPanel({
  dealId,
  matches,
  unlocked = false,
}: {
  dealId: string;
  matches: CarrierMatch[];
  unlocked?: boolean;
}) {
  const greens = matches.filter((m) => m.band === "green");
  const yellows = matches.filter((m) => m.band === "yellow");
  const reds = matches.filter((m) => m.band === "red");
  const appointed = matches.filter((m) => isAppointedMatch(m)).length;

  return (
    <div className="space-y-4">
      <div className="ff-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-navy">Filter first, then rank</h3>
          <p className="text-base text-muted-foreground">
            {greens.length} shop · {yellows.length} caution · {reds.length} don&apos;t write ·{" "}
            {appointed} appointed. Red markets are not submitted. Caution needs an override.
            Appointments are on the carrier row — a missing appointment is don&apos;t-write, not
            paper by default. No rater APIs.
          </p>
        </div>
        <form action={shopInAppetiteAction}>
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" size="sm" disabled={greens.length === 0 || !unlocked}>
            {unlocked ? "Build stub quotes for shop markets" : "Approve sheet to shop"}
          </Button>
        </form>
      </div>
      <MarketTable
        title="Shop these"
        rows={greens}
        empty="No appointed in-appetite markets for this risk."
      />
      <MarketTable
        title="Caution — override only"
        rows={yellows}
        empty="No caution markets."
      />
      <MarketTable title="Don't write" rows={reds} empty="Nothing to skip." />
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
      <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">{title}</div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-base text-muted-foreground">{empty}</p>
      ) : (
        <table className="ff-table">
          <thead>
            <tr>
              <th>Carrier</th>
              <th>Appointment</th>
              <th>Fit</th>
              <th>Score</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const appointed = isAppointedMatch(row);
              const note = dontWriteNote(row);
              return (
                <tr key={row.carrierId}>
                  <td className="font-medium">
                    <Link href={`/carriers/${row.carrierId}`} className="text-primary hover:underline">
                      {row.carrierName}
                    </Link>
                    {row.learnedDecline ? (
                      <div className="text-helper text-fit-red">Learned from decline log</div>
                    ) : null}
                    {note ? <div className="text-helper text-muted-foreground">{note}</div> : null}
                  </td>
                  <td>
                    <span
                      className={
                        appointed
                          ? "rounded-sm bg-fit-green-bg px-1.5 py-0.5 text-caption font-semibold text-fit-green"
                          : "rounded-sm bg-fit-red-bg px-1.5 py-0.5 text-caption font-semibold text-fit-red"
                      }
                    >
                      {appointmentLabel(row)}
                    </span>
                  </td>
                  <td>
                    <FitBadge band={row.band} />
                  </td>
                  <td>{row.fitScore}</td>
                  <td className="text-xs">{marketWhy(row)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
