"use client";

import { useMemo, useState, type ReactNode } from "react";
import { completeDeskActivity, logDeskActivity } from "@/app/actions/activities-desk";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { telHref } from "@/lib/desk/contact-actions";
import { ACTIVITY_KIND_LABEL, ACTIVITY_KINDS, formatDay, type ActivityKind } from "@/lib/domain";
import type { SerializedActivity } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

const KIND_TONE: Record<ActivityKind, string> = {
  task: "bg-[#dbeafe] text-[#1d4e89]",
  meeting: "bg-[#fff4d1] text-[#8a6500]",
  call: "bg-[#e4f5ec] text-[#1f7a4d]",
  email: "bg-[#e0f2fe] text-[#0369a1]",
  sms: "bg-[#ffedd5] text-[#c2410c]",
};

export type QuickCommsQuoteFile = { id: string; name: string; quoteId?: string | null };

const REMINDER_OPTIONS = [
  { value: "", label: "None" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "60 minutes before" },
  { value: "1440", label: "1 day before" },
] as const;

function combineLocal(date: string, time: string) {
  const d = date.trim();
  if (!d) return "";
  const t = time.trim() || "09:00";
  return `${d}T${t}`;
}

function contextLine(parts: Array<string | null | undefined>) {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" · ");
}

