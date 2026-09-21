"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireAdminAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { loadInviteCatalog } from "@/lib/db/office-queries";
import { activities, activityLogs, alerts, calendarInvites } from "@/lib/db/schema";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { activityLogBody } from "@/lib/lifecycle/activity";
import {
  COMPANY_EVENT_TYPE_LABEL,
  INVITE_AUDIENCE_LABEL,
  isCompanyEventType,
  isInviteAudience,
  normalizeVideoUrl,
  resolveInviteeIds,
  type CompanyEventType,
  type InviteAudience,
} from "@/lib/meetings/company";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function when(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseCompanyForm(form: FormData) {
  const meetingTypeRaw = str(form, "meetingType") || "company";
  if (!isCompanyEventType(meetingTypeRaw)) {
    throw new Error("Pick Company meeting or Training.");
  }
  const audienceRaw = str(form, "inviteAudience") || "agency";
  if (!isInviteAudience(audienceRaw)) {
    throw new Error("Pick Whole agency, Office, Territory, or Management only.");
  }
  const title = str(form, "title") || COMPANY_EVENT_TYPE_LABEL[meetingTypeRaw];
  const startAt = when(form, "startAt");
  if (!startAt) throw new Error("Set a date and time.");
  const endAt = when(form, "endAt") ?? new Date(startAt.getTime() + 60 * 60 * 1000);
  const videoUrl = normalizeVideoUrl(str(form, "videoUrl"));
  if (str(form, "videoUrl") && !videoUrl) {
    throw new Error("Video link must be a Zoom, Meet, or other http(s) URL.");
  }
  const officeId = str(form, "inviteOfficeId") || null;
  const territoryId = str(form, "inviteTerritoryId") || null;
  if (audienceRaw === "office" && !officeId) throw new Error("Pick an office.");
  if (audienceRaw === "territory" && !territoryId) throw new Error("Pick a territory.");
  return {
    meetingType: meetingTypeRaw as CompanyEventType,
    inviteAudience: audienceRaw as InviteAudience,
    title,
    notes: str(form, "notes") || null,
    startAt,
    endAt,
    videoUrl,
    inviteOfficeId: audienceRaw === "office" ? officeId : null,
    inviteTerritoryId: audienceRaw === "territory" ? territoryId : null,
  };
}

async function replaceInvites(activityId: string, userIds: string[], title: string, whenLabel: string) {
  await db.delete(calendarInvites).where(eq(calendarInvites.activityId, activityId));
  await db.delete(alerts).where(and(eq(alerts.entityType, "activity"), eq(alerts.entityId, activityId)));
  if (userIds.length) {
    await db.insert(calendarInvites).values(
      userIds.map((userId) => ({
        tenantId: DEFAULT_TENANT_ID,
        activityId,
        userId,
      })),
    );
    await db.insert(alerts).values(
      userIds.map((userId) => ({
        tenantId: DEFAULT_TENANT_ID,
        kind: "company_meeting",
        title: `Invited: ${title}`,
        body: `${whenLabel} Open the video link from Calendar.`,
        severity: "info",
        entityType: "activity",
        entityId: activityId,
        userId,
      })),
    );
  }
}

function whenLabel(startAt: Date) {
  return startAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function createCompanyMeeting(formData: FormData) {
  const session = await requireAdminAction("Only an admin can schedule a company meeting.");
  const parsed = parseCompanyForm(formData);
  const catalog = await loadInviteCatalog();
  const inviteeIds = resolveInviteeIds({
    audience: parsed.inviteAudience,
    officeId: parsed.inviteOfficeId,
    territoryId: parsed.inviteTerritoryId,
    users: catalog.users,
    officeMemberships: catalog.officeMemberships,
    territoryMemberships: catalog.territoryMemberships,
    territoryOfficeLinks: catalog.territoryOfficeLinks,
    includeUserId: session.userId,
  });
  const creatorId = session.userId ?? ADMIN_USER_ID;
  if (str(formData, "ignoreBusy") !== "1") {
    const { busyConflictMessage, findBusyConflicts } = await import("@/lib/integrations/calendar-busy");
    const conflicts = await findBusyConflicts(parsed.startAt, parsed.endAt);
    if (conflicts.length) throw new Error(busyConflictMessage(conflicts));
  }
  let videoUrl = parsed.videoUrl;
  let meetExternalId: string | null = null;
  if (!videoUrl && str(formData, "addGoogleMeet") === "1") {
    const { createGoogleMeetConference } = await import("@/lib/integrations/google-meet");
    const meet = await createGoogleMeetConference({
      title: parsed.title,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
    });
    videoUrl = meet.url;
    meetExternalId = meet.externalId;
  }
  const videoProvider = videoUrl?.includes("meet.google")
    ? "meet"
    : videoUrl?.includes("zoom.us")
      ? "zoom"
      : videoUrl
        ? "byo"
        : null;

  const [activity] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "meeting",
      title: parsed.title,
      notes: parsed.notes,
      status: "open",
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      dueAt: parsed.startAt,
      assignee: session.name || "Javy Rivera",
      meetingType: parsed.meetingType,
      meetingLocation: videoUrl,
      videoProvider,
      videoUrl,
      inviteAudience: parsed.inviteAudience,
      inviteOfficeId: parsed.inviteOfficeId,
      inviteTerritoryId: parsed.inviteTerritoryId,
      createdByUserId: creatorId,
    })
    .returning();

  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity.id,
    kind: "meeting",
    eventType: "created",
    body: `${activityLogBody("meeting", "created", parsed.title)} · ${INVITE_AUDIENCE_LABEL[parsed.inviteAudience]}`,
    direction: "internal",
  });

  await replaceInvites(activity.id, inviteeIds, parsed.title, `${whenLabel(parsed.startAt)}.`);
  const { pushDeskActivityToCalendars } = await import("@/lib/integrations/calendar-event-sync");
  await pushDeskActivityToCalendars(activity, meetExternalId
    ? { existingExternalId: { provider: "google_calendar", externalId: meetExternalId } }
    : undefined).catch(() => undefined);
  revalidatePath("/calendar");
  revalidatePath("/alerts");
  return { ok: true as const, id: activity.id };
}

