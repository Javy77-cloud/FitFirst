import type { ReactNode } from "react";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";

/**
 * Business detail: full-width layout fields + 420px Conversations/Info rail.
 * Save stays with the form in children — never under the rail.
 * Mirrors ContactDetailWorkspace; Edit Layout stays businesses-module isolated.
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
        <div className="mb-2 flex items-center justify-end" data-ff-business-edit-layout-bar="">
          <EditLayoutLink module="businesses" />
        </div>
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
