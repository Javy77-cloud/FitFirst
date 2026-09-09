"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { createDealOutreach } from "@/app/actions/crm";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { MeetingButton } from "@/components/crm/meeting-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEAL_MEETING_ACTION_COLOR, DEAL_TASK_ACTION_COLOR } from "@/lib/deals/pipeline-desk";
import {
  contactActionButtonClass,
  contactActionButtonStyle,
  mailtoHref,
  smsHref,
  telHref,
} from "@/lib/desk/contact-actions";
import { cn } from "@/lib/utils";

const menuBtn =
  "inline-flex h-7 w-full items-center justify-start rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40";

export function DealQuickActions({
  dealId,
  phone,
  email,
  contactId,
  accountId,
  leadId,
  homeAddress,
}: {
  dealId: string;
  phone?: string | null;
  email?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
  homeAddress?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(email?.trim());
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        type="button"
        aria-label="Activity"
        title="Activity"
        data-testid="deal-activity-menu"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Activity className="size-3.5" strokeWidth={2.25} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[9.5rem] p-1.5" sideOffset={4}>
        <div className="flex flex-col gap-1" data-testid="deal-quick-actions">
          <QuickLink
            kind="call"
            label="Call"
            enabled={hasPhone}
            href={telHref(phone)}
            dealId={dealId}
            contactId={contactId}
            accountId={accountId}
            notes={hasPhone ? `Dial ${phone} (logged note — no live trunk).` : "Logged call from deals list."}
          />
          <SmsQuick
            dealId={dealId}
            contactId={contactId}
            accountId={accountId}
            phone={phone}
            enabled={hasPhone}
          />
          <EmailQuick
            dealId={dealId}
            contactId={contactId}
            accountId={accountId}
            email={email}
            enabled={hasEmail}
          />
          <form action={createDealOutreach} className="block w-full">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="kind" value="task" />
            {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
            {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
            <button
              type="submit"
              className={menuBtn}
              style={{ backgroundColor: DEAL_TASK_ACTION_COLOR, color: "#ffffff" }}
              title="Adds a desk task on this deal. Nothing is sent."
            >
              Task
            </button>
          </form>
          <div onClick={() => setOpen(false)}>
            <MeetingButton
              dealId={dealId}
              homeAddress={homeAddress}
              className={menuBtn}
              style={{ backgroundColor: DEAL_MEETING_ACTION_COLOR, color: "#ffffff" }}
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickLink({
  kind,
  label,
  enabled,
  href,
  dealId,
  contactId,
  accountId,
  notes,
}: {
  kind: "call";
  label: string;
  enabled: boolean;
  href: string | null;
  dealId: string;
  contactId?: string | null;
  accountId?: string | null;
  notes: string;
}) {
  return (
    <form
      action={async () => {
        const form = new FormData();
        form.set("kind", kind);
        form.set("title", "Phone call");
        form.set("notes", notes);
        form.set("body", notes);
        form.set("direction", "outbound");
        form.set("dealId", dealId);
        form.set("allowOrphan", "1");
        if (contactId) form.set("contactId", contactId);
        if (accountId) form.set("accountId", accountId);
        await logDeskActivity(form);
        if (href && typeof window !== "undefined") window.location.href = href;
      }}
      className="block w-full"
    >
      <button
        type="submit"
        disabled={!enabled}
        className={cn(menuBtn, contactActionButtonClass(kind))}
        style={contactActionButtonStyle(kind)}
      >
        {label}
      </button>
    </form>
  );
}

function SmsQuick({
  dealId,
  contactId,
  accountId,
  phone,
  enabled,
}: {
  dealId: string;
  contactId?: string | null;
  accountId?: string | null;
  phone?: string | null;
  enabled: boolean;
}) {
  const href = smsHref(phone);
  return (
    <form
      action={async () => {
        const form = new FormData();
        form.set("direction", "outbound");
        form.set("body", phone ? `Texted ${phone}` : "Text message logged from deals list.");
        if (phone) form.set("phone", phone);
        form.set("dealId", dealId);
        if (contactId) form.set("contactId", contactId);
        if (accountId) form.set("accountId", accountId);
        await sendDeskSms(form);
        if (href && typeof window !== "undefined") window.location.href = href;
      }}
      className="block w-full"
    >
      <button
        type="submit"
        disabled={!enabled}
        className={cn(menuBtn, contactActionButtonClass("sms"))}
        style={contactActionButtonStyle("sms")}
      >
        SMS
      </button>
    </form>
  );
}

function EmailQuick({
  dealId,
  contactId,
  accountId,
  email,
  enabled,
}: {
  dealId: string;
  contactId?: string | null;
  accountId?: string | null;
  email?: string | null;
  enabled: boolean;
}) {
  const href = mailtoHref(email);
  return (
    <form
      action={async () => {
        const form = new FormData();
        form.set("subject", "Desk follow-up");
        form.set("body", email ? `Emailed ${email} from the deals list.` : "Email logged from deals list.");
        if (email) form.set("toAddress", email);
        form.set("dealId", dealId);
        if (contactId) form.set("contactId", contactId);
        if (accountId) form.set("accountId", accountId);
        await sendDeskEmail(form);
        if (href && typeof window !== "undefined") window.location.href = href;
      }}
      className="block w-full"
    >
      <button
        type="submit"
        disabled={!enabled}
        className={cn(menuBtn, contactActionButtonClass("email"))}
        style={contactActionButtonStyle("email")}
      >
        Email
      </button>
    </form>
  );
}
