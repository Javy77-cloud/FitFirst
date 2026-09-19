import type { ReactNode } from "react";

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
      style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}
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
          className="w-[320px] min-w-[320px] max-w-[320px] shrink-0 grow-0 basis-[320px] space-y-3 overflow-x-hidden pt-0"
          data-ff-policy-context-rail=""
          data-ff-deal-right-rail=""
          data-ff-deal-rail-lock="320"
          style={{ width: 320, maxWidth: 320 }}
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
