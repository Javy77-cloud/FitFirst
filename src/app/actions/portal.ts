"use server";

import { redirect } from "next/navigation";
import type { PolicyChangeKind } from "@/lib/policy/status";
import { resolvePortalToken, portalHref } from "@/lib/portal/session";
import { submitCoiRequest, submitPolicyChangeRequest } from "@/lib/portal/requests";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function asChangeKind(value: string): PolicyChangeKind | null {
  if (value === "endorsement" || value === "cancellation" || value === "non_renewal") {
    return value;
  }
  return null;
}

export async function openPortalLink(formData: FormData) {
  const token = str(formData, "token");
  const resolved = await resolvePortalToken(token);
  if (!resolved.ok) {
    redirect(`/portal?error=${encodeURIComponent(resolved.error)}`);
  }
  redirect(portalHref(resolved.session.token.token));
}

export async function requestPortalCoi(formData: FormData) {
  const token = str(formData, "token");
  const resolved = await resolvePortalToken(token);
  if (!resolved.ok) {
    redirect(`/portal?error=${encodeURIComponent(resolved.error)}`);
  }

  const result = await submitCoiRequest(resolved.session, {
    holderName: str(formData, "holderName"),
    holderAddress: str(formData, "holderAddress"),
    jobLocation: str(formData, "jobLocation"),
  });

  if (!result.ok) {
    redirect(
      `${portalHref(token, "coi")}?error=${encodeURIComponent(result.error)}`,
    );
  }
  if (result.reused) {
    redirect(
      `${portalHref(token, `coi/${result.certificate.id}`)}?reused=1`,
    );
  }
  redirect(`${portalHref(token, "coi")}?queued=${result.request.id}`);
}

export async function requestPortalPolicyChange(formData: FormData) {
  const token = str(formData, "token");
  const resolved = await resolvePortalToken(token);
  if (!resolved.ok) {
    redirect(`/portal?error=${encodeURIComponent(resolved.error)}`);
  }

  const changeKind = asChangeKind(str(formData, "changeKind"));
  if (!changeKind) {
    redirect(
      `${portalHref(token, "changes")}?error=${encodeURIComponent("Choose endorsement, cancellation, or non-renewal.")}`,
    );
  }

  const result = await submitPolicyChangeRequest(resolved.session, {
    policyId: str(formData, "policyId"),
    changeKind,
    effectiveDate: str(formData, "effectiveDate"),
    reason: str(formData, "reason"),
    summary: str(formData, "summary"),
  });

  if (!result.ok) {
    redirect(
      `${portalHref(token, "changes")}?error=${encodeURIComponent(result.error)}`,
    );
  }
  redirect(`${portalHref(token, "changes")}?queued=${result.request.id}`);
}
