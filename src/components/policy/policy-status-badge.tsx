import { StatusBadge } from "@/components/status-badge";
import { displayStatusLabel, policyStatusColor } from "@/lib/desk/status-colors";

export function PolicyStatusBadge({ status }: { status: string }) {
  return <StatusBadge color={policyStatusColor(status)}>{displayStatusLabel(status)}</StatusBadge>;
}
