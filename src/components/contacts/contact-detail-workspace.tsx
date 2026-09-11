import type { ReactNode } from "react";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";

/**
 * Contact detail: full-width layout fields + 420px Conversations/Info rail.
 * Save stays with the form in children — never under the rail.
 */
export function ContactDetailWorkspace({
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
      data-ff-contact-layout="layout-rail"
    >
      <div className="min-w-0 w-full" data-ff-contact-main="">
        <div className="mb-2 flex items-center justify-end" data-ff-contact-edit-layout-bar="">
          <EditLayoutLink module="contacts" />
        </div>
        {children}
      </div>
      {rail ? (
        <aside
          className="min-w-0 w-full space-y-3 overflow-x-hidden"
          data-ff-contact-context-rail=""
          data-ff-deal-right-rail=""
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
