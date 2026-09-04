import { eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  CAL_AGENCY_TRAINING_ALERT_JAVY_ID,
  CAL_AGENCY_TRAINING_ALERT_MAYA_ID,
  CAL_AGENCY_TRAINING_ID,
  CAL_AGENCY_TRAINING_INVITE_JAVY_ID,
  CAL_AGENCY_TRAINING_INVITE_MAYA_ID,
  CAL_MGMT_HUDDLE_ALERT_JAVY_ID,
  CAL_MGMT_HUDDLE_ID,
  CAL_MGMT_HUDDLE_INVITE_JAVY_ID,
} from "@/lib/fixtures/ids";
import { db } from "./index";
import { activities, activityLogs, alerts, calendarInvites } from "./schema";

const TRAINING_START = new Date("2026-09-08T14:00:00.000Z");
const TRAINING_END = new Date("2026-09-08T15:00:00.000Z");
const HUDDLE_START = new Date("2026-09-09T12:00:00.000Z");
const HUDDLE_END = new Date("2026-09-09T12:30:00.000Z");

async function upsertCompanyEvent(input: {
  id: string;
  title: string;
  notes: string;
  meetingType: "company" | "training";
  videoUrl: string;
  inviteAudience: "agency" | "management";
  startAt: Date;
  endAt: Date;
  assignee: string;
}) {
  await db
    .insert(activities)
    .values({
      id: input.id,
      tenantId: DEFAULT_TENANT_ID,
      kind: "meeting",
      title: input.title,
      notes: input.notes,
      status: "open",
      startAt: input.startAt,
      endAt: input.endAt,
      dueAt: input.startAt,
      assignee: input.assignee,
      meetingType: input.meetingType,
      meetingLocation: input.videoUrl,
      videoProvider: input.videoUrl.includes("meet.google") ? "meet" : "zoom",
      videoUrl: input.videoUrl,
      inviteAudience: input.inviteAudience,
      createdByUserId: ADMIN_USER_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: input.title,
        notes: input.notes,
        status: "open",
        startAt: input.startAt,
        endAt: input.endAt,
        dueAt: input.startAt,
        meetingType: input.meetingType,
        meetingLocation: input.videoUrl,
        videoUrl: input.videoUrl,
        inviteAudience: input.inviteAudience,
        createdByUserId: ADMIN_USER_ID,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.activityId, input.id));
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: input.id,
    kind: "meeting",
    eventType: "created",
    body: `Meeting created: ${input.title}`,
    direction: "internal",
    occurredAt: new Date("2026-09-02T17:00:00.000Z"),
  });
}

/** Seeded Admin company / training events. Does not touch Ana. */
export async function seedCompanyMeetings() {
  await upsertCompanyEvent({
    id: CAL_AGENCY_TRAINING_ID,
    title: "HO3 wind-mit training",
    notes: "Agency training on reading wind-mit forms. Open the Zoom link from the event.",
    meetingType: "training",
    videoUrl: "https://zoom.us/j/fitfirst-windmit",
    inviteAudience: "agency",
    startAt: TRAINING_START,
    endAt: TRAINING_END,
    assignee: "Javy Rivera",
  });

  await upsertCompanyEvent({
    id: CAL_MGMT_HUDDLE_ID,
    title: "Q3 management huddle",
    notes: "Admins only. Pipeline health and bind counts. Maya is not invited.",
    meetingType: "company",
    videoUrl: "https://meet.google.com/fit-first-mgmt",
    inviteAudience: "management",
    startAt: HUDDLE_START,
    endAt: HUDDLE_END,
    assignee: "Javy Rivera",
  });

  await db
    .delete(calendarInvites)
    .where(inArray(calendarInvites.activityId, [CAL_AGENCY_TRAINING_ID, CAL_MGMT_HUDDLE_ID]));
  await db.insert(calendarInvites).values([
    {
      id: CAL_AGENCY_TRAINING_INVITE_JAVY_ID,
      tenantId: DEFAULT_TENANT_ID,
      activityId: CAL_AGENCY_TRAINING_ID,
      userId: ADMIN_USER_ID,
    },
    {
      id: CAL_AGENCY_TRAINING_INVITE_MAYA_ID,
      tenantId: DEFAULT_TENANT_ID,
      activityId: CAL_AGENCY_TRAINING_ID,
      userId: AGENT_USER_ID,
    },
    {
      id: CAL_MGMT_HUDDLE_INVITE_JAVY_ID,
      tenantId: DEFAULT_TENANT_ID,
      activityId: CAL_MGMT_HUDDLE_ID,
      userId: ADMIN_USER_ID,
    },
  ]);

  await db
    .delete(alerts)
    .where(
      inArray(alerts.id, [
        CAL_AGENCY_TRAINING_ALERT_JAVY_ID,
        CAL_AGENCY_TRAINING_ALERT_MAYA_ID,
        CAL_MGMT_HUDDLE_ALERT_JAVY_ID,
      ]),
    );
  await db.insert(alerts).values([
    {
      id: CAL_AGENCY_TRAINING_ALERT_JAVY_ID,
      tenantId: DEFAULT_TENANT_ID,
      kind: "company_meeting",
      title: "Invited: HO3 wind-mit training",
      body: "Whole agency training on Mon Sep 8. Open the Zoom link from Calendar.",
      severity: "info",
      entityType: "activity",
      entityId: CAL_AGENCY_TRAINING_ID,
      userId: ADMIN_USER_ID,
    },
    {
      id: CAL_AGENCY_TRAINING_ALERT_MAYA_ID,
      tenantId: DEFAULT_TENANT_ID,
      kind: "company_meeting",
      title: "Invited: HO3 wind-mit training",
      body: "Whole agency training on Mon Sep 8. Open the Zoom link from Calendar.",
      severity: "info",
      entityType: "activity",
      entityId: CAL_AGENCY_TRAINING_ID,
      userId: AGENT_USER_ID,
    },
    {
      id: CAL_MGMT_HUDDLE_ALERT_JAVY_ID,
      tenantId: DEFAULT_TENANT_ID,
      kind: "company_meeting",
      title: "Invited: Q3 management huddle",
      body: "Management only. Open the Meet link from Calendar.",
      severity: "info",
      entityType: "activity",
      entityId: CAL_MGMT_HUDDLE_ID,
      userId: ADMIN_USER_ID,
    },
  ]);
}
