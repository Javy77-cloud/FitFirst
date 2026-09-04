import { encryptSecret, isMaskedSecretInput, maskUsername } from "@/lib/secrets/vault";
import type { Carrier } from "@/lib/db/schema";

export type PortalSecretCols = {
  portalUsernameEnc: string | null;
  portalUsernameIv: string | null;
  portalUsernameHint: string | null;
  portalPasswordEnc: string | null;
  portalPasswordIv: string | null;
  portalSecretsUpdatedAt: Date | null;
};

export type PublicCarrier = Omit<
  Carrier,
  | "portalUsernameEnc"
  | "portalUsernameIv"
  | "portalPasswordEnc"
  | "portalPasswordIv"
> & {
  hasPortalUsername: boolean;
  hasPortalPassword: boolean;
};

export type QuoteHandoffReadiness = {
  portalUrl: boolean;
  agencyCode: boolean;
  username: boolean;
  password: boolean;
  ready: boolean;
  missing: string[];
};

export function writePortalUsername(plaintext: string | null | undefined): Pick<
  PortalSecretCols,
  "portalUsernameEnc" | "portalUsernameIv" | "portalUsernameHint"
> {
  const value = plaintext?.trim() || null;
  if (!value) {
    return { portalUsernameEnc: null, portalUsernameIv: null, portalUsernameHint: null };
  }
  const sealed = encryptSecret(value);
  return {
    portalUsernameEnc: sealed.enc,
    portalUsernameIv: sealed.iv,
    portalUsernameHint: maskUsername(value),
  };
}

export function writePortalPassword(plaintext: string | null | undefined): Pick<
  PortalSecretCols,
  "portalPasswordEnc" | "portalPasswordIv"
> {
  const value = plaintext?.trim() || null;
  if (!value) return { portalPasswordEnc: null, portalPasswordIv: null };
  const sealed = encryptSecret(value);
  return { portalPasswordEnc: sealed.enc, portalPasswordIv: sealed.iv };
}

export function replacePortalUsername(
  incoming: string | null | undefined,
  existing: Pick<PortalSecretCols, "portalUsernameEnc" | "portalUsernameIv" | "portalUsernameHint">,
): Pick<PortalSecretCols, "portalUsernameEnc" | "portalUsernameIv" | "portalUsernameHint"> {
  if (isMaskedSecretInput(incoming)) return existing;
  return writePortalUsername(incoming);
}

export function replacePortalPassword(
  incoming: string | null | undefined,
  existing: Pick<PortalSecretCols, "portalPasswordEnc" | "portalPasswordIv">,
): Pick<PortalSecretCols, "portalPasswordEnc" | "portalPasswordIv"> {
  if (isMaskedSecretInput(incoming)) return existing;
  return writePortalPassword(incoming);
}

export function quoteHandoffReadiness(input: {
  portalUrl?: string | null;
  agencyCode?: string | null;
  hasPortalUsername?: boolean;
  hasPortalPassword?: boolean;
}): QuoteHandoffReadiness {
  const portalUrl = Boolean(input.portalUrl?.trim());
  const agencyCode = Boolean(input.agencyCode?.trim());
  const username = Boolean(input.hasPortalUsername);
  const password = Boolean(input.hasPortalPassword);
  const missing: string[] = [];
  if (!portalUrl) missing.push("Portal URL");
  if (!agencyCode) missing.push("Agency code");
  if (!username) missing.push("Portal username");
  if (!password) missing.push("Portal password");
  return {
    portalUrl,
    agencyCode,
    username,
    password,
    ready: missing.length === 0,
    missing,
  };
}

export function publicCarrierView(carrier: Carrier, isAdmin: boolean): PublicCarrier {
  const {
    portalUsernameEnc,
    portalUsernameIv,
    portalPasswordEnc,
    portalPasswordIv,
    portalUsernameHint,
    ...rest
  } = carrier;
  const hasPortalUsername = Boolean(portalUsernameEnc && portalUsernameIv);
  const hasPortalPassword = Boolean(portalPasswordEnc && portalPasswordIv);
  if (!isAdmin) {
    return {
      ...rest,
      portalUsernameHint: null,
      hasPortalUsername: false,
      hasPortalPassword: false,
    };
  }
  return {
    ...rest,
    portalUsernameHint,
    hasPortalUsername,
    hasPortalPassword,
  };
}

export function assertNoSecretPlaintext(payload: unknown): void {
  const raw = JSON.stringify(payload);
  if (raw.includes("portalUsernameEnc") || raw.includes("portalPasswordEnc")) {
    throw new Error("Carrier secret ciphertext must not leave the vault mapper.");
  }
}
