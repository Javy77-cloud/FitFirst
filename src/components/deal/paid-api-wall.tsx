import { PAID_QUOTE_WALLS, PAID_WALL_HEADLINE } from "@/lib/deals/paid-walls";

export function PaidApiWall() {
  return (
    <section className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2" data-ff-paid-api-wall>
      <p className="text-sm font-semibold text-navy">Paid API wall</p>
      <p className="mt-0.5 text-helper text-muted-foreground">{PAID_WALL_HEADLINE}</p>
      <ul className="mt-2 space-y-1">
        {PAID_QUOTE_WALLS.map((wall) => (
          <li key={wall.id} className="text-xs">
            <span className="font-medium text-navy">{wall.label}</span>
            <span className="text-muted-foreground"> — {wall.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
