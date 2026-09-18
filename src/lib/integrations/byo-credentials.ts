export type ByoSecretWritePlan =
  | { action: "write"; secret: string }
  | { action: "keep" }
  | { action: "reject"; message: string };

/**
 * Placeholder / keep-existing secrets for BYO OAuth.
 * Empty, all-stars (`****************`), and any bullet mask (`••••`, `fi••••mo`)
 * mean "leave the stored secret alone".
 * A real vendor secret that happens to contain `*` must still write.
 */
export function isByoPlaceholderSecret(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return true;
  if (raw.includes("•")) return true;
  return /^\*+$/.test(raw);
}

export function planByoSecretWrite(input: {
  incoming: string | null | undefined;
  hasExistingSecret: boolean;
}): ByoSecretWritePlan {
  const incoming = (input.incoming ?? "").trim();
  if (isByoPlaceholderSecret(incoming)) {
    if (input.hasExistingSecret) return { action: "keep" };
    return {
      action: "reject",
      message: "Paste the agency Secret Key. A blank or masked field does not save.",
    };
  }
  return { action: "write", secret: incoming };
}

export function planByoClientId(input: {
  incoming: string | null | undefined;
  existing: string | null | undefined;
}): { ok: true; clientId: string } | { ok: false; message: string } {
  const incoming = (input.incoming ?? "").trim();
  const existing = (input.existing ?? "").trim();
  const clientId = incoming || existing;
  if (!clientId) {
    return {
      ok: false,
      message: "Paste the Integration Key / Client ID.",
    };
  }
  return { ok: true, clientId };
}
