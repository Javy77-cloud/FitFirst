"use server";

import { currentDeskSession } from "@/lib/auth/session";
import {
  assertSiteDeveloperSession,
  SignInRequiredError,
} from "@/lib/developer/site-developer";
import {
  clearFedExVault,
  clearGetParcelDataVault,
  clearPermitStackVault,
  saveFedExVault,
  saveGetParcelDataVault,
  savePermitStackVault,
} from "@/lib/developer/vault";
import {
  clearHealthSherpaAcaVault,
  clearHealthSherpaInboundVault,
  clearHealthSherpaMedicareVault,
  saveHealthSherpaAcaVault,
  saveHealthSherpaInboundVault,
  saveHealthSherpaMedicareVault,
} from "@/lib/healthsherpa/vault";
import { flashAction } from "@/lib/flash-action";

const VAULT_HREF = "/settings/developer-hub/api-vault";

async function requireSiteDeveloper() {
  const session = await currentDeskSession();
  assertSiteDeveloperSession(session);
  return session;
}

function denyVaultMutate(error: unknown): never {
  if (error instanceof SignInRequiredError) {
    flashAction(VAULT_HREF, "Sign in to continue.", "error");
  }
  flashAction(VAULT_HREF, "Site developer only.", "error");
}

export async function saveFedExVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
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
  } catch (error) {
    denyVaultMutate(error);
  }
  await clearFedExVault(session.userId);
  flashAction(VAULT_HREF, "fedex-vault-cleared");
}

export async function saveGetParcelDataVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
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
  } catch (error) {
    denyVaultMutate(error);
  }
  await clearGetParcelDataVault(session.userId);
  flashAction(VAULT_HREF, "getparceldata-vault-cleared");
}

export async function savePermitStackVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
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
  } catch (error) {
    denyVaultMutate(error);
  }
  await clearPermitStackVault(session.userId);
  flashAction(VAULT_HREF, "permitstack-vault-cleared");
}

export async function saveHealthSherpaMedicareVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
  }
  try {
    await saveHealthSherpaMedicareVault({
      apiKey: String(formData.get("apiKey") ?? ""),
      agentEmail: String(formData.get("agentEmail") ?? ""),
      environment: String(formData.get("environment") ?? "sandbox") === "production" ? "production" : "sandbox",
      actorId: session.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save HealthSherpa Medicare key.";
    flashAction(VAULT_HREF, message, "error");
  }
  flashAction(VAULT_HREF, "healthsherpa-medicare-vault-saved");
}

export async function clearHealthSherpaMedicareVaultAction() {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
  }
  await clearHealthSherpaMedicareVault(session.userId);
  flashAction(VAULT_HREF, "healthsherpa-medicare-vault-cleared");
}

export async function saveHealthSherpaAcaVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
  }
  try {
    await saveHealthSherpaAcaVault({
      apiKey: String(formData.get("apiKey") ?? ""),
      actorId: session.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save HealthSherpa Marketplace key.";
    flashAction(VAULT_HREF, message, "error");
  }
  flashAction(VAULT_HREF, "healthsherpa-aca-vault-saved");
}

export async function clearHealthSherpaAcaVaultAction() {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
  }
  await clearHealthSherpaAcaVault(session.userId);
  flashAction(VAULT_HREF, "healthsherpa-aca-vault-cleared");
}

export async function saveHealthSherpaInboundVaultAction(formData: FormData) {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
  }
  try {
    await saveHealthSherpaInboundVault({
      apiKey: String(formData.get("apiKey") ?? ""),
      actorId: session.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save HealthSherpa inbound secret.";
    flashAction(VAULT_HREF, message, "error");
  }
  flashAction(VAULT_HREF, "healthsherpa-inbound-vault-saved");
}

export async function clearHealthSherpaInboundVaultAction() {
  let session;
  try {
    session = await requireSiteDeveloper();
  } catch (error) {
    denyVaultMutate(error);
  }
  await clearHealthSherpaInboundVault(session.userId);
  flashAction(VAULT_HREF, "healthsherpa-inbound-vault-cleared");
}
