import type { ReactNode } from "react";
import { ACTIVITY_RAIL_ASIDE_CLASS, ACTIVITY_RAIL_COLUMNS, ACTIVITY_RAIL_LOCK } from "@/lib/desk/activity-rail";

/**
 * Carrier detail: main sections | Quick Comms + Info rail.
 * Same chrome as Contacts / Businesses / Deals — never stacks under fields.
 */
export function CarrierDetailWorkspace({
  rail,
  children,
}: {
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="grid w-full items-start gap-x-6"
      style={{ gridTemplateColumns: ACTIVITY_RAIL_COLUMNS }}
      data-ff-carrier-layout="layout-rail"
    >
      <div className="min-w-0 w-full space-y-3" data-ff-carrier-main="">
        {children}
      </div>
      {rail ? (
        <aside
          className={`${ACTIVITY_RAIL_ASIDE_CLASS} pt-0`}
          data-ff-carrier-context-rail=""
          data-ff-deal-right-rail=""
          data-ff-deal-rail-lock={ACTIVITY_RAIL_LOCK}
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
