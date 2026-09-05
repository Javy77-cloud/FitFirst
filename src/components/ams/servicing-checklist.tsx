import type { ServicingChecklist } from "@/lib/ams/checklist";

export function ServicingChecklistCard({
  checklist,
}: {
  checklist: ServicingChecklist;
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Servicing checklist</h2>
        <p className="text-sm text-muted-foreground">
          {checklist.readyCount} ready · {checklist.missingCount} open
        </p>
      </div>
      <p className="mt-1 text-base text-muted-foreground">
        Dec, ID cards, and AOR live on this Policy after bind. Shopping docs stay on the Deal.
      </p>
      <ul className="mt-3 divide-y divide-border rounded-md border border-border">
        {checklist.items.map((item) => (
          <li key={item.key} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
            <span
              className={`shrink-0 text-xs font-semibold uppercase ${
                item.ok ? "text-[var(--ff-green)]" : "text-muted-foreground"
              }`}
            >
              {item.ok ? "On file" : "Missing"}
            </span>
            <div className="min-w-0">
              <div className="font-medium text-navy">{item.label}</div>
              <div className="text-sm text-muted-foreground">{item.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
