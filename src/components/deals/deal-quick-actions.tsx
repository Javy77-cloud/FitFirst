"use client";

import { createDealOutreach } from "@/app/actions/crm";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import {
  contactActionButtonClass,
  contactActionButtonStyle,
  mailtoHref,
  smsHref,
  telHref,
} from "@/lib/desk/contact-actions";
import { cn } from "@/lib/utils";

export function DealQuickActions({
  dealId,
  phone,
  email,
  contactId,
  accountId,
  leadId,
}: {
  dealId: string;
  phone?: string | null;
  email?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
}) {
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(email?.trim());
  return (
    <div className="mt-1 flex flex-nowrap gap-1" data-testid="deal-quick-actions">
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
      <form action={createDealOutreach} className="inline">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="kind" value="task" />
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        <button
          type="submit"
          className="inline-flex h-6 items-center rounded border border-primary/40 bg-primary/10 px-2 text-[11px] font-semibold text-primary hover:bg-primary/15"
          title="Adds a desk task on this deal. Nothing is sent."
        >
          Task
        </button>
      </form>
    </div>
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
      className="inline"
    >
      <button
        type="submit"
        disabled={!enabled}
        className={cn(
          "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
          contactActionButtonClass(kind),
        )}
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
      className="inline"
    >
      <button
        type="submit"
        disabled={!enabled}
        className={cn(
          "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
          contactActionButtonClass("sms"),
        )}
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
      className="inline"
    >
      <button
        type="submit"
        disabled={!enabled}
        className={cn(
          "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
          contactActionButtonClass("email"),
        )}
        style={contactActionButtonStyle("email")}
      >
        Email
      </button>
    </form>
  );
}
