import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { stageColorFromNameOrSlug, statusBarClass } from "@/lib/desk/status-colors";
import { renewalsHref } from "@/lib/wire/pipeline";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";

export function RenewalsFunnel({
  stages,
  cards,
  pipeline,
  viewExtras,
}: {
  stages: Array<{ slug: string; name: string; color?: string | null }>;
  cards: RenewalBoardCard[];
  pipeline?: string | null;
  viewExtras?: {
    pcSub?: string | null;
    lifeSub?: string | null;
    healthSub?: string | null;
  };
}) {
  const rows = stages.map((stage) => ({
    ...stage,
    count: cards.filter((card) => card.stage === stage.slug).length,
  }));
  const max = Math.max(1, ...rows.map((row) => row.count));
  const total = cards.length;

  return (
    <section className="ff-card p-4" data-ff-renewals-funnel="">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Stage summary</h2>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No renewals on this board."
            : `${total} renewal${total === 1 ? "" : "s"} on this board`}
        </p>
      </div>
      {stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stages on this renewals board yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const color = stageColorFromNameOrSlug(row.slug, row.color);
            const width = Math.max(row.count === 0 ? 0 : 8, Math.round((row.count / max) * 100));
            return (
              <li key={row.slug}>
                <Link
                  href={renewalsHref({
                    pipeline,
                    view: "list",
                    stage: row.slug,
                    pcSub: viewExtras?.pcSub,
                    lifeSub: viewExtras?.lifeSub,
                    healthSub: viewExtras?.healthSub,
                  })}
                  className="block rounded-md border border-border px-3 py-2 hover:border-primary"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge color={color}>{row.name}</StatusBadge>
                    <span className="text-sm font-semibold text-navy">{row.count}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#efe8dc]">
                    <div
                      className={cn("h-full rounded-full", statusBarClass(color))}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Click a stage to open the list filtered to those renewals.
      </p>
    </section>
  );
}
