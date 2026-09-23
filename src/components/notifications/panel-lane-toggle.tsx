import Link from "next/link";
import {
  PANEL_LANE_META,
  panelLaneHref,
  type PanelLane,
} from "@/lib/notifications/lanes";

/** Work | Inbox segmented control — mirrors pipeline New | Renewals density. */
export function NotificationPanelLaneToggle({
  lane,
  counts,
}: {
  lane: PanelLane;
  counts: Record<PanelLane, number>;
}) {
  return (
    <div
      className="mb-4 inline-flex rounded-xl border border-navy/20 bg-card p-1 shadow-sm"
      data-ff-panel-lane-toggle=""
      role="tablist"
      aria-label="Notification lane"
    >
      {(["work", "inbox"] as const).map((id) => {
        const active = lane === id;
        const meta = PANEL_LANE_META[id];
        const count = counts[id] ?? 0;
        return (
          <Link
            key={id}
            href={panelLaneHref(id)}
            role="tab"
            aria-selected={active}
            data-active={active ? "true" : "false"}
            data-ff-panel-lane={id}
            className={
              active
                ? "rounded-lg bg-navy px-5 py-2 text-base font-semibold text-white shadow-sm"
                : "rounded-lg px-5 py-2 text-base font-semibold text-muted-foreground hover:bg-muted/70 hover:text-navy"
            }
          >
            {meta.label}
            <span
              className={
                active
                  ? "ml-2 inline-flex min-w-[1.25rem] justify-center rounded-full bg-white/20 px-1.5 text-sm font-medium"
                  : "ml-2 inline-flex min-w-[1.25rem] justify-center rounded-full bg-muted px-1.5 text-sm font-medium text-navy/70"
              }
              data-ff-panel-lane-count={id}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
