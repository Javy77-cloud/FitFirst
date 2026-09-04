import { logDeskActivity } from "@/app/actions/activities-desk";
import { logInboundEmail, sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EmailTemplate } from "@/lib/db/schema";

function HiddenRelated(props: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}) {
  return (
    <>
      {props.contactId ? <input type="hidden" name="contactId" value={props.contactId} /> : null}
      {props.accountId ? <input type="hidden" name="accountId" value={props.accountId} /> : null}
      {props.policyId ? <input type="hidden" name="policyId" value={props.policyId} /> : null}
      {props.dealId ? <input type="hidden" name="dealId" value={props.dealId} /> : null}
      {props.leadId ? <input type="hidden" name="leadId" value={props.leadId} /> : null}
    </>
  );
}

export function RecordComms({
  contactId,
  accountId,
  policyId,
  dealId,
  leadId,
  phone,
  email,
  templates = [],
  autoSaveHint = false,
}: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  phone?: string | null;
  email?: string | null;
  templates?: EmailTemplate[];
  autoSaveHint?: boolean;
}) {
  const related = { contactId, accountId, policyId, dealId, leadId };
  return (
    <div className="space-y-4">
      {autoSaveHint ? (
        <p className="text-xs text-muted-foreground">
          Send or file from this record. Each email, text, call, meeting, or task saves onto the
          Timeline. There is no typed activity log.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <a href={`tel:${phone}`} className="rounded-md border border-border px-2.5 py-1 text-sm text-primary">
            Call {phone}
          </a>
        ) : null}
        {email ? (
          <a href={`mailto:${email}`} className="rounded-md border border-border px-2.5 py-1 text-sm text-primary">
            Email {email}
          </a>
        ) : null}
      </div>

      <form action={sendDeskEmail} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
        <HiddenRelated {...related} />
        {email ? <input type="hidden" name="toAddress" value={email} /> : null}
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-navy">Send email (logged on this record)</p>
          <p className="text-[11px] text-muted-foreground">
            Uses the desk template stub. The whole message stays on this conversation.
          </p>
        </div>
        {templates.length ? (
          <div className="sm:col-span-2">
            <Label className="text-xs">Template</Label>
            <select name="templateId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
              <option value="">Blank</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <Label className="text-xs">Subject</Label>
          <Input name="subject" className="mt-1 h-8" placeholder="HO3 bind confirmation" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Message</Label>
          <Textarea name="body" className="mt-1 min-h-20" placeholder="Full email body — stored on the record." />
        </div>
        <Button type="submit" size="sm">
          Send and log outbound
        </Button>
      </form>

      <form action={logInboundEmail} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
        <HiddenRelated {...related} />
        {email ? <input type="hidden" name="fromAddress" value={email} /> : null}
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-navy">Log inbound email</p>
          <p className="text-[11px] text-muted-foreground">
            Same thread as outbound when the subject matches (Re:/Fwd: stripped).
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Subject</Label>
          <Input name="subject" className="mt-1 h-8" placeholder="Re: HO3 bind confirmation" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Message received</Label>
          <Textarea name="body" className="mt-1 min-h-16" />
        </div>
        <Button type="submit" size="sm" variant="outline">
          File inbound on this record
        </Button>
      </form>

      <form action={sendDeskSms} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
        <HiddenRelated {...related} />
        {phone ? <input type="hidden" name="phone" value={phone} /> : null}
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-navy">Text / SMS</p>
        </div>
        <div>
          <Label className="text-xs">Direction</Label>
          <select name="direction" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
            <option value="outbound">Sent</option>
            <option value="inbound">Received</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Message</Label>
          <Input name="body" className="mt-1 h-8" placeholder="Text body kept on this record" />
        </div>
        <Button type="submit" size="sm" variant="outline">
          Log SMS
        </Button>
      </form>

      {autoSaveHint ? null : (
        <form action={logDeskActivity} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
          <HiddenRelated {...related} />
          <div>
            <Label className="text-xs">Call / meeting / task</Label>
            <select name="kind" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm" defaultValue="call">
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="task">Task</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input name="title" required className="mt-1 h-8" placeholder="Follow-up" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input name="notes" className="mt-1 h-8" />
          </div>
          <Button type="submit" size="sm">
            Log on this record
          </Button>
        </form>
      )}
    </div>
  );
}
