import type { RoleHealthSummary } from "@/lib/renewal/health-rollup";

export function RenewalsHealthStrip({ summary }: { summary: RoleHealthSummary }) {
  const stars = summary.combinedStars;
  return (
    <section className="ff-renewals-health-strip" data-ff-renewals-health-strip="" data-ff-health-scope={summary.scope}>
      <div className="ff-renewals-health-combined">
        <strong>{stars == null ? "—" : stars.toFixed(1)}</strong>
        <span>
          {summary.label}
          {summary.clients === 1 ? " · 1 client" : ` · ${summary.clients} clients`}
        </span>
      </div>
      <div className="ff-renewals-health-flagged">
        <strong>{summary.flagged}</strong>
        <span>flagged (2× under 3)</span>
      </div>
      {summary.scope === "agency" && summary.perAgent.length > 0 ? (
        <ul className="ff-renewals-health-agents" data-ff-health-per-agent="">
          {summary.perAgent.map((agent) => (
            <li key={agent.ownerId}>
              <span>{agent.ownerName}</span>
              <em>{agent.stars.toFixed(1)}</em>
              {agent.flagged > 0 ? <b>{agent.flagged}</b> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
