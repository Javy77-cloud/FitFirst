"use server";

import { AdminOnlyError } from "@/lib/auth/guards";
import { currentDeskSession } from "@/lib/auth/session";
import { userIsSiteDeveloper } from "@/lib/developer/site-developer";
import {
  clearFedExVault,
  clearFloridaPropertyVault,
  saveFedExVault,
  saveFloridaPropertyVault,
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

export async function saveFloridaPropertyVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch {
    flashAction(VAULT_HREF, "Site developer only.", "error");
  }
  const apiKey = String(formData.get("apiKey") ?? "");
  try {
    await saveFloridaPropertyVault({
      apiKey,
      actorId: session.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save Florida Property API key.";
    flashAction(VAULT_HREF, message, "error");
  }
  flashAction(VAULT_HREF, "florida-property-vault-saved");
}

export async function clearFloridaPropertyVaultAction() {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch {
    flashAction(VAULT_HREF, "Site developer only.", "error");
  }
  await clearFloridaPropertyVault(session.userId);
  flashAction(VAULT_HREF, "florida-property-vault-cleared");
}
