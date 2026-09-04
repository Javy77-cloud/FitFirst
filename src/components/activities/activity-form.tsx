// @ts-nocheck — leftover ops calendar form. Desk 360 uses activity-timeline + activities-desk.
"use client";

import { useState } from "react";
import { upsertActivity } from "@/app/actions/activities";
import type { Activity } from "@/lib/db/schema";
import {
  ACTIVITY_KINDS,
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUSES,
  CALL_DIRECTIONS,
  TASK_PIPELINE_STAGES,
} from "@/lib/domain";
import { toDateTimeLocal } from "@/lib/activities/format";

export type RelatedOptions = {
  contacts: { id: string; firstName: string; lastName: string; phone?: string | null }[];
  deals: { id: string; title: string }[];
  policies: { id: string; policyNumber: string; contactId?: string | null }[];
  businesses: { id: string; name: string }[];
  users: { id: string; name: string }[];
};

export function ActivityForm({
  activity,
  related,
  defaults,
  returnTo = "/tasks",
  submitLabel = "Save to desk",
}: {
  activity?: Activity | null;
  related: RelatedOptions;
  defaults?: {
    kind?: string;
    dueAt?: string;
    startAt?: string;
    contactId?: string;
    dealId?: string;
    policyId?: string;
    businessId?: string;
    phoneNumber?: string;
    title?: string;
  };
  returnTo?: string;
  submitLabel?: string;
}) {
  const kind = activity?.kind ?? defaults?.kind ?? "task";
  const contactId = activity?.contactId ?? defaults?.contactId ?? "";
  const policyId = activity?.policyId ?? defaults?.policyId ?? "";
  const [subject, setSubject] = useState(activity?.title ?? defaults?.title ?? "");
  const [notes, setNotes] = useState(activity?.notes ?? "");
  const [phone, setPhone] = useState(activity?.phoneNumber ?? defaults?.phoneNumber ?? "");

  return (
    <form action={upsertActivity} className="space-y-3">
      {activity?.id ? <input type="hidden" name="id" value={activity.id} /> : null}
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Type</label>
          <select
            name="kind"
            defaultValue={kind}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {ACTIVITY_KINDS.filter((k) => k !== "note").map((k) => (
              <option key={k} value={k}>
                {k[0].toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Priority</label>
          <select
            name="priority"
            defaultValue={activity?.priority ?? "normal"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {ACTIVITY_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium" htmlFor="activity-subject">
          Subject
        </label>
        <input
          id="activity-subject"
          name="title"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm"
          placeholder="What needs to happen"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Due / start</label>
          <input
            type="datetime-local"
            name="dueAt"
            required
            defaultValue={
              toDateTimeLocal(activity?.dueAt ?? activity?.scheduledAt ?? activity?.startAt) ||
              defaults?.dueAt ||
              defaults?.startAt ||
              ""
            }
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium">End (meetings)</label>
          <input
            type="datetime-local"
            name="endAt"
            defaultValue={toDateTimeLocal(activity?.endAt)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm"
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Assignee</label>
          <select
            name="assigneeId"
            defaultValue={activity?.assigneeId ?? related.users[0]?.id ?? ""}
            required
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {related.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Reminder</label>
          <select
            name="reminderMinutes"
            defaultValue={String(activity?.reminderMinutes ?? 60)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="0">At due time</option>
            <option value="15">15 minutes before</option>
            <option value="60">1 hour before</option>
            <option value="1440">1 day before</option>
          </select>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Related contact</label>
          <select
            name="contactId"
            defaultValue={contactId}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">None — policy only is allowed</option>
            {related.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Related policy (first-class)</label>
          <select
            name="policyId"
            defaultValue={policyId}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">Optional</option>
            {related.policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policyNumber}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-base text-muted-foreground">
        Assign to a contact, a policy, or both. The same item lands on both timelines when both
        are linked.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Related deal</label>
          <select
            name="dealId"
            defaultValue={activity?.dealId ?? defaults?.dealId ?? ""}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">None</option>
            {related.deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Business (commercial)</label>
          <select
            name="businessId"
            defaultValue={activity?.businessId ?? defaults?.businessId ?? ""}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">None</option>
            {related.businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium" htmlFor="activity-phone">
            Phone (calls)
          </label>
          <input
            id="activity-phone"
            name="phoneNumber"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm"
            placeholder="(321) 555-0109"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Direction</label>
          <select
            name="direction"
            defaultValue={activity?.direction ?? "outbound"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {CALL_DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Location or video</label>
          <input
            name="location"
            defaultValue={activity?.location ?? ""}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm"
            placeholder="Office or video"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Video URL</label>
          <input
            name="videoUrl"
            defaultValue={activity?.videoUrl ?? ""}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm"
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Status</label>
          <select
            name="status"
            defaultValue={activity?.status ?? "incomplete"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {ACTIVITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Task pipeline</label>
          <select
            name="pipelineStage"
            defaultValue={activity?.pipelineStage ?? "todo"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {TASK_PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {s === "todo" ? "To do" : s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium">Meeting attendees</label>
        <select
          name="attendeeIds"
          multiple
          defaultValue={contactId ? [contactId] : []}
          className="mt-1 min-h-16 w-full rounded-md border border-input bg-card px-2 py-1 text-sm"
        >
          {related.contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.lastName}, {c.firstName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium" htmlFor="activity-notes">
          Notes
        </label>
        <textarea
          id="activity-notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground"
      >
        {submitLabel}
      </button>
    </form>
  );
}
