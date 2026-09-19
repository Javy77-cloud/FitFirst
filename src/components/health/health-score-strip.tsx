import type { AgentHealthRollup } from "@/lib/health/model";
import { RENEWAL_RISK_LABEL } from "@/lib/renewal/urgency";
import { cn } from "@/lib/utils";

function MiniRing({ score, band }: { score: number; band: AgentHealthRollup["band"] }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dash = ((score || 0) / 100) * circumference;
  const color =
    band === "high"
      ? "var(--ff-terracotta)"
      : band === "medium"
        ? "var(--ff-urgency-amber)"
        : "var(--ff-urgency-gray)";
  return (
    <svg viewBox="0 0 44 44" className="ff-health-strip-ring" aria-hidden>
      <circle cx="22" cy="22" r={radius} fill="none" stroke="color-mix(in srgb, var(--ff-border) 80%, white)" strokeWidth="6" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

export function HealthScoreStrip({
  book,
  agents,
  showAgents,
  scopeLabel,
}: {
  book: AgentHealthRollup;
  agents: AgentHealthRollup[];
  showAgents: boolean;
  scopeLabel: string;
}) {
  const total = book.highCount + book.mediumCount + book.lowCount;
  const pct = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));

  return (
    <section className="ff-health-strip" data-ff-health-strip="">
      <div className="ff-health-strip-score" data-ff-health-book-score={book.averageScore} data-ff-health-book-band={book.band}>
        <div className="ff-health-strip-ring-wrap">
          <MiniRing score={book.averageScore} band={book.band} />
          <span className="ff-health-strip-ring-label">{RENEWAL_RISK_LABEL[book.band]}</span>
        </div>
        <div>
          <p className="ff-health-strip-kicker">{scopeLabel}</p>
          <p className="text-sm text-muted-foreground">
            {book.clientCount === 0
              ? "Client health appears once this book has renewals."
              : `${RENEWAL_RISK_LABEL[book.band]} risk across ${book.clientCount} client${book.clientCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="ff-health-strip-bar" aria-hidden>
          {book.highCount ? <span className="ff-health-band-high" style={{ width: `${pct(book.highCount)}%` }} /> : null}
          {book.mediumCount ? (
            <span className="ff-health-band-medium" style={{ width: `${pct(book.mediumCount)}%` }} />
          ) : null}
          {book.lowCount ? <span className="ff-health-band-low" style={{ width: `${pct(book.lowCount)}%` }} /> : null}
          {total === 0 ? <span className="ff-health-strip-bar-empty" style={{ width: "100%" }} /> : null}
        </div>
        <ul className="ff-health-strip-legend">
          <li>
            <span className="ff-health-swatch ff-health-band-high" />
            High {pct(book.highCount)}%
          </li>
          <li>
            <span className="ff-health-swatch ff-health-band-medium" />
            Medium {pct(book.mediumCount)}%
          </li>
          <li>
            <span className="ff-health-swatch ff-health-band-low" />
            Low {pct(book.lowCount)}%
          </li>
        </ul>
        {showAgents && agents.length > 0 ? (
          <ul className="ff-health-agent-rollups" data-ff-health-agent-rollups="">
            {agents.map((agent) => (
              <li key={agent.ownerId ?? agent.ownerName} data-ff-health-agent={agent.ownerId ?? "unassigned"}>
                <span className={cn("ff-health-agent-dot", `ff-health-band-${agent.band}`)} aria-hidden />
                <span className="ff-health-agent-name">{agent.ownerName}</span>
                <span className="ff-health-agent-meta">{RENEWAL_RISK_LABEL[agent.band]}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
