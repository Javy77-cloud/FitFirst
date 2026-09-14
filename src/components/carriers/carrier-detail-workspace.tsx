import type { ReactNode } from "react";

/**
 * Carrier detail: main sections | Quick Comms + Info rail (420px).
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
      style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}
      data-ff-carrier-layout="layout-rail"
    >
      <div className="min-w-0 w-full space-y-3" data-ff-carrier-main="">
        {children}
      </div>
      {rail ? (
        <aside
          className="min-w-0 w-full space-y-3 pt-0"
          data-ff-carrier-context-rail=""
          data-ff-deal-right-rail=""
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
