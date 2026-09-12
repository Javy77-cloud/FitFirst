"use client";

import { useState } from "react";
import { logQuoteHandoffCheck, revealCarrierPortalSecret } from "@/app/actions/carrier-secrets";
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
  return fieldKey;
}

export function PortalLoginAdmin({
  carrierId,
  usernameHint,
  hasUsername,
  hasPassword,
  readiness,
  audits,
}: {
  carrierId: string;
  usernameHint: string | null;
  hasUsername: boolean;
  hasPassword: boolean;
  readiness: QuoteHandoffReadiness;
  audits: AuditRow[];
}) {
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [check, setCheck] = useState<QuoteHandoffReadiness>(readiness);
  const [localAudits, setLocalAudits] = useState(audits);
  const [reachable, setReachable] = useState<boolean | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Portal username</Label>
          <div className="mt-1 flex gap-2">
            <Input
              name="portalUsername"
              autoComplete="off"
              defaultValue=""
              placeholder={hasUsername ? usernameHint || "On file — leave blank to keep" : "Agency portal user"}
              className="h-8"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasUsername || busy === "username"}
              onClick={() => void reveal("username")}
            >
              {username ? "Shown" : "Reveal"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {username ? (
              <span className="font-medium text-navy">{username}</span>
            ) : hasUsername ? (
              <>On file as {usernameHint || "••••"}. Reveal is Admin-only and writes an audit stub.</>
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
              defaultValue=""
              placeholder={hasPassword ? "••••••••  leave blank to keep" : "Agency portal password"}
              className="h-8"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPassword || busy === "password"}
              onClick={() => void reveal("password")}
            >
              {password ? "Shown" : "Reveal"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {password ? (
              <span className="font-medium text-navy">{password}</span>
            ) : hasPassword ? (
              "Masked at rest. Reveal is Admin-only and writes an audit stub."
            ) : (
              "No password stored."
            )}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-secondary/40 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-navy">Quote handoff readiness</p>
            <p className="text-xs text-muted-foreground">
              Stores URL, agency code, and login for later portal fill. Chrome Fill already exists —
              this bot does not open the carrier site.
            </p>
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
        <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          <li>Portal URL — {check.portalUrl ? "on file" : "missing"}</li>
          <li>Agency code — {check.agencyCode ? "on file" : "missing"}</li>
          <li>Username — {check.username ? "encrypted" : "missing"}</li>
          <li>Password — {check.password ? "encrypted" : "missing"}</li>
        </ul>
        {check.missing.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Still needed: {check.missing.join(", ")}.</p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={busy === "handoff"}
          onClick={() => void runHandoffCheck()}
        >
          Log readiness check
        </Button>
        {reachable != null ? (
          <p className="mt-2 text-xs text-muted-foreground">URL reachable: {reachable ? "Y" : "N"}</p>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

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
  );
}
