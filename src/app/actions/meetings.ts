"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings, contacts, deals, leads, risks, users } from "@/lib/db/schema";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { ADMIN_USER_ID, AGENCY_SETTINGS_ID, AGENT_USER_ID } from "@/lib/fixtures/ids";
import {
  defaultVideoProvider,
  homeAddressFromRecords,
  isMeetingType,
  isVideoProvider,
  meetingActorId,
  MEETING_TYPE_LABEL,
  meetingNotes,
  officeMeetingAddress,
  resolveMeetingPlace,
  videoLinkFor,
  type MeetingType,
  type VideoProvider,
} from "@/lib/meetings/types";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export type MeetingDefaults = {
  type: MeetingType;
  homeAddress: string | null;
  officeAddress: string | null;
  videoProvider: VideoProvider | null;
  zoomUrl: string | null;
  meetUrl: string | null;
  byoVideoUrl: string | null;
  videoUrl: string | null;
};

export async function loadMeetingDefaults(dealId: string): Promise<MeetingDefaults> {
  const session = await currentDeskSession();
  const actorId = meetingActorId({
    userId: session.userId,
    isAdmin: session.isAdmin,
    adminUserId: ADMIN_USER_ID,
    agentUserId: AGENT_USER_ID,
  });
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [agency] = await db
    .select()
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  const [agent] = await db.select().from(users).where(eq(users.id, actorId));

  let homeAddress: string | null = null;
  if (deal) {
    const [row] = await db
      .select({ risk: risks, lead: leads, contact: contacts })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(leads, eq(deals.leadId, leads.id))
      .leftJoin(risks, eq(risks.dealId, deals.id))
      .where(eq(deals.id, deal.id));
    homeAddress = homeAddressFromRecords({
      risk: row?.risk ?? null,
      lead: row?.lead ?? null,
      contact: row?.contact ?? null,
    });
  }

  const links = {
    zoomUrl: agency?.zoomUrl ?? null,
    meetUrl: agency?.meetUrl ?? null,
    byoVideoUrl: agency?.byoVideoUrl ?? null,
    videoProvider: agency?.videoProvider ?? null,
  };
  const videoProvider = defaultVideoProvider(links);
  const officeAddress = officeMeetingAddress({
    agencyName: agency?.agencyName,
    officeAddress: agency?.officeAddress,
    agentName: agent?.name ?? session.name,
    agentAddress: agent?.meetingAddress ?? session.user?.meetingAddress,
  });

  return {
    type: "video",
    homeAddress,
    officeAddress,
    videoProvider,
    zoomUrl: links.zoomUrl,
    meetUrl: links.meetUrl,
    byoVideoUrl: links.byoVideoUrl,
    videoUrl: videoProvider ? videoLinkFor(videoProvider, links) : null,
  };
}

export async function scheduleDealMeeting(formData: FormData) {
  const dealId = str(formData, "dealId");
  if (!dealId) throw new Error("Deal is required.");
  const typeRaw = str(formData, "meetingType") || "video";
  if (!isMeetingType(typeRaw)) throw new Error("Pick Video-call, In-Home, or In-Office.");
  const type = typeRaw;
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found.");

  const defaults = await loadMeetingDefaults(dealId);
  const providerRaw = str(formData, "videoProvider") || defaults.videoProvider || "";
  const videoProvider = isVideoProvider(providerRaw) ? providerRaw : defaults.videoProvider;
  const videoUrl =
    str(formData, "videoUrl") ||
    (videoProvider
      ? videoLinkFor(videoProvider, {
          zoomUrl: defaults.zoomUrl,
          meetUrl: defaults.meetUrl,
          byoVideoUrl: defaults.byoVideoUrl,
        })
      : null);
  const place = resolveMeetingPlace({
    type,
    homeAddress: str(formData, "location") || defaults.homeAddress,
    officeAddress: str(formData, "location") || defaults.officeAddress,
    videoProvider,
    videoUrl: str(formData, "location") || videoUrl,
  });
  const location = str(formData, "location") || place.location;
  const startRaw = str(formData, "startAt");
  const startAt = startRaw ? new Date(startRaw) : new Date();
  const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
  const title = `${MEETING_TYPE_LABEL[type]} · ${deal.title}`;
  const notes = meetingNotes({ type, location, videoProvider });

  await writeDeskComms({
    kind: "meeting",
    title,
    notes,
    body: notes,
    eventType: "created",
    status: "open",
    startAt: Number.isNaN(startAt.getTime()) ? new Date() : startAt,
    endAt,
    dealId: deal.id,
    contactId: deal.contactId,
    accountId: deal.accountId,
    leadId: deal.leadId,
    meetingType: type,
    meetingLocation: location,
    videoProvider,
  });

  revalidatePath("/pipeline");
  revalidatePath("/deals");
  revalidatePath(`/deals/${deal.id}`);
  revalidatePath("/calendar");
  if (deal.contactId) revalidatePath(`/contacts/${deal.contactId}`);
  if (deal.leadId) revalidatePath(`/leads/${deal.leadId}`);
}

export async function saveCommunicationsSettings(formData: FormData) {
  const session = await currentDeskSession();
  const [agency] = await db
    .select()
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));

  if (session.isAdmin) {
    const videoProvider = str(formData, "videoProvider") || "none";
    const patch = {
      officeAddress: str(formData, "officeAddress") || null,
      zoomUrl: str(formData, "zoomUrl") || null,
      meetUrl: str(formData, "meetUrl") || null,
      byoVideoUrl: str(formData, "byoVideoUrl") || null,
      videoProvider: ["none", "zoom", "meet", "byo"].includes(videoProvider) ? videoProvider : "none",
      updatedAt: new Date(),
    };
    if (agency) {
      await db.update(agencySettings).set(patch).where(eq(agencySettings.id, agency.id));
    } else {
      await db.insert(agencySettings).values({
        id: AGENCY_SETTINGS_ID,
        tenantId: DEFAULT_TENANT_ID,
        ...patch,
      });
    }
  }

  const meetingAddress = str(formData, "meetingAddress") || null;
  const actorId = meetingActorId({
    userId: session.userId,
    isAdmin: session.isAdmin,
    adminUserId: ADMIN_USER_ID,
    agentUserId: AGENT_USER_ID,
  });
  await db
    .update(users)
    .set({ meetingAddress, updatedAt: new Date() })
    .where(eq(users.id, actorId));

  revalidatePath("/settings");
  revalidatePath("/settings/communications");
  revalidatePath("/pipeline");
}
