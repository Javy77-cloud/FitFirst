"use client";

import { useState } from "react";
import { Inbox, ListChecks, MessageSquare, Phone } from "lucide-react";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActivityRecordPicker } from "@/components/activities/record-picker";
import type { ActivityRecordHit } from "@/lib/activities/record-picker";
import { mailtoHref, smsHref, telHref } from "@/lib/desk/contact-actions";
import type { HeaderRecordContext } from "@/lib/desk/header-record";
import { cn } from "@/lib/utils";

const DIAL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as const;

type Composer = "call" | "sms" | "email" | "task" | null;

const HEADER_ACTIONS = [
  { kind: "call" as const, label: "Call", icon: Phone, className: "text-[#0f766e] hover:bg-[#ccfbf1]" },
  { kind: "sms" as const, label: "SMS", icon: MessageSquare, className: "text-[#c2410c] hover:bg-[#ffedd5]" },
  { kind: "email" as const, label: "Email", icon: Inbox, className: "text-[#1d6fb8] hover:bg-[#dbeafe]" },
  { kind: "task" as const, label: "Task", icon: ListChecks, className: "text-[#b45309] hover:bg-[#fef3c7]" },
];

function digitsFrom(phone?: string | null) {
  return phone?.replace(/[^\d+*#]/g, "") ?? "";
}

function displayName(record?: HeaderRecordContext | null) {
  return record?.name?.trim() || "this record";
}

export function HeaderRecordActions({
  record,
}: {
  record?: HeaderRecordContext | null;
}) {
  const [open, setOpen] = useState<Composer>(null);
  const [picked, setPicked] = useState<HeaderRecordContext | null>(record ?? null);
  const [digits, setDigits] = useState(digitsFrom(record?.phone));
  const active = picked ?? record ?? null;

  function applyHit(hit: ActivityRecordHit) {
    const next: HeaderRecordContext = {
      leadId: hit.leadId,
      dealId: hit.dealId,
      contactId: hit.contactId,
      accountId: hit.accountId,
      name: hit.name,
      phone: hit.phone,
      email: hit.email,
    };
    setPicked(next);
    setDigits(digitsFrom(hit.phone));
  }

  function openComposer(next: Composer) {
    setPicked(record ?? null);
    if (next === "call") setDigits(digitsFrom(record?.phone));
    setOpen(next);
  }

  return (
    <div className="flex items-center gap-1.5" data-ff-header-record-actions="">
      {HEADER_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.kind}
            type="button"
            title={action.label}
            aria-label={action.label}
            data-ff-header-action={action.kind}
            onClick={() => openComposer(action.kind)}
            className={cn(
              "relative inline-flex size-10 items-center justify-center rounded-md",
              action.className,
            )}
          >
            <Icon className="size-6" strokeWidth={2.25} />
            <span className="sr-only">{action.label}</span>
          </button>
        );
      })}

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          {open === "call" ? (
            <CallComposer
              record={active}
              name={displayName(active)}
              digits={digits}
              setDigits={setDigits}
              onPick={applyHit}
              onDone={() => setOpen(null)}
            />
          ) : null}
          {open === "sms" ? (
            <SmsComposer
              record={active}
              name={displayName(active)}
              onPick={applyHit}
              onDone={() => setOpen(null)}
            />
          ) : null}
          {open === "email" ? (
            <EmailComposer
              record={active}
              name={displayName(active)}
              onPick={applyHit}
              onDone={() => setOpen(null)}
            />
          ) : null}
          {open === "task" ? (
            <TaskComposer
              record={active}
              name={displayName(active)}
              onPick={applyHit}
              onDone={() => setOpen(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RelatedFields({ record }: { record?: HeaderRecordContext | null }) {
  return (
    <>
      {record?.leadId ? <input type="hidden" name="leadId" value={record.leadId} /> : null}
      {record?.dealId ? <input type="hidden" name="dealId" value={record.dealId} /> : null}
      {record?.contactId ? <input type="hidden" name="contactId" value={record.contactId} /> : null}
      {record?.accountId ? <input type="hidden" name="accountId" value={record.accountId} /> : null}
      {record?.policyId ? <input type="hidden" name="policyId" value={record.policyId} /> : null}
      <input type="hidden" name="allowOrphan" value="1" />
    </>
  );
}

function CallComposer({
  record,
  name,
  digits,
  setDigits,
  onPick,
  onDone,
}: {
  record?: HeaderRecordContext | null;
  name: string;
  digits: string;
  setDigits: (value: string | ((current: string) => string)) => void;
  onPick: (hit: ActivityRecordHit) => void;
  onDone: () => void;
}) {
  const dial = telHref(digits);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Call {name}</DialogTitle>
        <DialogDescription>In-desk dialer. Logs the call on this record. No live trunk.</DialogDescription>
      </DialogHeader>
      <ActivityRecordPicker onPick={onPick} />
      <form
        action={async (formData) => {
          formData.set("kind", "call");
          formData.set("title", digits ? `Call · ${digits}` : `Call · ${name}`);
          formData.set("direction", "outbound");
          formData.set("status", "completed");
          formData.set("notes", digits ? `Dial ${digits} (logged note — no live trunk).` : "Logged call from the desk.");
          await logDeskActivity(formData);
          onDone();
        }}
        className="space-y-3"
      >
        <RelatedFields record={record} />
        <input type="hidden" name="phone" value={digits} />
        <div className="rounded-md border border-border bg-navy px-3 py-3 text-white">
          <div className="text-[11px] uppercase tracking-wide text-white/70">Number</div>
          <div className="font-mono text-2xl tracking-wide">{digits || "• • •"}</div>
          <div className="mt-1 text-xs text-white/70">{name}</div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {DIAL_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setDigits((current) => `${current}${key}`.slice(0, 16))}
              className="h-10 rounded-md border border-border bg-card text-sm font-semibold text-navy hover:bg-muted"
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setDigits((c) => c.slice(0, -1))}>
            Back
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDigits("")}>
            Clear
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {dial ? (
            <Button type="button" size="sm" variant="outline" onClick={() => (window.location.href = dial)}>
              Open dialer
            </Button>
          ) : null}
          <Button type="submit" size="sm">
            Log call
          </Button>
        </div>
      </form>
    </>
  );
}

function SmsComposer({
  record,
  name,
  onPick,
  onDone,
}: {
  record?: HeaderRecordContext | null;
  name: string;
  onPick: (hit: ActivityRecordHit) => void;
  onDone: () => void;
}) {
  const phone = record?.phone ?? "";
  const href = smsHref(phone);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Text {name}</DialogTitle>
        <DialogDescription>Desk SMS stub. Nothing leaves FitFirst.</DialogDescription>
      </DialogHeader>
      <ActivityRecordPicker onPick={onPick} />
      <form
        action={async (formData) => {
          formData.set("direction", "outbound");
          await sendDeskSms(formData);
          onDone();
        }}
        className="space-y-3"
      >
        <RelatedFields record={record} />
        <div>
          <Label className="text-xs">Phone</Label>
          <Input name="phone" key={phone} defaultValue={phone} className="mt-1 h-8" placeholder="(321) 555-0100" />
        </div>
        <div>
          <Label className="text-xs">Message</Label>
          <Textarea
            name="body"
            className="mt-1 min-h-20"
            defaultValue={`Hi ${name.split(",")[0] ?? name} — follow-up from the desk.`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {href ? (
            <Button type="button" size="sm" variant="outline" onClick={() => (window.location.href = href)}>
              Open texts
            </Button>
          ) : null}
          <Button type="submit" size="sm">
            Queue SMS
          </Button>
        </div>
      </form>
    </>
  );
}

function EmailComposer({
  record,
  name,
  onPick,
  onDone,
}: {
  record?: HeaderRecordContext | null;
  name: string;
  onPick: (hit: ActivityRecordHit) => void;
  onDone: () => void;
}) {
  const email = record?.email ?? "";
  const href = mailtoHref(email);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Email {name}</DialogTitle>
        <DialogDescription>Desk email stub. Nothing leaves FitFirst.</DialogDescription>
      </DialogHeader>
      <ActivityRecordPicker onPick={onPick} />
      <form
        action={async (formData) => {
          await sendDeskEmail(formData);
          onDone();
        }}
        className="space-y-3"
      >
        <RelatedFields record={record} />
        <div>
          <Label className="text-xs">To</Label>
          <Input name="toAddress" key={email} defaultValue={email} className="mt-1 h-8" placeholder="client@email" />
        </div>
        <div>
          <Label className="text-xs">Subject</Label>
          <Input name="subject" defaultValue={`Follow-up · ${name}`} className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Message</Label>
          <Textarea name="body" className="mt-1 min-h-24" defaultValue={`Hi ${name},\n\nFollowing up from the desk.\n`} />
        </div>
        <div className="flex flex-wrap gap-2">
          {href ? (
            <Button type="button" size="sm" variant="outline" onClick={() => (window.location.href = href)}>
              Open mail
            </Button>
          ) : null}
          <Button type="submit" size="sm">
            Queue email
          </Button>
        </div>
      </form>
    </>
  );
}

function TaskComposer({
  record,
  name,
  onPick,
  onDone,
}: {
  record?: HeaderRecordContext | null;
  name: string;
  onPick: (hit: ActivityRecordHit) => void;
  onDone: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Task for {name}</DialogTitle>
        <DialogDescription>Creates a desk task on this record. Nothing is sent.</DialogDescription>
      </DialogHeader>
      <ActivityRecordPicker onPick={onPick} />
      <form
        action={async (formData) => {
          formData.set("kind", "task");
          await logDeskActivity(formData);
          onDone();
        }}
        className="space-y-3"
      >
        <RelatedFields record={record} />
        <div>
          <Label className="text-xs">Title</Label>
          <Input name="title" required key={name} defaultValue={`Follow-up · ${name}`} className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Due</Label>
          <Input name="dueAt" type="datetime-local" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea name="notes" className="mt-1 min-h-20" placeholder="What to do next" />
        </div>
        <Button type="submit" size="sm">
          Save task
        </Button>
      </form>
    </>
  );
}
