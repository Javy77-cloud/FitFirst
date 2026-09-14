import { displayStatusLabel, policyStatusColor, STATUS_BAR_CLASS } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

/** Solid status dot left of policy display name — green active, amber pending, red lapsed. */
export function PolicyStatusDot({ status }: { status: string }) {
  const key = policyStatusColor(status);
  const label = displayStatusLabel(status);
  return (
    <span
      className="inline-flex shrink-0 items-center"
      title={label}
      data-ff-policy-status-dot={status || "unknown"}
    >
      <span
        className={cn("size-2.5 rounded-full", STATUS_BAR_CLASS[key] ?? "bg-slate-500")}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
