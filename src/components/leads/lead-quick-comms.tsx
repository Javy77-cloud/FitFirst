import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import type { SerializedActivity } from "@/lib/db/queries";
import type { ActivityKind } from "@/lib/domain";

export function LeadQuickComms({
  items,
  leadId,
  dealId,
  contactName,
  contactPhone,
  contactEmail,
  officeAddress,
  clientAddress,
  initialKind = null,
}: {
  items: SerializedActivity[];
  leadId: string;
  dealId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  officeAddress?: string | null;
  clientAddress?: string | null;
  initialKind?: ActivityKind | null;
}) {
  return (
    <div className="min-w-0 w-full max-w-full" data-ff-lead-quick-comms="">
      <QuickCommsBoard
        items={items}
        leadId={leadId}
        dealId={dealId}
        contactName={contactName}
        contactPhone={contactPhone}
        contactEmail={contactEmail}
        officeAddress={officeAddress}
        clientAddress={clientAddress}
        initialKind={initialKind}
      />
    </div>
  );
}
