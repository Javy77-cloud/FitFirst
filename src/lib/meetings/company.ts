import { MEETING_TYPES } from "@/lib/meetings/types";

/** Admin-created company / training events. Personal Video / In-Home / In-Office stay on MEETING_TYPES. */
export const COMPANY_EVENT_TYPES = ["company", "training"] as const;
export type CompanyEventType = (typeof COMPANY_EVENT_TYPES)[number];

export const COMPANY_EVENT_TYPE_LABEL: Record<CompanyEventType, string> = {
  company: "Company meeting",
  training: "Training",
};

export const INVITE_AUDIENCES = ["agency", "office", "territory", "management"] as const;
export type InviteAudience = (typeof INVITE_AUDIENCES)[number];

export const INVITE_AUDIENCE_LABEL: Record<InviteAudience, string> = {
  agency: "Whole agency",
  office: "Office",
  territory: "Territory",
  management: "Management only",
};

export type DeskUserLite = {
  id: string;
  name: string;
  role: string;
  active?: boolean | null;
};

export type OfficeMembership = { userId: string; officeId: string };
export type TerritoryMembership = { userId: string; territoryId: string };
export type TerritoryOfficeLink = { territoryId: string; officeId: string };

export function isCompanyEventType(value: string | null | undefined): value is CompanyEventType {
  return Boolean(value && (COMPANY_EVENT_TYPES as readonly string[]).includes(value));
}

export function isInviteAudience(value: string | null | undefined): value is InviteAudience {
  return Boolean(value && (INVITE_AUDIENCES as readonly string[]).includes(value));
}

export function isManagementRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "owner";
}

/** Personal pipeline meetings are unchanged. */
export function isPersonalMeetingType(value: string | null | undefined): boolean {
  return Boolean(value && (MEETING_TYPES as readonly string[]).includes(value));
}

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function agentIdsForOffice(officeId: string, memberships: OfficeMembership[]): string[] {
  return uniqueIds(memberships.filter((row) => row.officeId === officeId).map((row) => row.userId));
}

/** Territory invitees = direct assignments ∪ agents in linked offices. */
export function agentIdsForTerritory(input: {
  territoryId: string;
  linkedOfficeIds: string[];
  officeMemberships: OfficeMembership[];
  territoryMemberships: TerritoryMembership[];
}): string[] {
  const fromOffices = input.officeMemberships
    .filter((row) => input.linkedOfficeIds.includes(row.officeId))
    .map((row) => row.userId);
  const direct = input.territoryMemberships
    .filter((row) => row.territoryId === input.territoryId)
    .map((row) => row.userId);
  return uniqueIds([...fromOffices, ...direct]);
}

export function resolveInviteeIds(input: {
  audience: InviteAudience;
  officeId?: string | null;
  territoryId?: string | null;
  users: DeskUserLite[];
  officeMemberships: OfficeMembership[];
  territoryMemberships: TerritoryMembership[];
  territoryOfficeLinks: TerritoryOfficeLink[];
  includeUserId?: string | null;
}): string[] {
  const active = input.users.filter((user) => user.active !== false);
  let ids: string[] = [];
  if (input.audience === "agency") {
    ids = active.map((user) => user.id);
  } else if (input.audience === "management") {
    ids = active.filter((user) => isManagementRole(user.role)).map((user) => user.id);
  } else if (input.audience === "office" && input.officeId) {
    ids = agentIdsForOffice(input.officeId, input.officeMemberships);
  } else if (input.audience === "territory" && input.territoryId) {
    const linkedOfficeIds = input.territoryOfficeLinks
      .filter((row) => row.territoryId === input.territoryId)
      .map((row) => row.officeId);
    ids = agentIdsForTerritory({
      territoryId: input.territoryId,
      linkedOfficeIds,
      officeMemberships: input.officeMemberships,
      territoryMemberships: input.territoryMemberships,
    });
  }
  if (input.includeUserId) ids.push(input.includeUserId);
  const allowed = new Set(active.map((user) => user.id));
  return uniqueIds(ids).filter((id) => allowed.has(id));
}

export function inviteAudienceSummary(input: {
  audience: InviteAudience | string | null | undefined;
  officeName?: string | null;
  territoryName?: string | null;
}): string {
  if (!isInviteAudience(input.audience)) return "No invite group";
  if (input.audience === "office") {
    return input.officeName ? `Office · ${input.officeName}` : "Office";
  }
  if (input.audience === "territory") {
    return input.territoryName ? `Territory · ${input.territoryName}` : "Territory";
  }
  return INVITE_AUDIENCE_LABEL[input.audience];
}

const HTTP_URL = /^https?:\/\/[^\s]+$/i;

export function normalizeVideoUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  return HTTP_URL.test(value) ? value : null;
}

export function videoHrefFromEvent(input: {
  videoUrl?: string | null;
  meetingLocation?: string | null;
  meetingType?: string | null;
}): string | null {
  const direct = normalizeVideoUrl(input.videoUrl);
  if (direct) return direct;
  if (input.meetingType === "video" || isCompanyEventType(input.meetingType)) {
    return normalizeVideoUrl(input.meetingLocation);
  }
  return normalizeVideoUrl(input.meetingLocation);
}

export function companyEventChipLabel(meetingType: string | null | undefined): string | null {
  if (!isCompanyEventType(meetingType)) return null;
  return COMPANY_EVENT_TYPE_LABEL[meetingType];
}
