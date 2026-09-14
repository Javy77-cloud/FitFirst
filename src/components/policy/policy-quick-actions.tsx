"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
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

/** Activity menu beside a policy name — Call / SMS / Email / Task / Meeting (same chrome as Deals). */
export function PolicyQuickActions({
  policyId,
  phone,
  email,
  contactId,
  accountId,
}: {
  policyId: string;
  phone?: string | null;
  email?: string | null;
  contactId?: string | null;
  accountId?: string | null;
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
        data-testid="policy-activity-menu"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <Activity className="size-3.5" strokeWidth={2.25} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[9.5rem] p-1.5" sideOffset={4}>
        <div className="flex flex-col gap-1" data-testid="policy-quick-actions">
          <QuickLink
            kind="call"
            label="Call"
            enabled={hasPhone}
            href={telHref(phone)}
            policyId={policyId}
            contactId={contactId}
            accountId={accountId}
            notes={hasPhone ? `Dial ${phone} (logged note — no live trunk).` : "Logged call from policies list."}
          />
          <SmsQuick
            policyId={policyId}
            contactId={contactId}
            accountId={accountId}
            phone={phone}
            enabled={hasPhone}
          />
          <EmailQuick
            policyId={policyId}
            contactId={contactId}
            accountId={accountId}
            email={email}
            enabled={hasEmail}
          />
          <form
            action={async () => {
              const form = new FormData();
              form.set("kind", "task");
              form.set("title", "Follow up");
              form.set("notes", "Task from policies list.");
              form.set("allowOrphan", "1");
              form.set("policyId", policyId);
              if (contactId) form.set("contactId", contactId);
              if (accountId) form.set("accountId", accountId);
              await logDeskActivity(form);
              setOpen(false);
            }}
            className="block w-full"
          >
            <button
              type="submit"
              className={menuBtn}
              style={{ backgroundColor: DEAL_TASK_ACTION_COLOR, color: "#ffffff" }}
              title="Adds a desk task on this policy. Nothing is sent."
            >
              Task
            </button>
          </form>
          <form
            action={async () => {
              const form = new FormData();
              form.set("kind", "meeting");
              form.set("title", "Meeting");
              form.set("notes", "Meeting from policies list.");
              form.set("allowOrphan", "1");
              form.set("policyId", policyId);
              if (contactId) form.set("contactId", contactId);
              if (accountId) form.set("accountId", accountId);
              await logDeskActivity(form);
              setOpen(false);
            }}
            className="block w-full"
          >
            <button
              type="submit"
              className={menuBtn}
              style={{ backgroundColor: DEAL_MEETING_ACTION_COLOR, color: "#ffffff" }}
              title="Logs a meeting on this policy."
            >
              Meeting
            </button>
          </form>
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
  policyId,
  contactId,
  accountId,
  notes,
}: {
  kind: "call";
  label: string;
  enabled: boolean;
  href: string | null;
  policyId: string;
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
        form.set("policyId", policyId);
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
  policyId,
  contactId,
  accountId,
  phone,
  enabled,
}: {
  policyId: string;
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
        form.set("body", phone ? `Texted ${phone}` : "Text message logged from policies list.");
        if (phone) form.set("phone", phone);
        form.set("policyId", policyId);
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
  policyId,
  contactId,
  accountId,
  email,
  enabled,
}: {
  policyId: string;
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
        form.set("body", email ? `Emailed ${email} from the policies list.` : "Email logged from policies list.");
        if (email) form.set("toAddress", email);
        form.set("policyId", policyId);
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
