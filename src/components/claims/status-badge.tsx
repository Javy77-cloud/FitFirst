import { StatusBadge } from "@/components/status-badge";
import { claimStatusLabel } from "@/lib/claims";
import { statusColorFor } from "@/lib/desk/status-colors";

export function ClaimStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge color={statusColorFor(status)} uppercase={false}>
      {claimStatusLabel(status)}
    </StatusBadge>
  );
}
