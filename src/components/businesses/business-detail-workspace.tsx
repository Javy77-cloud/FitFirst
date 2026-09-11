import type { ReactNode } from "react";

/**
 * Business detail: full-width main column + 420px Conversations/Info rail.
 * Mirrors ContactDetailWorkspace chrome — Edit Layout lives in the overflow menu.
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
      className="grid w-full items-start gap-x-5"
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
