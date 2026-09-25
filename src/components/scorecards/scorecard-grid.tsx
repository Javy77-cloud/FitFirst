import Link from "next/link";
import { formatMoney, formatPct } from "@/lib/domain";
import { producerStatusLabel } from "@/lib/scorecards/metrics";
import type { ProducerScorecard } from "@/lib/scorecards/types";

export function ScorecardStatGrid({ card }: { card: ProducerScorecard }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Conversion"
        value={card.binds + card.shops + card.lost > 0 ? formatPct(card.conversion) : "—"}
        hint={`${card.binds} binds / ${card.shops} shops · ${card.lost} lost`}
      />
      <Stat
        label="Retention"
        value={card.inForce + card.lapsed > 0 ? formatPct(card.retention) : "—"}
        hint={`${card.inForce} in force · ${card.lapsed} lapsed`}
      />
      <Stat label="Premium" value={formatMoney(card.premium)} />
      <Stat label="Binds" value={String(card.binds)} hint={`Rank ${card.rank} · ${producerStatusLabel(card.status)}`} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="ff-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-navy">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function ScorecardRankTable({
  rows,
  highlightId,
}: {
  rows: ProducerScorecard[];
  highlightId?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">No producers on this book yet.</p>
    );
  }

  return (
    <table className="ff-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Producer</th>
          <th>Conversion</th>
          <th>Retention</th>
          <th>Premium</th>
          <th>Binds</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.userId}
            className={row.userId === highlightId ? "bg-[color:var(--ff-wash)]" : undefined}
          >
            <td className="font-semibold text-navy">{row.rank}</td>
            <td>
              <Link href={`/scorecards/${row.userId}`} className="font-medium text-primary hover:underline">
                {row.name}
              </Link>
              <div className="text-[11px] text-muted-foreground">
                {row.role === "admin" ? "Admin" : "Agent"}
                {row.status !== "active" ? ` · ${producerStatusLabel(row.status)}` : ""}
              </div>
            </td>
            <td>
              {row.binds + row.shops + row.lost > 0 ? formatPct(row.conversion) : "—"}
              <div className="text-[11px] text-muted-foreground">
                {row.binds} / {row.binds + row.shops + row.lost}
              </div>
            </td>
            <td>
              {row.inForce + row.lapsed > 0 ? formatPct(row.retention) : "—"}
              <div className="text-[11px] text-muted-foreground">
                {row.inForce} in force
              </div>
            </td>
            <td>{formatMoney(row.premium)}</td>
            <td>{row.binds}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
