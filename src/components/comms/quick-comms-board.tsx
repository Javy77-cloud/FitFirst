"use client";

import { useMemo, useState, type ReactNode } from "react";
import { completeDeskActivity, logDeskActivity } from "@/app/actions/activities-desk";
import { touchCarrierLastContacted } from "@/app/actions/carriers-ops";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { telHref } from "@/lib/desk/contact-actions";
import { ACTIVITY_KIND_LABEL, ACTIVITY_KINDS, formatDay, type ActivityKind } from "@/lib/domain";
import type { SerializedActivity } from "@/lib/db/queries";
import { type MeetingType } from "@/lib/meetings/types";

const QC_MEETING_ORDER: MeetingType[] = ["in_office", "in_home", "video"];
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import type { TaskRecordType } from "@/lib/tasks/task-types";

const KIND_TONE: Record<ActivityKind, string> = {
  task: "bg-[#dbeafe] text-[#1d4e89]",
  meeting: "bg-[#fff4d1] text-[#8a6500]",
  call: "bg-[#e4f5ec] text-[#1f7a4d]",
  email: "bg-[#e0f2fe] text-[#0369a1]",
  sms: "bg-[#ffedd5] text-[#c2410c]",
};

/** Desk meeting types — domain values; Client visit = in_home. */
const QC_MEETING_LABEL: Record<MeetingType, string> = {
  in_office: "In office",
  in_home: "Client visit",
  video: "Video call",
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

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (next: string) => void;
}) {
  return (
    <div className={FF_CHIP_TAB_GROUP}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={chipTabClass(selected)}
            data-active={selected ? "true" : "false"}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
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
  policyId,
  carrierId = null,
  quoteFiles = [],
  officeAddress = null,
  clientAddress = null,
}: {
  items: SerializedActivity[];
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  /** When set (carrier detail), orphan log + bump last contacted. */
  carrierId?: string | null;
  quoteFiles?: QuickCommsQuoteFile[];
  /** Agency / agent office from Settings → Communications */
  officeAddress?: string | null;
  /** Client / property address from deal risk or contact */
  clientAddress?: string | null;
}) {
  const [kind, setKind] = useState<ActivityKind>("task");
  const [meetingType, setMeetingType] = useState<MeetingType>("in_office");
  const [callMode, setCallMode] = useState<"now" | "schedule">("now");
  const [emailMode, setEmailMode] = useState<"remind" | "schedule">("remind");
  const [smsMode, setSmsMode] = useState<"now" | "schedule">("now");
  const [callBusy, setCallBusy] = useState(false);

  const filtered = items.filter((item) => item.kind === kind);
  const party = (contactName ?? "").trim() || (carrierId ? "this carrier" : dealId ? "this deal" : "this lead");
  const toLine = contextLine([contactName, contactPhone, contactEmail]);
  const dial = telHref(contactPhone);
  const firstName = party.split(" ")[0] || party;

  const meetingLocationValue =
    meetingType === "in_office"
      ? (officeAddress ?? "").trim() || "In office"
      : meetingType === "in_home"
        ? (clientAddress ?? "").trim() || "Client visit"
        : "";

  const defaultTitle = useMemo(() => {
    if (kind === "email") return `Follow-up · ${party}`;
    if (kind === "sms") return `Text · ${party}`;
    if (kind === "call") return `Call · ${party}`;
    if (kind === "meeting") return `Meeting · ${party}`;
    return `Follow-up · ${party}`;
  }, [kind, party]);

  function applyDueFields(formData: FormData) {
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
  }

  function stampRelated(formData: FormData) {
    if (dealId) formData.set("dealId", dealId);
    if (leadId) formData.set("leadId", leadId);
    if (contactId) formData.set("contactId", contactId);
    if (accountId) formData.set("accountId", accountId);
    if (policyId) formData.set("policyId", policyId);
    if (carrierId) formData.set("allowOrphan", "1");
  }

  async function afterCarrierComms(kindLabel: string) {
    if (!carrierId) return;
    await touchCarrierLastContacted({
      carrierId,
      kind: "comms",
      title: kindLabel,
      detail: "Logged from Quick Comms",
    });
  }

  async function submitKind(formData: FormData) {
    applyDueFields(formData);
    const intent = String(formData.get("intent") ?? "").trim();

    if (kind === "email") {
      const subject = String(formData.get("subject") ?? "").trim();
      formData.set("title", subject || defaultTitle);
      if (!formData.get("toAddress") && contactEmail) formData.set("toAddress", contactEmail);
      const attach = formData.getAll("attachDoc").map(String).filter(Boolean);
      let body = String(formData.get("body") ?? "");
      if (attach.length) {
        const labels = quoteFiles.filter((f) => attach.includes(f.id)).map((f) => f.name);
        const attachBlock = labels.length
          ? `\n\nAttached quote file(s):\n${labels.map((n) => `· ${n}`).join("\n")}`
          : "";
        body = `${body}${attachBlock}`.trim();
        formData.set("body", body);
      }
      formData.set("notes", body);

      if (intent === "remind" || emailMode === "remind") {
        formData.set("kind", "email");
        formData.set("status", "open");
        formData.set("createReminder", "1");
        formData.set("direction", "outbound");
        stampRelated(formData);
        await logDeskActivity(formData);
        await afterCarrierComms("Email Reminder");
        return;
      }

      // Schedule for later — requires dueAt
      if (!formData.get("dueAt")) {
        throw new Error("Pick Send at date and time to schedule the email.");
      }
      stampRelated(formData);
      await sendDeskEmail(formData);
      await afterCarrierComms("Email");
      return;
    }

    if (kind === "sms") {
      const title = String(formData.get("title") ?? "").trim() || defaultTitle;
      formData.set("title", title);
      if (!formData.get("phone") && contactPhone) formData.set("phone", contactPhone);
      formData.set("direction", "outbound");
      if (intent === "schedule" || smsMode === "schedule") {
        if (!formData.get("dueAt")) {
          throw new Error("Pick date and time to schedule the SMS.");
        }
      } else {
        formData.delete("dueAt");
        formData.delete("startAt");
      }
      stampRelated(formData);
      await sendDeskSms(formData);
      await afterCarrierComms("SMS");
      return;
    }

    if (kind === "call") {
      formData.set("direction", formData.get("direction") || "outbound");
      if (!formData.get("phone") && contactPhone) formData.set("phone", contactPhone);
      if (!String(formData.get("title") ?? "").trim()) formData.set("title", defaultTitle);
      formData.set("status", "open");
    }

    if (kind === "meeting") {
      formData.set("meetingType", meetingType);
      if (meetingType === "video") {
        const url = String(formData.get("videoUrl") ?? "").trim();
        if (url) {
          formData.set("videoUrl", url);
          formData.set("meetingLocation", url);
        }
        const provider = String(formData.get("videoProvider") ?? "").trim();
        if (provider) formData.set("videoProvider", provider);
      } else {
        const loc =
          String(formData.get("meetingLocation") ?? "").trim() || meetingLocationValue;
        if (loc) formData.set("meetingLocation", loc);
      }
    }

    if (kind === "task") {
      formData.set("notify", String(formData.get("notifyChannel") ?? "popup") || "popup");
      if (!String(formData.get("title") ?? "").trim()) formData.set("title", defaultTitle);
      const label = (contactName ?? "").trim();
      if (label) {
        const notes = String(formData.get("notes") ?? "").trim();
        if (!notes.includes(`For: ${label}`)) {
          formData.set("notes", notes ? `${notes}\nFor: ${label}` : `For: ${label}`);
        }
      }
    }

    stampRelated(formData);
    await logDeskActivity(formData);
    const label =
      kind === "call"
        ? "Call"
        : kind === "meeting"
          ? "Meeting"
          : kind === "task"
            ? "Task"
            : "Quick Comms";
    await afterCarrierComms(label);
  }

  async function callNow() {
    if (callBusy) return;
    setCallBusy(true);
    try {
      const formData = new FormData();
      stampRelated(formData);
      formData.set("kind", "call");
      formData.set("title", defaultTitle);
      formData.set("direction", "outbound");
      formData.set("status", "completed");
      if (contactPhone) formData.set("phone", contactPhone);
      formData.set("notes", "Click-to-call from Quick Comms");
      await logDeskActivity(formData);
      await afterCarrierComms("Click-To-Call");
      if (dial) {
        window.location.href = dial;
      }
    } finally {
      setCallBusy(false);
    }
  }

  return (
    <section className="ff-card min-w-0 w-full max-w-full p-4" data-ff-quick-comms-board="">
      <h2 className="text-base font-semibold text-navy">Quick Communications</h2>
      <p className="mt-1 text-base text-muted-foreground">
        {carrierId
          ? "Task, meeting, call, email, and SMS on this carrier. Updates Last Contacted."
          : `Task, meeting, call, email, and SMS on this ${dealId ? "deal" : "lead"}. Not a carrier portal and not a live mail trunk.`}
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

      {kind === "task" ? (
        <div
          className="my-3 rounded-md border border-border p-3"
          data-ff-quick-comms-form="task"
        >
          <CreateTaskForm
            compact
            lockRecord={Boolean(policyId || dealId || contactId || accountId || leadId)}
            submitLabel="Add task"
            defaults={{
              recordType: (policyId
                ? "policy"
                : dealId
                  ? "deal"
                  : contactId
                    ? "contact"
                    : accountId
                      ? "business"
                      : leadId
                        ? "lead"
                        : "contact") as TaskRecordType,
              recordId: (policyId || dealId || contactId || accountId || leadId) ?? undefined,
              recordName: contactName || undefined,
              contactId,
              accountId,
              dealId,
              policyId,
              leadId,
            }}
          />
        </div>
      ) : (
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
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        <input type="hidden" name="kind" value={kind} />

        {kind === "meeting" ? (
          <>
            <div>
              <Label className="text-xs">Title</Label>
              <Input name="title" required className="mt-1 h-8" defaultValue={defaultTitle} />
            </div>
            <div>
              <Label className="text-xs">Meeting type</Label>
              <input type="hidden" name="meetingType" value={meetingType} />
              <div className="mt-1">
                <Segmented
                  value={meetingType}
                  options={QC_MEETING_ORDER.map((t) => ({
                    value: t,
                    label: QC_MEETING_LABEL[t],
                  }))}
                  onChange={(next) => setMeetingType(next as MeetingType)}
                />
              </div>
            </div>
            {meetingType === "in_office" ? (
              <div>
                <Label className="text-xs">Office address</Label>
                <Input
                  key={`office-${meetingLocationValue}`}
                  name="meetingLocation"
                  readOnly
                  className="mt-1 h-8 bg-muted/40"
                  defaultValue={meetingLocationValue}
                  placeholder="Set under Settings → Communications"
                />
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  From agency / agent office settings.
                </p>
              </div>
            ) : null}
            {meetingType === "in_home" ? (
              <div>
                <Label className="text-xs">Client / property address</Label>
                <Input
                  key={`client-${meetingLocationValue}`}
                  name="meetingLocation"
                  readOnly
                  className="mt-1 h-8 bg-muted/40"
                  defaultValue={meetingLocationValue}
                  placeholder="No address on deal / contact"
                />
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Pulled from this deal risk or contact.
                </p>
              </div>
            ) : null}
            {meetingType === "video" ? (
              <div>
                <Label className="text-xs">Video URL</Label>
                <Input
                  name="videoUrl"
                  className="mt-1 h-8"
                  placeholder="https://zoom.us/… or Meet link"
                />
                <input type="hidden" name="videoProvider" value="byo" />
              </div>
            ) : null}
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
              <Label className="text-xs">Notes</Label>
              <Textarea name="notes" className="mt-1 min-h-16" />
            </div>
            <Button type="submit" size="sm" className="mt-1 w-full">
              Add meeting
            </Button>
          </>
        ) : null}

        {kind === "call" ? (
          <>
            <div>
              <Label className="text-xs">Mode</Label>
              <div className="mt-1">
                <Segmented
                  value={callMode}
                  options={[
                    { value: "now", label: "Call now" },
                    { value: "schedule", label: "Schedule reminder" },
                  ]}
                  onChange={(next) => setCallMode(next as "now" | "schedule")}
                />
              </div>
            </div>
            {callMode === "now" ? (
              <>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    name="phone"
                    readOnly
                    className="mt-1 h-8 bg-muted/40"
                    defaultValue={contactPhone ?? ""}
                    placeholder="No phone on contact"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-1 w-full"
                  disabled={!dial || callBusy}
                  onClick={() => void callNow()}
                >
                  {callBusy ? "Logging…" : `Call ${contactName?.trim() || party}`}
                </Button>
                {!dial ? (
                  <p className="text-[11px] text-muted-foreground">Add a phone on the contact first.</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Opens the device dialer and logs the call activity.
                  </p>
                )}
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input name="title" required className="mt-1 h-8" defaultValue={defaultTitle} />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input name="dueDate" type="date" required className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Time</Label>
                  <Input name="dueTime" type="time" required className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Reminder</Label>
                  <select
                    name="reminderMinutes"
                    className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                    defaultValue="15"
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
                </div>
                <input type="hidden" name="direction" value="outbound" />
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea name="notes" className="mt-1 min-h-16" />
                </div>
                <Button type="submit" size="sm" className="mt-1 w-full">
                  Schedule call reminder
                </Button>
              </>
            )}
          </>
        ) : null}

        {kind === "email" ? (
          <>
            <div>
              <Label className="text-xs">Mode</Label>
              <div className="mt-1">
                <Segmented
                  value={emailMode}
                  options={[
                    { value: "remind", label: "Set up a reminder" },
                    { value: "schedule", label: "Schedule for later" },
                  ]}
                  onChange={(next) => setEmailMode(next as "remind" | "schedule")}
                />
              </div>
            </div>
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
              <Label className="text-xs">
                {emailMode === "remind" ? "Reminder when" : "Send at"}
              </Label>
              <Input
                name="dueDate"
                type="date"
                required
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">
                {emailMode === "remind" ? "Reminder time" : "Send time"}
              </Label>
              <Input name="dueTime" type="time" required className="mt-1 h-8" />
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
              <p className="text-[11px] text-muted-foreground">
                No agency/carrier quote files on this deal yet.
              </p>
            ) : null}
            <input type="hidden" name="intent" value={emailMode} />
            <Button type="submit" size="sm" className="mt-1 w-full">
              {emailMode === "remind" ? "Set reminder (do not send)" : "Schedule email"}
            </Button>
            {emailMode === "remind" ? (
              <p className="text-[11px] text-muted-foreground">
                Saves the draft and pops an in-app reminder. Nothing is sent yet.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Queues the outbound email for the Send at time.
              </p>
            )}
          </>
        ) : null}

        {kind === "sms" ? (
          <>
            <div>
              <Label className="text-xs">Mode</Label>
              <div className="mt-1">
                <Segmented
                  value={smsMode}
                  options={[
                    { value: "now", label: "Send now" },
                    { value: "schedule", label: "Schedule" },
                  ]}
                  onChange={(next) => setSmsMode(next as "now" | "schedule")}
                />
              </div>
            </div>
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
              <Textarea
                name="body"
                className="mt-1 min-h-16"
                defaultValue={`Hi ${firstName} — `}
              />
            </div>
            {smsMode === "schedule" ? (
              <>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input name="dueDate" type="date" required className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Time</Label>
                  <Input name="dueTime" type="time" required className="mt-1 h-8" />
                </div>
              </>
            ) : null}
            <input type="hidden" name="intent" value={smsMode === "schedule" ? "schedule" : "now"} />
            <Button type="submit" size="sm" className="mt-1 w-full">
              {smsMode === "schedule" ? "Schedule SMS" : "Send SMS now"}
            </Button>
          </>
        ) : null}
      </form>
      )}


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
