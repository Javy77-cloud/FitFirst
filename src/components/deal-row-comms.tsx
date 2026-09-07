import { logDeskActivity } from "@/app/actions/activities-desk";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { cn } from "@/lib/utils";

export function DealRowComms({
  dealId,
  contactId,
  accountId,
  phone,
  email,
}: {
  dealId: string;
  contactId?: string | null;
  accountId?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(email?.trim());
  return (
    <div className="flex flex-wrap gap-1">
      <CommsButton
        kind="call"
        label="Call"
        title="Phone call"
        dealId={dealId}
        contactId={contactId}
        accountId={accountId}
        enabled={hasPhone}
        notes={hasPhone ? `Dial ${phone} (logged note — no live trunk).` : "Logged call from deals list."}
      />
      <SmsButton
        label="SMS"
        dealId={dealId}
        contactId={contactId}
        accountId={accountId}
        phone={phone}
        enabled={hasPhone}
      />
      <EmailButton
        dealId={dealId}
        contactId={contactId}
        accountId={accountId}
        email={email}
        enabled={hasEmail}
      />
    </div>
  );
}

function actionClass(enabled: boolean) {
  return cn(
    "rounded border px-1.5 py-0.5 text-[11px]",
    enabled
      ? "border-primary/40 bg-primary/10 font-medium text-primary hover:bg-primary/15"
      : "cursor-not-allowed border-border text-muted-foreground opacity-50",
  );
}

function CommsButton({
  kind,
  label,
  title,
  dealId,
  contactId,
  accountId,
  notes,
  enabled,
}: {
  kind: string;
  label: string;
  title: string;
  dealId: string;
  contactId?: string | null;
  accountId?: string | null;
  notes: string;
  enabled: boolean;
}) {
  return (
    <form action={logDeskActivity}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="body" value={notes} />
      <input type="hidden" name="direction" value="outbound" />
      <input type="hidden" name="dealId" value={dealId} />
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
      <button type="submit" disabled={!enabled} className={actionClass(enabled)}>
        {label}
      </button>
    </form>
  );
}

function SmsButton({
  label,
  dealId,
  contactId,
  accountId,
  phone,
  asTask,
  enabled,
}: {
  label: string;
  dealId: string;
  contactId?: string | null;
  accountId?: string | null;
  phone?: string | null;
  asTask?: boolean;
  enabled: boolean;
}) {
  const body = phone ? `Texted ${phone}` : "Text message logged from deals list.";
  if (asTask) {
    return (
      <form action={logDeskActivity}>
        <input type="hidden" name="kind" value="task" />
        <input type="hidden" name="title" value="Text / SMS task" />
        <input type="hidden" name="notes" value={phone ? `SMS task to ${phone}` : "Text/SMS task from deals list."} />
        <input type="hidden" name="dealId" value={dealId} />
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
        <button type="submit" disabled={!enabled} className={actionClass(enabled)}>
          {label}
        </button>
      </form>
    );
  }
  return (
    <form action={sendDeskSms}>
      <input type="hidden" name="direction" value="outbound" />
      <input type="hidden" name="body" value={body} />
      {phone ? <input type="hidden" name="phone" value={phone} /> : null}
      <input type="hidden" name="dealId" value={dealId} />
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
      <button type="submit" disabled={!enabled} className={actionClass(enabled)}>
        {label}
      </button>
    </form>
  );
}

function EmailButton({
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
  return (
    <form action={sendDeskEmail}>
      <input type="hidden" name="subject" value="Desk follow-up" />
      <input type="hidden" name="body" value={email ? `Emailed ${email} from the deals list.` : "Email logged from deals list."} />
      {email ? <input type="hidden" name="toAddress" value={email} /> : null}
      <input type="hidden" name="dealId" value={dealId} />
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
      <button type="submit" disabled={!enabled} className={actionClass(enabled)}>
        Email
      </button>
    </form>
  );
}
