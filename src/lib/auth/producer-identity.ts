/**
 * Same-person producer identity.
 *
 * Production incident: Admin Javy Rivera logged into /deals Mine and lost four
 * of his own shops because deal.owner_id pointed at a second users row named
 * "Francisco Javier Garcia". Mine compared ownerId === session.userId only.
 *
 * Demo "Javier Garcia" (javier@fitfirst.local) is a separate seeded agent and
 * is intentionally not in Javy's identity group.
 */

export type ProducerRef = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  active?: boolean | null;
  accessStatus?: string | null;
  removedAt?: Date | string | null;
  frozenAt?: Date | string | null;
};

/** Legal / Zoho / nickname spellings of the FitFirst owner-admin. */
const JAVY_IDENTITY_NAMES = [
  "javy rivera",
  "javy garcia",
  "francisco javier garcia",
  "francisco javier garcia rivera",
  "francisco j garcia",
  "francisco javy garcia",
  "f javier garcia",
] as const;

const IDENTITY_GROUPS: readonly (readonly string[])[] = [JAVY_IDENTITY_NAMES];

/** True when this spelling is one of the historical same-person nicknames, not a later Settings name. */
export function isListedProducerSpelling(raw: string | null | undefined): boolean {
  const name = normalizeProducerName(raw);
  if (!name) return false;
  return IDENTITY_GROUPS.some((group) => (group as readonly string[]).includes(name));
}

export function normalizeProducerName(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function sameProducerIdentity(a: ProducerRef, b: ProducerRef): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  const aEmail = (a.email ?? "").trim().toLowerCase();
  const bEmail = (b.email ?? "").trim().toLowerCase();
  if (aEmail && bEmail && aEmail === bEmail) return true;

  const aName = normalizeProducerName(a.name);
  const bName = normalizeProducerName(b.name);
  if (!aName || !bName) return false;
  if (aName === bName) return true;

  return IDENTITY_GROUPS.some((group) => group.includes(aName) && group.includes(bName));
}

export function isActiveProducer(user: ProducerRef): boolean {
  if (user.removedAt || user.frozenAt) return false;
  if (user.active === false) return false;
  const status = (user.accessStatus ?? "active").trim().toLowerCase();
  if (status === "removed" || status === "frozen") return false;
  const role = (user.role ?? "").trim().toLowerCase();
  return role === "owner" || role === "admin" || role === "agent";
}

function privilegeRank(user: ProducerRef): number {
  const role = (user.role ?? "").trim().toLowerCase();
  if (role === "owner") return 3;
  if (role === "admin") return 2;
  if (role === "agent") return 1;
  return 0;
}

/** Prefer owner/admin when several rows are the same person. */
export function canonicalProducerId(group: ProducerRef[]): string {
  const ranked = [...group].sort((left, right) => privilegeRank(right) - privilegeRank(left));
  return ranked.find((row) => row.id)?.id ?? "";
}

export function mineOwnerIds(viewer: ProducerRef, directory: ProducerRef[]): string[] {
  const ids = new Set<string>();
  if (viewer.id) ids.add(viewer.id);
  for (const user of directory) {
    if (user.id && sameProducerIdentity(user, viewer)) ids.add(user.id);
  }
  return [...ids];
}

export function aliasOwnerIds(viewer: ProducerRef, directory: ProducerRef[]): string[] {
  return mineOwnerIds(viewer, directory).filter((id) => id !== viewer.id);
}

/**
 * Solo book: no other active owner/admin/agent who is a different person.
 * Demo stays multi-agent because Maya Chen is a distinct producer.
 */
export function isSoloProducerBook(viewer: ProducerRef, directory: ProducerRef[]): boolean {
  return !directory.some((user) => isActiveProducer(user) && !sameProducerIdentity(user, viewer));
}

export type MineScope = {
  ownerIds: string[];
  aliasUserIds: string[];
  soloBook: boolean;
};

export function mineScopeForViewer(viewer: ProducerRef, directory: ProducerRef[]): MineScope {
  const ownerIds = mineOwnerIds(viewer, directory);
  return {
    ownerIds,
    aliasUserIds: ownerIds.filter((id) => id !== viewer.id),
    soloBook: isSoloProducerBook(viewer, directory),
  };
}

export function ownerMatchesMine(
  ownerId: string | null | undefined,
  filter: { viewerId?: string | null; viewerIds?: readonly string[] | null; soloBook?: boolean },
): boolean {
  if (filter.soloBook) return true;
  const ids = new Set<string>();
  for (const id of filter.viewerIds ?? []) {
    if (id) ids.add(id);
  }
  if (filter.viewerId) ids.add(filter.viewerId);
  if (ids.size === 0) return true;
  return ownerId != null && ids.has(ownerId);
}

export function ownerIdForWrite(input: {
  preferredId?: string | null;
  preferredUser?: ProducerRef | null;
  actor: ProducerRef;
}): string | null {
  const actorId = input.actor.id || null;
  const preferred = input.preferredId || actorId;
  if (!preferred) return null;
  if (preferred === actorId) return actorId;
  if (input.preferredUser && sameProducerIdentity(input.preferredUser, input.actor)) {
    return actorId;
  }
  return preferred;
}

/** Map a Zoho/import owner string onto the canonical directory user. */
export function resolveDirectoryOwnerId(
  owner: { name?: string | null; email?: string | null } | null | undefined,
  directory: ProducerRef[],
  fallbackId: string,
): string {
  const email = owner?.email?.trim().toLowerCase();
  if (email) {
    const hit = directory.find((user) => (user.email ?? "").trim().toLowerCase() === email);
    if (hit) {
      const group = directory.filter((user) => sameProducerIdentity(user, hit));
      return canonicalProducerId(group.length ? group : [hit]) || fallbackId;
    }
  }
  const name = normalizeProducerName(owner?.name);
  if (name) {
    const probe: ProducerRef = { id: "", name: owner?.name ?? "", email: owner?.email ?? "", role: "" };
    const group = directory.filter(
      (user) =>
        sameProducerIdentity(user, probe) || normalizeProducerName(user.name) === name,
    );
    if (group.length) return canonicalProducerId(group) || fallbackId;
  }
  return fallbackId;
}
