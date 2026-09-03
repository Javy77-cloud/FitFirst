import Link from "next/link";
import { HOME_LINE_LABEL } from "@/lib/home/lines";
import { whoNeedsLine, type CrossSellGap, type SellableChip } from "@/lib/home/aggregate";
import type { SellableLineKey } from "@/lib/home/lines";
import { cn } from "@/lib/utils";

function heldLabel(row: CrossSellGap): string {
  return row.held.map((key) => HOME_LINE_LABEL[key]).join(" + ") || "—";
}

export function CrossSellPanel({
  chips,
  gaps,
  selected,
}: {
  chips: SellableChip[];
  gaps: CrossSellGap[];
  selected: SellableLineKey | null;
}) {
  const listed = selected ? whoNeedsLine(gaps, selected) : [];
  const selectedLabel = selected ? HOME_LINE_LABEL[selected] : null;

  return (
    <section id="cross-sell" className="ff-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-navy">Cross-sell</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          In-force households only. Click a line to see who still needs it. Quotes do not count.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => {
            const active = selected === chip.key;
            return (
              <Link
                key={chip.key}
                href={active ? "/#cross-sell" : `/?need=${chip.key.toLowerCase()}#cross-sell`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-navy hover:border-primary",
                )}
              >
                {chip.label}
                <span className={cn("tabular-nums", active ? "opacity-90" : "text-muted-foreground")}>
                  {chip.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {!selected ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          Pick Home, Auto, Flood, or Umbrella. Ana Dib is HO3-only — Auto, Flood, and Umbrella stay
          open.
        </p>
      ) : listed.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          No in-force household is missing {selectedLabel}.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {listed.map((row) => (
            <li key={row.contactId} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
              <span className="text-base font-medium text-navy">{row.name}</span>
              <span className="text-sm text-muted-foreground">
                Has {heldLabel(row)} · needs {selectedLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
