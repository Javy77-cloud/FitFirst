"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { logLeadQueueContact } from "@/app/actions/lead-follow-up";
import { publishLeadClock } from "@/lib/leads/clock-sync";
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
  leadId,
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
                leadId={leadId}
                kind={action.kind}
                method={action.method}
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
        const result = await logLeadQueueContact(form);
        publishLeadClock({
          leadId,
          dueAt: result?.dueAt ?? null,
          followUpName: result?.followUpName ?? "",
        });
        if (href && typeof window !== "undefined") {
          window.location.href = href;
        }
      }}
      className="block w-full"
    >
      <button
        type="submit"
        className={cn(
          "inline-flex h-7 w-full items-center justify-start rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
          contactActionButtonClass(kind),
        )}
        style={contactActionButtonStyle(kind)}
        title={
          href
            ? kind === "call"
              ? "Log a call and open tel:. In-app only — no trunk."
              : "Log contact and open the device composer. Send is a stub until a paid API is wired."
            : "Log this contact in-desk and advance the follow-up clock."
        }
      >
        {label}
      </button>
    </form>
  );
}
