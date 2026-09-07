"use client";

import { useState } from "react";
import { createCompanyMeeting, updateCompanyMeeting } from "@/app/actions/company-meetings";
import { flashAction } from "@/lib/flash-client";
import { deleteDeskActivity } from "@/app/actions/activities-desk";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPANY_EVENT_TYPE_LABEL,
  COMPANY_EVENT_TYPES,
  INVITE_AUDIENCE_LABEL,
  INVITE_AUDIENCES,
  inviteAudienceSummary,
  isInviteAudience,
  videoHrefFromEvent,
  type CompanyEventType,
  type InviteAudience,
} from "@/lib/meetings/company";
import { toDateTimeLocal, type CalendarActivity } from "@/lib/ops/calendar";

export type InviteCatalogOption = { id: string; name: string };

export function CompanyMeetingForm({
  event,
  isAdmin,
  defaultType,
  defaultStart,
  offices,
  territories,
  onClose,
}: {
  event: CalendarActivity | null;
  isAdmin: boolean;
  defaultType: CompanyEventType;
  defaultStart: string;
  offices: InviteCatalogOption[];
  territories: InviteCatalogOption[];
  onClose: () => void;
}) {
  const [meetingType, setMeetingType] = useState<CompanyEventType>(
    event?.meetingType === "training" || event?.meetingType === "company"
      ? event.meetingType
      : defaultType,
  );
  const [audience, setAudience] = useState<InviteAudience>(
    isInviteAudience(event?.inviteAudience) ? event.inviteAudience : "agency",
  );
  const [error, setError] = useState<string | null>(null);
  const videoHref = videoHrefFromEvent({
    videoUrl: event?.videoUrl,
    meetingLocation: event?.meetingLocation,
    meetingType: event?.meetingType ?? meetingType,
  });
  const officeName = offices.find((row) => row.id === event?.inviteOfficeId)?.name ?? null;
  const territoryName = territories.find((row) => row.id === event?.inviteTerritoryId)?.name ?? null;
  const readOnly = !isAdmin;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy">
            {event
              ? COMPANY_EVENT_TYPE_LABEL[meetingType]
              : `New ${COMPANY_EVENT_TYPE_LABEL[meetingType].toLowerCase()}`}
          </h3>
          <Button type="button" size="xs" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {readOnly ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-navy">{event?.title}</p>
            <p className="text-xs text-muted-foreground">
              {inviteAudienceSummary({
                audience: event?.inviteAudience,
                officeName,
                territoryName,
              })}
            </p>
            {event?.notes ? <p className="text-sm text-navy/80">{event.notes}</p> : null}
            {videoHref ? (
              <a
                href={videoHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open video
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No video link on this event.</p>
            )}
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form
            action={async (formData) => {
              setError(null);
              try {
                if (event) await updateCompanyMeeting(formData);
                else await createCompanyMeeting(formData);
                flashAction("meeting-saved");
                onClose();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not save the company meeting.");
              }
            }}
            className="grid gap-2 sm:grid-cols-2"
          >
            {event ? <input type="hidden" name="activityId" value={event.id} /> : null}
            <input type="hidden" name="meetingType" value={meetingType} />
            <input type="hidden" name="inviteAudience" value={audience} />
            <div className="sm:col-span-2">
              <Label className="text-xs">Type</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {COMPANY_EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMeetingType(type)}
                    className={
                      meetingType === type
                        ? type === "training"
                          ? "rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                          : "rounded-md bg-fit-flag px-2 py-0.5 text-xs text-white"
                        : "rounded-md border border-border px-2 py-0.5 text-xs text-navy hover:bg-muted"
                    }
                  >
                    {COMPANY_EVENT_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Title</Label>
              <Input name="title" required defaultValue={event?.title ?? ""} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Start</Label>
              <Input
                name="startAt"
                type="datetime-local"
                required
                defaultValue={toDateTimeLocal(event?.startAt ?? event?.dueAt) || defaultStart}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input
                name="endAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(event?.endAt)}
                className="mt-1 h-8"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Video link (Zoom / Meet / other URL)</Label>
              <Input
                name="videoUrl"
                type="url"
                placeholder="https://zoom.us/j/… or https://meet.google.com/…"
                defaultValue={event?.videoUrl ?? event?.meetingLocation ?? ""}
                className="mt-1 h-8"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Invite</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {INVITE_AUDIENCES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAudience(item)}
                    className={
                      audience === item
                        ? "rounded-md bg-navy px-2 py-0.5 text-xs text-white"
                        : "rounded-md border border-border px-2 py-0.5 text-xs text-navy hover:bg-muted"
                    }
                  >
                    {INVITE_AUDIENCE_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>
            {audience === "office" ? (
              <div className="sm:col-span-2">
                <Label className="text-xs">Office</Label>
                <select
                  name="inviteOfficeId"
                  required
                  defaultValue={event?.inviteOfficeId ?? offices[0]?.id ?? ""}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {audience === "territory" ? (
              <div className="sm:col-span-2">
                <Label className="text-xs">Territory</Label>
                <select
                  name="inviteTerritoryId"
                  required
                  defaultValue={event?.inviteTerritoryId ?? territories[0]?.id ?? ""}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {territories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea name="notes" defaultValue={event?.notes ?? ""} className="mt-1 min-h-16" />
            </div>
            {error ? <p className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}
            <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2">
              {event ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mr-auto text-destructive"
                  onClick={async () => {
                    if (!confirmHardDelete("this event")) return;
                    const form = new FormData();
                    form.set("activityId", event.id);
                    await deleteDeskActivity(form);
                    onClose();
                  }}
                >
                  Delete event
                </Button>
              ) : null}
              {videoHref ? (
                <a
                  href={videoHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Open video
                </a>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {event ? "Save" : "Invite and add"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
