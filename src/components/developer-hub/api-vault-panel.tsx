"use client";

import { useState } from "react";
import { clearFedExVaultAction, saveFedExVaultAction } from "@/app/actions/developer-vault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SECRET_MASK, type VaultPublicStatus } from "@/lib/developer/vault-public";

export function ApiVaultPanel({
  canEdit,
  fedex,
}: {
  canEdit: boolean;
  fedex: VaultPublicStatus;
}) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <section className="ff-card space-y-4 p-4" data-ff-api-vault data-ff-vault-can-edit={canEdit ? "1" : "0"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">{fedex.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Agency BYO. Paste FedEx Developer Portal API Key + Secret Key. FitFirst does not subscribe for the
            agency. Address fields stay plain text until a key is saved.
          </p>
        </div>
        <span
          className="rounded-md bg-muted px-2 py-1 text-xs text-navy"
          data-ff-vault-status={fedex.configured ? "configured" : "empty"}
        >
          {fedex.configured ? "Configured" : "Not configured"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">API key</Label>
          <Input
            readOnly
            value={fedex.configured ? SECRET_MASK : ""}
            placeholder="Not configured"
            className="mt-1 h-8"
            data-ff-vault-mask="apiKey"
          />
        </div>
        <div>
          <Label className="text-xs">Secret key</Label>
          <Input
            readOnly
            value={fedex.configured ? SECRET_MASK : ""}
            placeholder="Not configured"
            className="mt-1 h-8"
            data-ff-vault-mask="apiSecret"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Environment: {fedex.environment}
        {fedex.source === "env" ? " · configured from server env (vault row empty)" : null}. Admins see this
        mask only — there is no reveal.
      </p>

      {canEdit ? (
        unlocked ? (
          <form action={saveFedExVaultAction} className="space-y-3 border-t border-border pt-3" data-ff-vault-unlock>
            <p className="text-xs text-muted-foreground">
              Vault unlocked. Enter new values to rotate. Previous secrets are never shown.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="fedex-api-key" className="text-xs">
                  New API key
                </Label>
                <Input id="fedex-api-key" name="apiKey" required autoComplete="off" className="mt-1 h-8" />
              </div>
              <div>
                <Label htmlFor="fedex-api-secret" className="text-xs">
                  New secret key
                </Label>
                <Input
                  id="fedex-api-secret"
                  name="apiSecret"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="mt-1 h-8"
                />
              </div>
              <div>
                <Label htmlFor="fedex-account" className="text-xs">
                  Account number (optional)
                </Label>
                <Input id="fedex-account" name="accountNumber" autoComplete="off" className="mt-1 h-8" />
              </div>
              <div>
                <Label htmlFor="fedex-env" className="text-xs">
                  Environment
                </Label>
                <select
                  id="fedex-env"
                  name="environment"
                  defaultValue={fedex.environment}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  <option value="sandbox">Sandbox (apis-sandbox.fedex.com)</option>
                  <option value="production">Production (apis.fedex.com)</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Save FedEx credentials
              </Button>
              <Button type="submit" size="sm" variant="outline" formAction={clearFedExVaultAction}>
                Clear
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setUnlocked(false)}>
                Lock vault
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" size="sm" onClick={() => setUnlocked(true)} data-ff-vault-unlock-btn>
            Unlock vault
          </Button>
        )
      ) : (
        <p className="text-xs text-muted-foreground" data-ff-vault-locked>
          Site developers only can unlock this vault. Admin can see that the API exists, not the raw key.
          Grant with <code className="text-[11px]">users.is_site_developer</code> or{" "}
          <code className="text-[11px]">FF_SITE_DEVELOPER_EMAILS</code>.
        </p>
      )}
    </section>
  );
}
