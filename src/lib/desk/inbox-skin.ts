export const INBOX_MAIL_PROVIDERS = ["gmail", "outlook", "yahoo"] as const;
export type InboxMailProvider = (typeof INBOX_MAIL_PROVIDERS)[number];

/** Muscle-memory skins the desk can render. Yahoo mail stays stubbed — never a Yahoo skin. */
export const INBOX_SKINS = ["gmail", "outlook"] as const;
export type InboxSkinId = (typeof INBOX_SKINS)[number];

export function resolveInboxSkin(provider: InboxMailProvider | null | undefined): InboxSkinId {
  if (provider === "outlook") return "outlook";
  return "gmail";
}

export function inboxSkinListRole(skin: InboxSkinId): "gmail-list" | "outlook-list" {
  return skin === "outlook" ? "outlook-list" : "gmail-list";
}
