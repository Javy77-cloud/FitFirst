"use client";

import Link from "next/link";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { Button } from "@/components/ui/button";
import {
  contactActionButtonClass,
  contactActionButtonStyle,
  mailtoHref,
  smsHref,
  telHref,
} from "@/lib/desk/contact-actions";
import { cn } from "@/lib/utils";

const btn =
  "h-8 px-3 text-xs font-semibold text-white hover:!text-white disabled:opacity-40";

export function BusinessQuickActions({
  accountId,
  phone,
  email,
  contactId,
}: {
  accountId: string;
  phone?: string | null;
  email?: string | null;
  contactId?: string | null;
}) {
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(email?.trim());
  return (
    <div className="flex flex-wrap items-center gap-2" data-ff-business-quick-actions="">
      <form
        action={async () => {
          const form = new FormData();
          form.set("kind", "call");
          form.set("title", "Phone Call");
          form.set("notes", hasPhone ? `Dial ${phone}` : "Logged call");
          form.set("body", hasPhone ? `Dial ${phone}` : "Logged call");
          form.set("direction", "outbound");
          form.set("accountId", accountId);
          form.set("allowOrphan", "1");
          if (contactId) form.set("contactId", contactId);
          await logDeskActivity(form);
          const href = telHref(phone);
          if (href && typeof window !== "undefined") window.location.href = href;
        }}
      >
        <Button
          type="submit"
          size="sm"
          disabled={!hasPhone}
          className={cn(btn, contactActionButtonClass("call"))}
          style={contactActionButtonStyle("call")}
        >
          Call
        </Button>
      </form>
      <form
        action={async () => {
          const form = new FormData();
          form.set("subject", "Desk Follow-Up");
          form.set("body", email ? `Emailed ${email}` : "Email logged");
          if (email) form.set("toAddress", email);
          form.set("accountId", accountId);
          if (contactId) form.set("contactId", contactId);
          await sendDeskEmail(form);
          const href = mailtoHref(email);
          if (href && typeof window !== "undefined") window.location.href = href;
        }}
      >
        <Button
          type="submit"
          size="sm"
          disabled={!hasEmail}
          className={cn(btn, contactActionButtonClass("email"))}
          style={contactActionButtonStyle("email")}
        >
          Email
        </Button>
      </form>
      <form
        action={async () => {
          const form = new FormData();
          form.set("direction", "outbound");
          form.set("body", phone ? `Texted ${phone}` : "Text message logged");
          if (phone) form.set("phone", phone);
          form.set("accountId", accountId);
          if (contactId) form.set("contactId", contactId);
          await sendDeskSms(form);
          const href = smsHref(phone);
          if (href && typeof window !== "undefined") window.location.href = href;
        }}
      >
        <Button
          type="submit"
          size="sm"
          disabled={!hasPhone}
          className={cn(btn, contactActionButtonClass("sms"))}
          style={contactActionButtonStyle("sms")}
        >
          Text
        </Button>
      </form>
      <Link
        href={`/deals/new?accountId=${accountId}`}
        className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted"
      >
        Add Deal
      </Link>
      <Link
        href={`/policies/new?accountId=${accountId}`}
        className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted"
      >
        Add Policy
      </Link>
      <form
        action={async () => {
          const form = new FormData();
          form.set("kind", "task");
          form.set("title", "Follow Up");
          form.set("accountId", accountId);
          form.set("allowOrphan", "1");
          if (contactId) form.set("contactId", contactId);
          await logDeskActivity(form);
        }}
      >
        <Button type="submit" size="sm" variant="outline" className="h-8 text-xs font-semibold">
          Add Task
        </Button>
      </form>
    </div>
  );
}
