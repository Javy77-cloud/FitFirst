import { riskAddress } from "@/lib/crm/lists";

export const MEETING_TYPES = ["video", "in_home", "in_office"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  video: "Video-call",
  in_home: "In-Home",
  in_office: "In-Office",
};

export const VIDEO_PROVIDERS = ["zoom", "meet", "byo"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

export const VIDEO_PROVIDER_LABEL: Record<VideoProvider, string> = {
  zoom: "Zoom",
  meet: "Google Meet",
  byo: "BYO video",
};

export type VideoLinks = {
  zoomUrl?: string | null;
  meetUrl?: string | null;
  byoVideoUrl?: string | null;
  videoProvider?: string | null;
};

export type MailingParty = {
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null | undefined;

export function isMeetingType(value: string): value is MeetingType {
  return (MEETING_TYPES as readonly string[]).includes(value);
}

export function isVideoProvider(value: string): value is VideoProvider {
  return (VIDEO_PROVIDERS as readonly string[]).includes(value);
}

export function mailingLine(party: MailingParty): string | null {
  if (!party) return null;
  const line = [party.mailingAddress, [party.city, party.state].filter(Boolean).join(", "), party.zip]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
  return line || null;
}

export function homeAddressFromRecords(input: {
  risk?: {
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  lead?: MailingParty;
  contact?: MailingParty;
}): string | null {
  return riskAddress(input.risk) ?? mailingLine(input.lead) ?? mailingLine(input.contact);
}

export function videoLinkFor(provider: VideoProvider | string, links: VideoLinks): string | null {
  if (provider === "zoom") return links.zoomUrl?.trim() || null;
  if (provider === "meet") return links.meetUrl?.trim() || null;
  if (provider === "byo") return links.byoVideoUrl?.trim() || null;
  return null;
}

export function defaultVideoProvider(links: VideoLinks): VideoProvider | null {
  const preferred = links.videoProvider?.trim();
  if (preferred && isVideoProvider(preferred) && videoLinkFor(preferred, links)) return preferred;
  for (const provider of VIDEO_PROVIDERS) {
    if (videoLinkFor(provider, links)) return provider;
  }
  return null;
}

export function officeMeetingAddress(input: {
  agencyName?: string | null;
  officeAddress?: string | null;
  agentName?: string | null;
  agentAddress?: string | null;
}): string | null {
  const agency = [input.agencyName?.trim(), input.officeAddress?.trim()].filter(Boolean).join(" — ");
  const agent = [input.agentName?.trim(), input.agentAddress?.trim()].filter(Boolean).join(" — ");
  const parts = [agency, agent].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function resolveMeetingPlace(input: {
  type: MeetingType;
  homeAddress?: string | null;
  officeAddress?: string | null;
  videoProvider?: string | null;
  videoUrl?: string | null;
}): { location: string | null; hint: string } {
  if (input.type === "in_home") {
    const location = input.homeAddress?.trim() || null;
    return {
      location,
      hint: location
        ? "Pulled from this Deal / Lead."
        : "No Deal or Lead address on file. Add one on the shop or type it here.",
    };
  }
  if (input.type === "in_office") {
    const location = input.officeAddress?.trim() || null;
    return {
      location,
      hint: location
        ? "Agency plus this agent’s meeting address from Settings."
        : "Set the agency office and your meeting address under Settings → Communications.",
    };
  }
  const location = input.videoUrl?.trim() || null;
  return {
    location,
    hint: location
      ? "Opens the connected video room. Settings → Communications stores Zoom / Meet / BYO stubs."
      : "Connect Zoom, Google Meet, or a BYO link under Settings → Communications.",
  };
}

export function meetingNotes(input: {
  type: MeetingType;
  location?: string | null;
  videoProvider?: string | null;
}): string {
  const type = MEETING_TYPE_LABEL[input.type];
  const lines = [`${type} meeting`];
  if (input.type === "video" && input.videoProvider && isVideoProvider(input.videoProvider)) {
    lines.push(`Provider: ${VIDEO_PROVIDER_LABEL[input.videoProvider]}`);
  }
  if (input.location?.trim()) lines.push(`Place: ${input.location.trim()}`);
  return lines.join("\n");
}

/** Card action labels. Ask a teammate never belongs on pipeline cards. */
export const PIPELINE_CARD_ACTIONS = ["Call", "SMS", "Task", "Meeting"] as const;

export function pipelineCardShowsAsk(): boolean {
  return false;
}

/** Unauthenticated desk still acts as Admin (Javy). Owner cookies have no userId. */
export function meetingActorId(input: {
  userId?: string | null;
  isAdmin?: boolean;
  adminUserId: string;
  agentUserId: string;
}): string {
  if (input.userId) return input.userId;
  return input.isAdmin === false ? input.agentUserId : input.adminUserId;
}
