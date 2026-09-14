import { clientStatusColor, displayStatusLabel, STATUS_BAR_CLASS } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

/** Solid status dot left of contact name — color tracks Client status (not health). */
export function ClientStatusDot({ status }: { status: string }) {
  const key = clientStatusColor(status);
  const label = displayStatusLabel(status);
  return (
    <span
      className="inline-flex shrink-0 items-center"
      title={label}
      data-ff-contact-status-dot={status || "unknown"}
    >
      <span
        className={cn("size-2.5 rounded-full", STATUS_BAR_CLASS[key] ?? "bg-slate-500")}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
