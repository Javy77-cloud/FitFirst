import { BindPath } from "@/components/deal/bind-path";
import type { AccountKind } from "@/lib/crm/bind";

export function BindForm({
  dealId,
  defaultAccountKind = "personal",
  line,
}: {
  dealId: string;
  defaultAccountKind?: AccountKind;
  line?: string;
}) {
  return (
    <BindPath
      dealId={dealId}
      defaultTarget={defaultAccountKind === "commercial" ? "account" : "contact"}
      lineLabel={line ?? "this line"}
      isAna={false}
      bound={false}
      party={null}
      policies={[]}
    />
  );
}
