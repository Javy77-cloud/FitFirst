import { ContactSectionBlock } from "@/components/contacts/contact-section-block";
import { ACTIVITY_KINDS, type ActivityKind } from "@/lib/domain";
import {
  LEAD_ACTIVITY_SECTION_EMPTY,
  LEAD_ACTIVITY_SECTION_TITLE,
  type LeadActivityListItem,
} from "@/lib/leads/lead-activity";

export function LeadActivityPanels({
  itemsByKind,
}: {
  itemsByKind: Record<ActivityKind, LeadActivityListItem[]>;
}) {
  return (
    <div className="space-y-3" data-ff-lead-activity="">
      {ACTIVITY_KINDS.map((kind) => (
        <ContactSectionBlock
          key={kind}
          id={kind}
          title={LEAD_ACTIVITY_SECTION_TITLE[kind]}
          count={itemsByKind[kind].length}
          emptyLabel={LEAD_ACTIVITY_SECTION_EMPTY[kind]}
          items={itemsByKind[kind]}
        />
      ))}
    </div>
  );
}
