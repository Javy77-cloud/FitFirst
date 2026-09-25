import { leadSourceGlance } from "@/lib/leads/source-glance";

const BAR_TONES = ["ff-source-tone-a", "ff-source-tone-b", "ff-source-tone-c"] as const;

/** Compact source ranks. Each bar is only as long as that source's share. */
export function LeadsSourceBanner({
  sources,
}: {
  sources: Array<string | null | undefined>;
}) {
  const glance = leadSourceGlance(sources);
  const leader = glance.leader;

  return (
    <section className="ff-leads-source-glance" data-ff-leads-source-glance="" aria-label="Lead sources">
      <p className="ff-renewals-glance-kicker">Lead sources</p>
      {leader ? (
        <ol className="ff-leads-source-ranks" data-ff-leads-source-names="">
          {glance.top.map((row, index) => (
            <li key={row.label} data-ff-leads-source-rank={row.label}>
              <span>{row.label}</span>
              <span className="ff-leads-source-track" aria-hidden>
                <i
                  className={BAR_TONES[index] ?? BAR_TONES[2]}
                  style={{ width: `${Math.max(row.share, 8)}%` }}
                />
              </span>
              <strong>{row.count}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ff-leads-source-quiet">No source on this queue yet.</p>
      )}

    </section>
  );
}
