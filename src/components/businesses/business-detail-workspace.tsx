import type { ReactNode } from "react";

/**
 * Business detail: full-width main column + 420px right rail (Quick Comms + Info).
 * Always side-by-side like Lead/Deal — never stack the rail under the fields.
 * Uses an inline gridTemplateColumns lock so the rail cannot drop under fields
 * the way `grid-cols-1` / `lg:grid-cols-[…]` does at smaller widths.
 * ≥24px gap between left column and right communication panel.
 * Inline blur-save lives in the main column — never a page-level Save under the rail.
 */
export function BusinessDetailWorkspace({
  rail,
  children,
}: {
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="grid w-full items-start gap-x-6"
      style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}
      data-ff-business-layout="layout-rail"
    >
      <div className="min-w-0 w-full" data-ff-business-main="">
        {children}
      </div>
      {rail ? (
        <aside
          className="min-w-0 w-full space-y-3 overflow-x-hidden"
          data-ff-business-context-rail=""
          data-ff-deal-right-rail=""
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
