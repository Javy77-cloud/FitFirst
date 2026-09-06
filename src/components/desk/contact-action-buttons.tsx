"use client";

import { logLeadQueueContact } from "@/app/actions/lead-follow-up";
import {
  CONTACT_ACTION_BUTTONS,
  contactActionButtonClass,
  contactActionButtonStyle,
  contactActionHref,
  type ContactActionKind,
} from "@/lib/desk/contact-actions";
import { cn } from "@/lib/utils";

export function ContactActionButtons({
  leadId,
  phone,
  email,
}: {
  leadId: string;
  phone?: string | null;
  email?: string | null;
}) {
  return (
    <div className="mt-1 flex flex-nowrap gap-1" data-testid="lead-contact-actions">
      {CONTACT_ACTION_BUTTONS.map((action) => {
        const href = contactActionHref(action.kind, { phone, email });
        return (
          <ContactActionButton
            key={action.kind}
            leadId={leadId}
            kind={action.kind}
            method={action.method}
            label={action.label}
            href={href}
          />
        );
      })}
    </div>
  );
}

function ContactActionButton({
  leadId,
  kind,
  method,
  label,
  href,
}: {
  leadId: string;
  kind: ContactActionKind;
  method: "call" | "text" | "email";
  label: string;
  href: string | null;
}) {
  return (
    <form
      action={async () => {
        const form = new FormData();
        form.set("leadId", leadId);
        form.set("method", method);
        await logLeadQueueContact(form);
        if (href && typeof window !== "undefined") {
          window.location.href = href;
        }
      }}
      className="inline"
    >
      <button
        type="submit"
        disabled={!href}
        className={cn(
          "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
          contactActionButtonClass(kind),
        )}
        style={contactActionButtonStyle(kind)}
        title={
          href
            ? kind === "call"
              ? "Log a call and open tel:. In-app only — no trunk."
              : "Log contact and open the device composer. Send is a stub until a paid API is wired."
            : kind === "email"
              ? "No email on this lead"
              : "No phone on this lead"
        }
      >
        {label}
      </button>
    </form>
  );
}
