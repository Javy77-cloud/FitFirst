"use client";

import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import {
  buildPropertyProtectionDisplay,
  propertyProtectionFilledCount,
  type PropertyProtectionSnapshot,
} from "@/lib/policy/property-protection";

/**
 * Quiet, collapsed-by-default Home property/protection snapshot on policy Overview.
 * Always shown for homeowners (gate is in overview-tab), including empty pre-mint shells.
 */
export function PropertyProtectionSection({
  snapshot,
}: {
  snapshot: PropertyProtectionSnapshot | null | undefined;
}) {
  const groups = buildPropertyProtectionDisplay(snapshot);
  const filled = propertyProtectionFilledCount(snapshot);
  const empty = groups.length === 0;

  return (
    <CollapsibleSection
      id="property-protection"
      title="Property & protection"
      badge={`${filled} on file`}
      defaultOpen={false}
      data-ff="policy-property-protection"
      className="border-amber-200/80"
    >
      {empty ? null : (
        <>

          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} data-ff-property-protection-group={group.id}>
                <h3 className="mb-2 text-sm font-semibold text-navy">{group.title}</h3>
                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {group.fields.map((row) => (
                    <div key={row.key} data-ff-property-protection-field={row.key}>
                      <dt className="text-helper text-muted-foreground">{row.label}</dt>
                      <dd className="font-medium text-navy">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
