import { claimStatusLabel, isOpenClaimStatus } from "@/lib/claims";
import { Badge } from "@/components/ui/badge";

export function ClaimStatusBadge({ status }: { status: string }) {
  const open = isOpenClaimStatus(status);
  return (
    <Badge variant={status === "closed" ? "outline" : open ? "secondary" : "outline"}>
      {claimStatusLabel(status)}
    </Badge>
  );
}
