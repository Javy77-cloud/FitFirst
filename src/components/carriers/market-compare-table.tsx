import Link from "next/link";
import type { MarketCompareRow } from "@/lib/carriers/market-compare";

export function MarketCompareTable({ rows, lob }: { rows: MarketCompareRow[]; lob: string }) {
  if (!lob) {
    return null;
  }
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No Carriers Write Or Schedule &quot;{lob}&quot; Yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" data-ff-carrier-market-compare="">
      <table className="ff-table min-w-[960px] text-sm">
        <thead>
          <tr>
            <th className="text-[#002868]">Carrier</th>
            <th className="text-[#002868]">AM Best</th>
            <th className="text-[#002868]">New %</th>
            <th className="text-[#002868]">Renewal %</th>
            <th className="text-[#002868]">Bonus Thresholds</th>
            <th className="text-[#002868]">Appetite</th>
            <th className="text-[#BF0A30]">Don&apos;t Write</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.carrierId} className={row.active ? undefined : "opacity-60"}>
              <td className="align-top">
                <Link
                  href={`/carriers/${row.carrierId}`}
                  className="font-medium text-[#002868] hover:underline"
                >
                  {row.carrierName}
                </Link>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {row.writesLine ? (
                    <span className="rounded-full bg-[#002868]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#002868]">
                      Writes {lob}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Schedule Only
                    </span>
                  )}
                  {!row.active ? (
                    <span className="rounded-full bg-[#FCE8EC] px-1.5 py-0.5 text-[10px] font-medium text-[#BF0A30]">
                      Inactive
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="align-top tabular-nums">
                <div className="font-medium text-[#002868]">{row.amBestRating}</div>
                {row.amBestOutlook !== "—" ? (
                  <div className="text-xs text-muted-foreground">{row.amBestOutlook}</div>
                ) : null}
              </td>
              <td className="align-top tabular-nums">{row.newBusinessPct}</td>
              <td className="align-top tabular-nums">{row.renewalPct}</td>
              <td className="align-top text-xs text-muted-foreground">
                {row.bonusThresholds}
              </td>
              <td className="align-top max-w-[220px] whitespace-pre-wrap text-xs text-[#002868]">
                {row.appetite || "—"}
              </td>
              <td className="align-top max-w-[220px] whitespace-pre-wrap text-xs text-[#BF0A30]">
                {row.dontWrite || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