export async function updateCompanyMeeting(formData: FormData) {
  const session = await requireAdminAction("Only an admin can edit a company meeting.");
  const id = str(formData, "activityId");
  if (!id) throw new Error("Missing event.");
  const [existing] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!existing || !isCompanyEventType(existing.meetingType)) {
    throw new Error("Company meeting not found.");
  }
  const parsed = parseCompanyForm(formData);
  const catalog = await loadInviteCatalog();
  const inviteeIds = resolveInviteeIds({
    audience: parsed.inviteAudience,
    officeId: parsed.inviteOfficeId,
    territoryId: parsed.inviteTerritoryId,
    users: catalog.users,
    officeMemberships: catalog.officeMemberships,
    territoryMemberships: catalog.territoryMemberships,
    territoryOfficeLinks: catalog.territoryOfficeLinks,
    includeUserId: session.userId,
  });
  if (str(formData, "ignoreBusy") !== "1") {
    const { busyConflictMessage, findBusyConflicts } = await import("@/lib/integrations/calendar-busy");
    const conflicts = await findBusyConflicts(parsed.startAt, parsed.endAt);
    if (conflicts.length) throw new Error(busyConflictMessage(conflicts));
  }
  let videoUrl = parsed.videoUrl;
  if (!videoUrl && str(formData, "addGoogleMeet") === "1") {
    const { createGoogleMeetLink } = await import("@/lib/integrations/google-meet");
    videoUrl = await createGoogleMeetLink({
      title: parsed.title,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
    });
  }
  const videoProvider = videoUrl?.includes("meet.google")
    ? "meet"
    : videoUrl?.includes("zoom.us")
      ? "zoom"
      : videoUrl
        ? "byo"
        : existing.videoProvider;

  await db
    .update(activities)
    .set({
      title: parsed.title,
      notes: parsed.notes,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      dueAt: parsed.startAt,
      meetingType: parsed.meetingType,
      meetingLocation: videoUrl,
      videoProvider,
      videoUrl,
      inviteAudience: parsed.inviteAudience,
      inviteOfficeId: parsed.inviteOfficeId,
      inviteTerritoryId: parsed.inviteTerritoryId,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id));

  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: id,
    kind: "meeting",
    eventType: "updated",
    body: `${activityLogBody("meeting", "updated", parsed.title)} · ${INVITE_AUDIENCE_LABEL[parsed.inviteAudience]}`,
    direction: "internal",
  });

  await replaceInvites(id, inviteeIds, parsed.title, `${whenLabel(parsed.startAt)}.`);
  const { pushDeskActivityToCalendars } = await import("@/lib/integrations/calendar-event-sync");
  await pushDeskActivityToCalendars({
    id,
    title: parsed.title,
    notes: parsed.notes,
    meetingLocation: videoUrl,
    startAt: parsed.startAt,
    endAt: parsed.endAt,
  }).catch(() => undefined);
  revalidatePath("/calendar");
  revalidatePath("/alerts");
  return { ok: true as const, id };
}
