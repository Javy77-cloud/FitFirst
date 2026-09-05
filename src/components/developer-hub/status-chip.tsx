import { cn } from "@/lib/utils";
import {
  HUB_TOOL_STATUS_LABEL,
  type HubToolStatus,
} from "@/lib/developer-hub/types";

const TONE: Record<HubToolStatus, string> = {
  working: "bg-[var(--ff-green-bg)] text-[var(--ff-green)]",
  stub: "bg-secondary text-muted-foreground",
  needs_oauth: "bg-fit-yellow-bg text-fit-yellow",
};

export function StatusChip({
  status,
  className,
}: {
  status: HubToolStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TONE[status],
        className,
      )}
    >
      {HUB_TOOL_STATUS_LABEL[status]}
    </span>
  );
}
