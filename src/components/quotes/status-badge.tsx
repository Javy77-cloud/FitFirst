import { StatusBadge } from "@/components/status-badge";
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
    <StatusBadge status={status} className={className}>
      {copy[status]}
    </StatusBadge>
  );
}
