import type { ReactNode } from "react";
import { ACTIVITY_RAIL_ASIDE_CLASS, ACTIVITY_RAIL_COLUMNS, ACTIVITY_RAIL_LOCK, ACTIVITY_RAIL_PX } from "@/lib/desk/activity-rail";

/**
 * Policy detail: chip tabs + panels | Quick Comms + Info rail.
 * Outer grid keeps the rail on the RIGHT — never stacks under fields.
 */
export function PolicyDetailWorkspace({
  nav,
  rail,
  children,
}: {
  nav?: ReactNode;
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="grid w-full items-start gap-x-6"
      style={{ gridTemplateColumns: ACTIVITY_RAIL_COLUMNS }}
      data-ff-policy-layout="layout-rail"
    >
      <div className="min-w-0 w-full space-y-3" data-ff-policy-main="">
        {nav ? (
          <div className="min-w-0 overflow-x-auto" data-ff-policy-top-nav-slot="">
            {nav}
          </div>
        ) : null}
        <div className="min-w-0" data-ff-policy-main-sections="">
          {children}
        </div>
      </div>
      {rail ? (
        <aside
          className={`${ACTIVITY_RAIL_ASIDE_CLASS} pt-0`}
          data-ff-policy-context-rail=""
          data-ff-deal-right-rail=""
          data-ff-deal-rail-lock={ACTIVITY_RAIL_LOCK}
          style={{ width: ACTIVITY_RAIL_PX, maxWidth: ACTIVITY_RAIL_PX }}
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
