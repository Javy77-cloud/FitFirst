import type { ReactNode } from "react";
import { ACTIVITY_RAIL_ASIDE_CLASS, ACTIVITY_RAIL_COLUMNS, ACTIVITY_RAIL_LOCK } from "@/lib/desk/activity-rail";

/**
 * Contact detail: top chip jump bar + main sections | Quick Comms + Info rail.
 * Outer grid always keeps the rail on the RIGHT — never stacks under fields.
 * Quick Comms sits at the TOP of the right column so it lines up with the chip menu.
 * ≥24px gap between main and right panel.
 */
export function ContactDetailWorkspace({
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
      data-ff-contact-layout="layout-rail"
    >
      <div className="min-w-0 w-full space-y-3" data-ff-contact-main="">
        {nav ? (
          <div className="min-w-0" data-ff-contact-top-nav-slot="">
            {nav}
          </div>
        ) : null}
        <div className="min-w-0" data-ff-contact-main-sections="">
          {children}
        </div>
      </div>
      {rail ? (
        <aside
          className={`${ACTIVITY_RAIL_ASIDE_CLASS} pt-0`}
          data-ff-contact-context-rail=""
          data-ff-deal-right-rail=""
          data-ff-deal-rail-lock={ACTIVITY_RAIL_LOCK}
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
