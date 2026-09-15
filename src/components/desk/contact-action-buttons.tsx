"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONTACT_ACTION_BUTTONS,
  contactActionButtonClass,
  contactActionButtonStyle,
  contactActionHref,
  type ContactActionKind,
} from "@/lib/desk/contact-actions";
import { cn } from "@/lib/utils";

export function ContactActionButtons({
  phone,
  email,
}: {
  leadId: string;
  phone?: string | null;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        type="button"
        aria-label="Activity"
        title="Activity"
        data-testid="lead-activity-menu"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Activity className="size-3.5" strokeWidth={2.25} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[9.5rem] p-1.5" sideOffset={4}>
        <div className="flex flex-col gap-1" data-testid="lead-contact-actions">
          {CONTACT_ACTION_BUTTONS.map((action) => {
            const href = contactActionHref(action.kind, { phone, email });
            return (
              <ContactActionButton
                key={action.kind}
                kind={action.kind}
                label={action.label}
                href={href}
              />
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContactActionButton({
  kind,
  label,
  href,
}: {
  kind: ContactActionKind;
  label: string;
  href: string | null;
}) {
  return (
    <button
      type="button"
      disabled={!href}
      onClick={() => {
        if (href) window.location.href = href;
      }}
      className={cn(
        "inline-flex h-7 w-full items-center justify-start rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
        contactActionButtonClass(kind),
      )}
      style={contactActionButtonStyle(kind)}
      title={
        href
          ? kind === "call"
            ? "Open the device dialer. Log the call after it ends with an outcome."
            : "Open the device composer. The timeline logs only after send."
          : "Add a phone or email on this lead first."
      }
    >
      {label}
    </button>
  );
}