export function QuickCommsBoard({
  items,
  dealId,
  leadId,
  contactId,
  contactName,
  contactPhone,
  contactEmail,
  accountId,
  quoteFiles = [],
}: {
  items: SerializedActivity[];
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  accountId?: string | null;
  quoteFiles?: QuickCommsQuoteFile[];
}) {
  const [kind, setKind] = useState<ActivityKind>("task");
  const filtered = items.filter((item) => item.kind === kind);
  const party = (contactName ?? "").trim() || (dealId ? "this deal" : "this lead");
  const toLine = contextLine([contactName, contactPhone, contactEmail]);
  const dial = telHref(contactPhone);
  const defaultTitle = useMemo(() => {
    if (kind === "email") return `Follow-up · ${party}`;
    if (kind === "sms") return `Text · ${party}`;
    if (kind === "call") return `Call · ${party}`;
    if (kind === "meeting") return `Meeting · ${party}`;
    return `Follow-up · ${party}`;
  }, [kind, party]);

  async function submitKind(formData: FormData) {
    const date = String(formData.get("dueDate") ?? "");
    const time = String(formData.get("dueTime") ?? "");
    const endDate = String(formData.get("endDate") ?? "");
    const endTime = String(formData.get("endTime") ?? "");
    const start = combineLocal(date, time);
    if (start) {
      formData.set("dueAt", start);
      formData.set("startAt", start);
    }
    const end = combineLocal(endDate || date, endTime);
    if (endTime && end) formData.set("endAt", end);

    if (kind === "email") {
      const subject = String(formData.get("subject") ?? "").trim();
      formData.set("title", subject || defaultTitle);
      if (!formData.get("toAddress") && contactEmail) formData.set("toAddress", contactEmail);
      const attach = formData.getAll("attachDoc").map(String).filter(Boolean);
      if (attach.length) {
        const labels = quoteFiles
          .filter((f) => attach.includes(f.id))
          .map((f) => f.name);
        const body = String(formData.get("body") ?? "");
        const attachBlock = labels.length
          ? `\n\nAttached quote file(s):\n${labels.map((n) => `· ${n}`).join("\n")}`
          : "";
        formData.set("body", `${body}${attachBlock}`.trim());
        formData.set("notes", `${body}${attachBlock}`.trim());
      } else {
        formData.set("notes", String(formData.get("body") ?? ""));
      }
      await sendDeskEmail(formData);
      return;
    }

    if (kind === "sms") {
      const title = String(formData.get("title") ?? "").trim() || defaultTitle;
      formData.set("title", title);
      if (!formData.get("phone") && contactPhone) formData.set("phone", contactPhone);
      formData.set("direction", "outbound");
      await sendDeskSms(formData);
      return;
    }

    if (kind === "call") {
      formData.set("direction", formData.get("direction") || "outbound");
      if (!formData.get("phone") && contactPhone) formData.set("phone", contactPhone);
      if (!String(formData.get("title") ?? "").trim()) formData.set("title", defaultTitle);
    }

    if (kind === "meeting") {
      const loc = String(formData.get("meetingLocation") ?? "").trim();
      if (loc) formData.set("meetingLocation", loc);
    }

    if (kind === "task") {
      formData.set("notify", "popup");
      if (!String(formData.get("title") ?? "").trim()) formData.set("title", defaultTitle);
      // Auto-label contact/deal in notes subtitle context (no assignee picker).
      const label = (contactName ?? "").trim();
      if (label) {
        const notes = String(formData.get("notes") ?? "").trim();
        if (!notes.includes(`For: ${label}`)) {
          formData.set("notes", notes ? `${notes}\nFor: ${label}` : `For: ${label}`);
        }
      }
    }

    await logDeskActivity(formData);
  }

  return (
    <section className="ff-card min-w-0 w-full max-w-full p-4" data-ff-quick-comms-board="">
      <h2 className="text-base font-semibold text-navy">Quick Communications</h2>
      <p className="mt-1 text-base text-muted-foreground">
        Task, meeting, call, email, and SMS on this {dealId ? "deal" : "lead"}. Not a carrier
        portal and not a live mail trunk.
      </p>

      <div className="mt-3 flex flex-nowrap items-center gap-1.5 overflow-x-hidden">
        {ACTIVITY_KINDS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={cn(
              "h-8 shrink-0 rounded-md px-2.5 text-xs font-medium whitespace-nowrap",
              kind === value ? KIND_TONE[value] : "border border-border bg-card text-muted-foreground",
            )}
          >
            {ACTIVITY_KIND_LABEL[value]}
          </button>
        ))}
      </div>

      {toLine ? (
        <p className="mt-2 truncate text-xs text-muted-foreground" data-ff-quick-comms-to="">
          To: {toLine}
        </p>
      ) : null}

      <form
        key={kind}
        action={submitKind}
        className="my-3 flex flex-col gap-2 rounded-md border border-border p-3"
        data-ff-quick-comms-form={kind}
      >
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
        <input type="hidden" name="kind" value={kind} />

        {kind === "task" ? (
          <>
            <div>
              <Label className="text-xs">Title</Label>
              <Input name="title" required className="mt-1 h-8" defaultValue={defaultTitle} />
              {contactName ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">For {contactName}</p>
              ) : null}
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input name="dueDate" type="date" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input name="dueTime" type="time" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Reminder</Label>
              <select name="reminderMinutes" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value || "none"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Notify</Label>
              <select name="notifyChannel" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm" defaultValue="popup">
                <option value="popup">Popup (in-app)</option>
              </select>
              <p className="mt-0.5 text-[11px] text-muted-foreground">In-app only — nothing emailed.</p>
            </div>
          </>
        ) : null}

        {kind === "meeting" ? (
          <>
            <div>
              <Label className="text-xs">Title</Label>
              <Input name="title" required className="mt-1 h-8" defaultValue={defaultTitle} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input name="dueDate" type="date" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Start time</Label>
              <Input name="dueTime" type="time" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">End time (optional)</Label>
              <Input name="endTime" type="time" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Location (optional)</Label>
              <Input name="meetingLocation" className="mt-1 h-8" placeholder="Office or video link" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea name="notes" className="mt-1 min-h-16" />
            </div>
          </>
        ) : null}

        {kind === "call" ? (
          <>
            <div>
              <Label className="text-xs">Title</Label>
              <Input name="title" required className="mt-1 h-8" defaultValue={defaultTitle} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input name="dueDate" type="date" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input name="dueTime" type="time" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                name="phone"
                readOnly
                className="mt-1 h-8 bg-muted/40"
                defaultValue={contactPhone ?? ""}
                placeholder="No phone on contact"
              />
              {dial ? (
                <a href={dial} className="mt-1 inline-block text-xs text-primary hover:underline">
                  Click to call
                </a>
              ) : null}
            </div>
            <input type="hidden" name="direction" value="outbound" />
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea name="notes" className="mt-1 min-h-16" />
            </div>
          </>
        ) : null}

        {kind === "email" ? (
          <>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                name="toAddress"
                readOnly
                className="mt-1 h-8 bg-muted/40"
                defaultValue={contactEmail ?? ""}
                placeholder="No email on contact"
              />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input name="subject" required className="mt-1 h-8" defaultValue={defaultTitle} />
            </div>
            <div>
              <Label className="text-xs">Body</Label>
              <Textarea name="body" className="mt-1 min-h-20" defaultValue={`Hi ${party},\n\n`} />
            </div>
            <div>
              <Label className="text-xs">Schedule date</Label>
              <Input name="dueDate" type="date" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Schedule time</Label>
              <Input name="dueTime" type="time" className="mt-1 h-8" />
            </div>
            {dealId && quoteFiles.length > 0 ? (
              <fieldset className="space-y-1.5">
                <Legend className="text-xs font-medium">Attach quote file(s)</Legend>
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {quoteFiles.map((file) => (
                    <label key={file.id} className="flex items-start gap-2 text-xs text-navy">
                      <input type="checkbox" name="attachDoc" value={file.id} className="mt-0.5" />
                      <span className="min-w-0 break-words">{file.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : dealId ? (
              <p className="text-[11px] text-muted-foreground">No agency/carrier quote files on this deal yet.</p>
            ) : null}
          </>
        ) : null}

        {kind === "sms" ? (
          <>
            <div>
              <Label className="text-xs">Title</Label>
              <Input name="title" required className="mt-1 h-8" defaultValue={defaultTitle} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                name="phone"
                readOnly
                className="mt-1 h-8 bg-muted/40"
                defaultValue={contactPhone ?? ""}
                placeholder="No phone on contact"
              />
            </div>
            <div>
              <Label className="text-xs">Body</Label>
              <Textarea name="body" className="mt-1 min-h-16" defaultValue={`Hi ${party.split(" ")[0] || party} — `} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input name="dueDate" type="date" className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input name="dueTime" type="time" className="mt-1 h-8" />
            </div>
          </>
        ) : null}

        <Button type="submit" size="sm" className="mt-1 w-full">
          {kind === "email"
            ? "Queue email"
            : kind === "sms"
              ? "Queue SMS"
              : kind === "call"
                ? "Log call"
                : `Add ${ACTIVITY_KIND_LABEL[kind].toLowerCase()}`}
        </Button>
      </form>

      {filtered.length === 0 ? (
        <p className="text-base text-muted-foreground">
          No {ACTIVITY_KIND_LABEL[kind].toLowerCase()}s on this record yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {filtered.map((item) => (
            <li key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase",
                    KIND_TONE[item.kind as ActivityKind] ?? "bg-muted",
                  )}
                >
                  {item.kind}
                </span>
                <span className="text-[11px] uppercase text-muted-foreground">{item.status}</span>
                {item.dueAt ? (
                  <span className="text-base text-muted-foreground">{formatDay(item.dueAt)}</span>
                ) : null}
              </div>
              <p className="mt-1 font-medium">{item.title}</p>
              {item.notes ? <p className="text-base text-muted-foreground">{item.notes}</p> : null}
              {item.status === "open" ? (
                <form action={completeDeskActivity} className="mt-1">
                  <input type="hidden" name="activityId" value={item.id} />
                  <Button type="submit" size="xs" variant="ghost">
                    Complete
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Legend({ className, children }: { className?: string; children: ReactNode }) {
  return <legend className={className}>{children}</legend>;
}
