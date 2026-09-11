import type { ReactNode } from "react";

/**
 * Business detail: top chip jump bar + main sections | Quick Comms + Info rail.
 * Outer grid always keeps the rail on the RIGHT — never stacks under fields.
 * Quick Comms sits at the TOP of the right column so it lines up with the chip menu.
 * ≥24px gap between main and right panel.
 */
export function BusinessDetailWorkspace({
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
      style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}
      data-ff-business-layout="layout-rail"
    >
      <div className="min-w-0 w-full space-y-3" data-ff-business-main="">
        {nav ? (
          <div className="min-w-0" data-ff-business-top-nav-slot="">
            {nav}
          </div>
        ) : null}
        <div className="min-w-0" data-ff-business-main-sections="">
          {children}
        </div>
      </div>
      {rail ? (
        <aside
          className="min-w-0 w-full space-y-3 overflow-x-hidden pt-0"
          data-ff-business-context-rail=""
          data-ff-deal-right-rail=""
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
