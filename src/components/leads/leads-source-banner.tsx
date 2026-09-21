import { leadSourceGlance } from "@/lib/leads/source-glance";

const BAR_TONES = ["ff-source-tone-a", "ff-source-tone-b", "ff-source-tone-c"] as const;

/** Two-part glance in the Renewals banner language. Names, not a source sheet. */
export function LeadsSourceBanner({
  sources,
}: {
  sources: Array<string | null | undefined>;
}) {
  const glance = leadSourceGlance(sources);
  const leader = glance.leader;

  return (
    <section className="ff-leads-source-glance" data-ff-leads-source-glance="" aria-label="Lead sources">
      <div className="ff-leads-source-mix">
        <p className="ff-renewals-glance-kicker">Lead sources</p>
        {leader ? (
          <div className="ff-leads-source-bar" data-ff-leads-source-bar="" aria-hidden>
            {glance.top.map((row, index) => (
              <span
                key={row.label}
                className={BAR_TONES[index] ?? BAR_TONES[2]}
                style={{ width: `${Math.max(row.share, 8)}%` }}
              />
            ))}
          </div>
        ) : (
          <p className="ff-leads-source-quiet">No source on this queue yet.</p>
        )}
        {leader ? (
          <ul className="ff-leads-source-names" data-ff-leads-source-names="">
            {glance.top.map((row, index) => (
              <li key={row.label}>
                <i className={BAR_TONES[index] ?? BAR_TONES[2]} aria-hidden />
                {row.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="ff-leads-source-leader" data-ff-leads-source-leader="">
        {leader ? (
          <>
            <strong>{leader.label}</strong>
            <span>leads this queue</span>
          </>
        ) : (
          <span>Set a source when the lead comes in.</span>
        )}
      </div>
    </section>
  );
}
