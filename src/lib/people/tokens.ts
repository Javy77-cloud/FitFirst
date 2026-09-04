import { randomBytes } from "node:crypto";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function newDeskToken(): string {
  return randomBytes(24).toString("hex");
}

export function tokenExpiresAt(from = new Date(), ttlMs = DEFAULT_TTL_MS): Date {
  return new Date(from.getTime() + ttlMs);
}

export function isTokenLive(token: string | null | undefined, expiresAt: Date | null | undefined, now = new Date()) {
  if (!token?.trim()) return false;
  if (!expiresAt) return false;
  return expiresAt.getTime() > now.getTime();
}

export function invitePath(token: string): string {
  return `/login/invite?token=${encodeURIComponent(token)}`;
}

export function resetPath(token: string): string {
  return `/login/reset?token=${encodeURIComponent(token)}`;
}

export function normalizeLogin(raw: string): string {
  return raw.trim().toLowerCase();
}

export function emailFromUsername(username: string): string {
  const slug = normalizeLogin(username).replace(/[^a-z0-9._-]/g, "");
  return `${slug || "agent"}@fitfirst.local`;
}

export function usernameFromEmail(email: string): string {
  const local = normalizeLogin(email).split("@")[0] ?? "";
  return local.replace(/[^a-z0-9._-]/g, "") || "agent";
}
