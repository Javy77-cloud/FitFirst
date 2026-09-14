"use server";

import { AdminOnlyError } from "@/lib/auth/guards";
import { currentDeskSession } from "@/lib/auth/session";
import { userIsSiteDeveloper } from "@/lib/developer/site-developer";
import {
  clearFedExVault,
  clearGetParcelDataVault,
  clearPermitStackVault,
  saveFedExVault,
  saveGetParcelDataVault,
  savePermitStackVault,
} from "@/lib/developer/vault";
import { flashAction } from "@/lib/flash-action";

const VAULT_HREF = "/settings/developer-hub/api-vault";

class SiteDeveloperOnlyError extends Error {
  constructor(message = "Site developer only.") {
    super(message);
    this.name = "SiteDeveloperOnlyError";
  }
}

async function requireSiteDeveloper() {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.isAdmin) throw new AdminOnlyError();
  if (!userIsSiteDeveloper(session.user) && !session.isSiteDeveloper) {
    throw new SiteDeveloperOnlyError();
  }
  return session;
}

export async function saveFedExVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch {
    flashAction(VAULT_HREF, "Site developer only.", "error");
  }
  const apiKey = String(formData.get("apiKey") ?? "");
  const apiSecret = String(formData.get("apiSecret") ?? "");
  const accountNumber = String(formData.get("accountNumber") ?? "");
  const environment = String(formData.get("environment") ?? "sandbox") === "production" ? "production" : "sandbox";
  try {
    await saveFedExVault({
      apiKey,
      apiSecret,
      accountNumber,
      environment,
      actorId: session.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save FedEx credentials.";
    flashAction(VAULT_HREF, message, "error");
  }
  flashAction(VAULT_HREF, "fedex-vault-saved");
}

export async function clearFedExVaultAction() {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch {
    flashAction(VAULT_HREF, "Site developer only.", "error");
  }
  await clearFedExVault(session.userId);
  flashAction(VAULT_HREF, "fedex-vault-cleared");
}

export async function saveGetParcelDataVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch {
    flashAction(VAULT_HREF, "Site developer only.", "error");
  }
  const apiKey = String(formData.get("apiKey") ?? "");
  try {
    await saveGetParcelDataVault({
      apiKey,
      actorId: session.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save GetParcelData API key.";
    flashAction(VAULT_HREF, message, "error");
  }
  flashAction(VAULT_HREF, "getparceldata-vault-saved");
}

export async function clearGetParcelDataVaultAction() {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch {
    flashAction(VAULT_HREF, "Site developer only.", "error");
  }
  await clearGetParcelDataVault(session.userId);
  flashAction(VAULT_HREF, "getparceldata-vault-cleared");
}

export async function savePermitStackVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch {
    flashAction(VAULT_HREF, "Site developer only.", "error");
  }
  const apiKey = String(formData.get("apiKey") ?? "");
  try {
    await savePermitStackVault({
      apiKey,
      actorId: session.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save PermitStack API key.";
    flashAction(VAULT_HREF, message, "error");
  }
  flashAction(VAULT_HREF, "permitstack-vault-saved");
}

export async function clearPermitStackVaultAction() {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch {
    flashAction(VAULT_HREF, "Site developer only.", "error");
  }
  await clearPermitStackVault(session.userId);
  flashAction(VAULT_HREF, "permitstack-vault-cleared");
}
