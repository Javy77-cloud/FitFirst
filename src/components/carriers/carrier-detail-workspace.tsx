import type { ReactNode } from "react";

/**
 * Carrier detail: main sections | Quick Comms + Info rail (320px).
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
      style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}
      data-ff-carrier-layout="layout-rail"
    >
      <div className="min-w-0 w-full space-y-3" data-ff-carrier-main="">
        {children}
      </div>
      {rail ? (
        <aside
          className="w-[320px] min-w-[320px] max-w-[320px] shrink-0 grow-0 basis-[320px] space-y-3 overflow-x-hidden pt-0"
          data-ff-carrier-context-rail=""
          data-ff-deal-right-rail=""
          data-ff-deal-rail-lock="320"
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
