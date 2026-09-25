"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useState } from "react";
import {
  logQuoteHandoffCheck,
  revealCarrierPortalSecret,
  saveCarrierPortalCredentials,
} from "@/app/actions/carrier-secrets";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import { CarrierPortalUrlField } from "@/components/carriers/carrier-inline-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QuoteHandoffReadiness } from "@/lib/carriers/secrets";

type AuditRow = {
  id: string;
  fieldKey: string;
  actorName: string | null;
  createdAt: Date | string;
};

function auditLabel(fieldKey: string) {
  if (fieldKey === "username") return "Revealed username";
  if (fieldKey === "password") return "Revealed password";
  if (fieldKey === "handoff_check") return "Quote handoff readiness check";
  if (fieldKey === "readiness_check_ok") return "Readiness check · reachable Y";
  if (fieldKey === "readiness_check_fail") return "Readiness check · reachable N";
  if (fieldKey === "credentials_saved") return "Portal credentials saved";
  return fieldKey;
}

/** Admin Portal Login — Save lives in the section header so it cannot disappear. */
export function PortalLoginBlock({
  carrierId,
  agencyCode: agencyCodeInitial,
  usernameHint,
  hasUsername,
  hasPassword,
  readiness,
  audits,
  portalUrl,
  admin,
}: {
  carrierId: string;
  agencyCode?: string | null;
  usernameHint: string | null;
  hasUsername: boolean;
  hasPassword: boolean;
  readiness: QuoteHandoffReadiness;
  audits: AuditRow[];
  portalUrl?: string | null;
  admin: boolean;
}) {
  const [agencyCodeDraft, setAgencyCodeDraft] = useState(agencyCodeInitial?.trim() ?? "");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [check, setCheck] = useState<QuoteHandoffReadiness>(readiness);
  const [localAudits, setLocalAudits] = useState(audits ?? []);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [storedUser, setStoredUser] = useState(hasUsername);
  const [storedPass, setStoredPass] = useState(hasPassword);
  const [hint, setHint] = useState(usernameHint);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  async function reveal(field: "username" | "password") {
    setBusy(field);
    setError(null);
    const result = await revealCarrierPortalSecret({ carrierId, field });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (field === "username") setUsername(result.value);
    else setPassword(result.value);
    setLocalAudits((rows) => [
      {
        id: `local-${field}-${Date.now()}`,
        fieldKey: field,
        actorName: "You",
        createdAt: new Date().toISOString(),
      },
      ...rows,
    ]);
  }

  async function saveCredentials() {
    setBusy("save");
    setError(null);
    setSavedFlash(null);
    const result = await saveCarrierPortalCredentials({
      carrierId,
      agencyCode: agencyCodeDraft,
      username: usernameDraft,
      password: passwordDraft,
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStoredUser(result.hasUsername);
    setStoredPass(result.hasPassword);
    setHint(result.usernameHint);
    setAgencyCodeDraft(result.agencyCode ?? "");
    setCheck({
      ...check,
      agencyCode: Boolean(result.agencyCode?.trim()),
      username: result.hasUsername,
      password: result.hasPassword,
      ready: result.ready,
      missing: result.missing,
    });
    setUsernameDraft("");
    setPasswordDraft("");
    setSavedFlash("Saved for this carrier — agency code, username, and password.");
    setLocalAudits((rows) => [
      {
        id: `local-save-${Date.now()}`,
        fieldKey: "credentials_saved",
        actorName: "You",
        createdAt: new Date().toISOString(),
      },
      ...rows,
    ]);
  }

  async function runHandoffCheck() {
    setBusy("handoff");
    setError(null);
    const result = await logQuoteHandoffCheck(carrierId);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCheck({
      ...check,
      ready: result.ready,
      missing: result.missing,
    });
    if ("reachable" in result) setReachable(Boolean((result as { reachable?: boolean }).reachable));
    setLocalAudits((rows) => [
      {
        id: `local-handoff-${Date.now()}`,
        fieldKey: "handoff_check",
        actorName: "You",
        createdAt: new Date().toISOString(),
      },
      ...rows,
    ]);
  }

  const saveButton = (
    <Button
      type="button"
      variant="default"
      size="default"
      disabled={busy === "save"}
      onClick={() => void saveCredentials()}
      data-ff-carrier-portal-save=""
      className="ff-portal-save min-w-[9rem] font-semibold shadow-sm"
      style={{ backgroundColor: "#002868", color: "#ffffff", borderColor: "#002868" }}
    >
      {busy === "save" ? <ProcessingLabel>Saving…</ProcessingLabel> : "Save portal login"}
    </Button>
  );

  return (
    <CollapsibleSection
      id="portal-login"
      title="Portal Login"
      className="overflow-visible"
      data-ff="carrier-portal-login-section"
      defaultOpen={false}
      badge={
        check.ready ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
            Ready
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            Missing items
          </span>
        )
      }
    >
      <div className="space-y-4" data-ff-carrier-portal-login="">
        <CarrierPortalUrlField
          carrierId={carrierId}
          value={portalUrl ?? ""}
          admin={admin}
        />

        <div
          className="grid gap-3 lg:grid-cols-2 lg:items-start"
          data-ff-carrier-portal-split=""
        >
          <div className="space-y-2.5" data-ff-carrier-portal-creds="">
            <div>
              <Label className="text-xs">Agency code</Label>
              <Input
                name="portalAgencyCode"
                autoComplete="off"
                value={agencyCodeDraft}
                onChange={(e) => setAgencyCodeDraft(e.target.value)}
                placeholder="This carrier’s agency / producer code"
                className="mt-1 h-8"
                data-ff-carrier-agency-code=""
              />
            </div>
            <div>
              <Label className="text-xs">Portal username</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  name="portalUsername"
                  autoComplete="off"
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value)}
                  placeholder={
                    storedUser ? hint || "On file — leave blank to keep" : "Agency portal user"
                  }
                  className="h-8"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!storedUser || busy === "username"}
                  onClick={() => void reveal("username")}
                >
                  {username ? "Shown" : "Reveal"}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {username ? (
                  <span className="font-medium text-navy">{username}</span>
                ) : storedUser ? (
                  <>On file as {hint || "••••"}.</>
                ) : (
                  "No username stored."
                )}
              </p>
            </div>
            <div>
              <Label className="text-xs">Portal password</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  name="portalPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwordDraft}
                  onChange={(e) => setPasswordDraft(e.target.value)}
                  placeholder={storedPass ? "••••••••  leave blank to keep" : "Agency portal password"}
                  className="h-8"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!storedPass || busy === "password"}
                  onClick={() => void reveal("password")}
                >
                  {password ? "Shown" : "Reveal"}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {password ? (
                  <span className="font-medium text-navy">{password}</span>
                ) : storedPass ? (
                  "Masked at rest."
                ) : (
                  "No password stored."
                )}
              </p>
            </div>
            <div
              className="ff-portal-save-bar flex flex-wrap items-center gap-2 rounded-md px-3 py-2"
              data-ff-carrier-portal-save-bar=""
              style={{ backgroundColor: "#eef2f7", border: "1px solid rgba(0,40,104,0.25)" }}
            >
              {saveButton}

            </div>
            {savedFlash ? <p className="text-xs font-medium text-green-800">{savedFlash}</p> : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <div
            className="rounded-md border px-3 py-3"
            data-ff-carrier-portal-handoff=""
            style={{
              backgroundColor: "#e8f1fb",
              borderColor: "rgba(0,40,104,0.22)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-navy">Quote handoff readiness</p>

              </div>
              <span
                className={
                  check.ready
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                    : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                }
              >
                {check.ready ? "Ready to hand off" : "Missing items"}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              <li className={check.portalUrl ? "text-navy/90" : "font-medium text-[#BF0A30]"}>
                Portal URL — {check.portalUrl ? "on file" : "missing"}
              </li>
              <li className={check.agencyCode ? "text-navy/90" : "font-medium text-[#BF0A30]"}>
                Agency code — {check.agencyCode ? "on file" : "missing"}
              </li>
              <li className={check.username ? "text-navy/90" : "font-medium text-[#BF0A30]"}>
                Username — {check.username ? "encrypted" : "missing"}
              </li>
              <li className={check.password ? "text-navy/90" : "font-medium text-[#BF0A30]"}>
                Password — {check.password ? "encrypted" : "missing"}
              </li>
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 bg-white"
              disabled={busy === "handoff"}
              onClick={() => void runHandoffCheck()}
            >
              Log readiness check
            </Button>
            {reachable != null ? (
              <p className="mt-2 text-[11px]">
                URL reachable:{" "}
                <span
                  className={
                    reachable
                      ? "font-semibold text-green-700"
                      : "font-semibold text-[#BF0A30]"
                  }
                >
                  {reachable ? "YES" : "NO"}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-navy">Audit stub</p>
          {localAudits.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">No Admin reveals or handoff checks yet.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {localAudits.slice(0, 8).map((row) => (
                <li key={row.id}>
                  {auditLabel(row.fieldKey)}
                  {row.actorName ? ` · ${row.actorName}` : ""}
                  {" · "}
                  {new Date(row.createdAt).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
