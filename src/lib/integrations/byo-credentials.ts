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
  /** Blank / mask keeps the stored secret only when the Client ID did not change. */
  clientIdUnchanged?: boolean;
}): ByoSecretWritePlan {
  const incoming = (input.incoming ?? "").trim();
  if (isByoPlaceholderSecret(incoming)) {
    const idUnchanged = input.clientIdUnchanged !== false;
    if (input.hasExistingSecret && idUnchanged) return { action: "keep" };
    return {
      action: "reject",
      message:
        input.hasExistingSecret && !idUnchanged
          ? "Paste the new Client Secret. Changing the Client ID cannot keep the old secret."
          : "Paste the agency Secret Key. A blank or masked field does not save.",
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

export type ByoVaultCandidate = {
  provider: string;
  clientId: string;
  clientSecret: string;
  connected?: boolean;
  lastOauthError?: string | null;
  updatedAtMs?: number;
};

export type ByoFamilyCredentialPick = {
  clientId: string;
  clientSecret: string;
  source: "form" | "sibling" | "own";
};

/** Google's invalid_client body, plus common vendor wording. */
export function looksLikeInvalidClientSecretError(message: string | null | undefined): boolean {
  const raw = (message ?? "").toLowerCase();
  if (!raw) return false;
  if (raw.includes("client secret is invalid")) return true;
  if (raw.includes("invalid_client")) return true;
  return raw.includes("client secret") && raw.includes("invalid");
}

export function isUsableByoVaultSecret(secret: string | null | undefined): boolean {
  return !isByoPlaceholderSecret(secret);
}

/**
 * Google-family BYO Connect used to take the provider's own vault secret first.
 * After Calendar saved a working secret, Gmail still exchanged with its stale
 * row and Google returned "The provided client secret is invalid."
 *
 * Prefer freshly typed form values, then a sibling vault secret (connected /
 * newest first), then the provider's own row. Skip placeholder and
 * stale-invalid secrets when a better sibling exists.
 */
export function pickByoFamilyCredentials(input: {
  form?: { clientId?: string | null; clientSecret?: string | null } | null;
  own: ByoVaultCandidate | null;
  siblings: ByoVaultCandidate[];
}): ByoFamilyCredentialPick | null {
  const formId = (input.form?.clientId ?? "").trim();
  const formSecret = (input.form?.clientSecret ?? "").trim();
  if (isUsableByoVaultSecret(formSecret)) {
    const clientId =
      formId || input.own?.clientId.trim() || input.siblings.find((row) => row.clientId.trim())?.clientId.trim() || "";
    if (clientId) return { clientId, clientSecret: formSecret, source: "form" };
  }

  const usableSiblings = input.siblings.filter(
    (row) =>
      row.clientId.trim() &&
      isUsableByoVaultSecret(row.clientSecret) &&
      !looksLikeInvalidClientSecretError(row.lastOauthError),
  );
  usableSiblings.sort((a, b) => {
    if (Boolean(a.connected) !== Boolean(b.connected)) return a.connected ? -1 : 1;
    return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
  });
  const sibling = usableSiblings[0];
  if (sibling) {
    return { clientId: sibling.clientId.trim(), clientSecret: sibling.clientSecret, source: "sibling" };
  }

  const own = input.own;
  if (own?.clientId.trim() && isUsableByoVaultSecret(own.clientSecret)) {
    return { clientId: own.clientId.trim(), clientSecret: own.clientSecret, source: "own" };
  }
  return null;
}

export function byoOauthWallCopy(lastOauthError?: string | null): string {
  const detail = (lastOauthError ?? "").trim();
  if (detail) return `OAuth stopped at the vendor wall. ${detail}`;
  return "OAuth stopped at the vendor wall. Open the card for the error from Google / Microsoft / Yahoo / Meta / DocuSign.";
}
