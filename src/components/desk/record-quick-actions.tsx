"use client";

import { createDealOutreach } from "@/app/actions/crm";
import { logDeskActivity } from "@/app/actions/activities-desk";
import {
  contactActionButtonClass,
  contactActionButtonStyle,
  mailtoHref,
  smsHref,
  telHref,
} from "@/lib/desk/contact-actions";
import { cn } from "@/lib/utils";

export type RecordQuickActionsProps = {
  phone?: string | null;
  email?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  testId?: string;
  className?: string;
};

/** Desk-wide Call / SMS / Email / Task chrome. Same pills as Deals row actions. */
export function RecordQuickActions({
  phone,
  email,
  dealId,
  leadId,
  contactId,
  accountId,
  policyId,
  testId = "record-quick-actions",
  className,
}: RecordQuickActionsProps) {
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(email?.trim());
  const related = { dealId, leadId, contactId, accountId, policyId };
  return (
    <div
      className={cn("mt-1 flex flex-nowrap gap-1", className)}
      data-testid={testId}
      data-ff-record-quick-actions=""
    >
      <QuickLink
        kind="call"
        label="Call"
        enabled={hasPhone}
        href={telHref(phone)}
        related={related}
        notes={hasPhone ? `Dial ${phone} (logged note — no live trunk).` : "Logged call from the record."}
      />
      <SmsQuick related={related} phone={phone} enabled={hasPhone} />
      <EmailQuick related={related} email={email} enabled={hasEmail} />
      <TaskQuick related={related} />
    </div>
  );
}

type RelatedIds = {
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
};

function RelatedFields({ related }: { related: RelatedIds }) {
  return (
    <>
      {related.dealId ? <input type="hidden" name="dealId" value={related.dealId} /> : null}
      {related.leadId ? <input type="hidden" name="leadId" value={related.leadId} /> : null}
      {related.contactId ? <input type="hidden" name="contactId" value={related.contactId} /> : null}
      {related.accountId ? <input type="hidden" name="accountId" value={related.accountId} /> : null}
      {related.policyId ? <input type="hidden" name="policyId" value={related.policyId} /> : null}
    </>
  );
}

function QuickLink({
  kind,
  label,
  enabled,
  href,
}: {
  kind: "call";
  label: string;
  enabled: boolean;
  href: string | null;
  related: RelatedIds;
  notes: string;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => {
        if (href) window.location.href = href;
      }}
      className={cn(
        "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
        contactActionButtonClass(kind),
      )}
      style={contactActionButtonStyle(kind)}
    >
      {label}
    </button>
  );
}

function SmsQuick({
  phone,
  enabled,
}: {
  related: RelatedIds;
  phone?: string | null;
  enabled: boolean;
}) {
  const href = smsHref(phone);
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => {
        if (href) window.location.href = href;
      }}
      className={cn(
        "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
        contactActionButtonClass("sms"),
      )}
      style={contactActionButtonStyle("sms")}
    >
      SMS
    </button>
  );
}

function EmailQuick({
  email,
  enabled,
}: {
  related: RelatedIds;
  email?: string | null;
  enabled: boolean;
}) {
  const href = mailtoHref(email);
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => {
        if (href) window.location.href = href;
      }}
      className={cn(
        "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold text-white disabled:opacity-40",
        contactActionButtonClass("email"),
      )}
      style={contactActionButtonStyle("email")}
    >
      Email
    </button>
  );
}

function TaskQuick({ related }: { related: RelatedIds }) {
  if (related.dealId) {
    return (
      <form action={createDealOutreach} className="inline">
        <RelatedFields related={related} />
        <input type="hidden" name="kind" value="task" />
        <button
          type="submit"
          className="inline-flex h-6 items-center rounded border border-primary/40 bg-primary/10 px-2 text-[11px] font-semibold text-primary hover:bg-primary/15"
          title="Adds a desk task on this deal. Nothing is sent."
        >
          Task
        </button>
      </form>
    );
  }
  return (
    <form
      action={async () => {
        const form = new FormData();
        form.set("kind", "task");
        form.set("title", "Follow-up task");
        form.set("notes", "Task logged from the record. Nothing is sent.");
        form.set("allowOrphan", "1");
        if (related.leadId) form.set("leadId", related.leadId);
        if (related.contactId) form.set("contactId", related.contactId);
        if (related.accountId) form.set("accountId", related.accountId);
        if (related.policyId) form.set("policyId", related.policyId);
        await logDeskActivity(form);
      }}
      className="inline"
    >
      <button
        type="submit"
        className="inline-flex h-6 items-center rounded border border-primary/40 bg-primary/10 px-2 text-[11px] font-semibold text-primary hover:bg-primary/15"
        title="Adds a desk task on this record. Nothing is sent."
      >
        Task
      </button>
    </form>
  );
}
