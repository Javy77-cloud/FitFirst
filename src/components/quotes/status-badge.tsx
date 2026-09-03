import { cn } from "@/lib/utils";
import type { TrackingStatus } from "@/lib/domain";

const copy: Record<TrackingStatus, string> = {
  quoted: "Quoted",
  declined: "Declined",
  skip: "Skip",
  bound: "Bound",
};

export function TrackingStatusBadge({
  status,
  className,
}: {
  status: TrackingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        status === "quoted" && "bg-fit-green-bg text-fit-green",
        status === "bound" && "bg-secondary text-navy",
        status === "declined" && "bg-fit-red-bg text-fit-red",
        status === "skip" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {copy[status]}
    </span>
  );
}
