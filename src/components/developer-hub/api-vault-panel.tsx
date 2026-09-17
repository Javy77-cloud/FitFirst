"use client";

import { useState } from "react";
import {
  clearFedExVaultAction,
  clearGetParcelDataVaultAction,
  clearHealthSherpaAcaVaultAction,
  clearHealthSherpaInboundVaultAction,
  clearHealthSherpaMedicareVaultAction,
  clearPermitStackVaultAction,
  saveFedExVaultAction,
  saveGetParcelDataVaultAction,
  saveHealthSherpaAcaVaultAction,
  saveHealthSherpaInboundVaultAction,
  saveHealthSherpaMedicareVaultAction,
  savePermitStackVaultAction,
} from "@/app/actions/developer-vault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SECRET_MASK, type VaultPublicStatus } from "@/lib/developer/vault-public";

function SiteDeveloperLockNote() {
  return (
    <p className="text-xs text-muted-foreground" data-ff-vault-locked>
      Site developers only can unlock this vault. Admin can see that the API exists, not the raw key.
      Grant with <code className="text-[11px]">users.is_site_developer</code> or{" "}
      <code className="text-[11px]">FF_SITE_DEVELOPER_EMAILS</code>.
    </p>
  );
}

function FedExVaultCard({ canEdit, fedex }: { canEdit: boolean; fedex: VaultPublicStatus }) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <section className="ff-card space-y-4 p-4" data-ff-api-vault data-ff-vault-provider="fedex" data-ff-vault-can-edit={canEdit ? "1" : "0"}>
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
        <SiteDeveloperLockNote />
      )}
    </section>
  );
}

function SingleKeyVaultCard({
  canEdit,
  status,
  provider,
  envVar,
  blurb,
  inputId,
  saveLabel,
  saveAction,
  clearAction,
}: {
  canEdit: boolean;
  status: VaultPublicStatus;
  provider: string;
  envVar: string;
  blurb: string;
  inputId: string;
  saveLabel: string;
  saveAction: (formData: FormData) => void | Promise<void>;
  clearAction: () => void | Promise<void>;
}) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <section
      className="ff-card space-y-4 p-4"
      data-ff-api-vault
      data-ff-vault-provider={provider}
      data-ff-vault-can-edit={canEdit ? "1" : "0"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">{status.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {blurb} When <code className="text-[11px]">{envVar}</code> is not in{" "}
            <code className="text-[11px]">.env</code>, paste the key here.
          </p>
        </div>
        <span
          className="rounded-md bg-muted px-2 py-1 text-xs text-navy"
          data-ff-vault-status={status.configured ? "configured" : "empty"}
        >
          {status.configured ? "Configured" : "Not configured"}
        </span>
      </div>

      <div className="max-w-md">
        <Label className="text-xs">API key</Label>
        <Input
          readOnly
          value={status.configured ? SECRET_MASK : ""}
          placeholder="Not configured"
          className="mt-1 h-8"
          data-ff-vault-mask="apiKey"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {status.source === "env" ? "Configured from server env (vault row empty). " : null}
        Admins see this mask only — there is no reveal.
      </p>

      {canEdit ? (
        unlocked ? (
          <form action={saveAction} className="space-y-3 border-t border-border pt-3" data-ff-vault-unlock>
            <p className="text-xs text-muted-foreground">
              Vault unlocked. Enter a new key to rotate. Previous secrets are never shown.
            </p>
            <div className="max-w-md">
              <Label htmlFor={inputId} className="text-xs">
                New API key
              </Label>
              <Input
                id={inputId}
                name="apiKey"
                type="password"
                required
                autoComplete="new-password"
                className="mt-1 h-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                {saveLabel}
              </Button>
              <Button type="submit" size="sm" variant="outline" formAction={clearAction}>
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
        <SiteDeveloperLockNote />
      )}
    </section>
  );
}

function HealthSherpaMedicareVaultCard({
  canEdit,
  status,
}: {
  canEdit: boolean;
  status: VaultPublicStatus;
}) {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <section
      className="ff-card space-y-4 p-4"
      data-ff-api-vault
      data-ff-vault-provider="healthsherpa_medicare"
      data-ff-vault-can-edit={canEdit ? "1" : "0"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">{status.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Agency BYO Medicare Partner API key. FitFirst does not subscribe for the agency. v1 uses
            X-API-Key; agent email is required on each contact sync.
          </p>
        </div>
        <span
          className="rounded-md bg-muted px-2 py-1 text-xs text-navy"
          data-ff-vault-status={status.configured ? "configured" : "empty"}
        >
          {status.configured ? "Configured" : "Not configured"}
        </span>
      </div>
      <div className="max-w-md">
        <Label className="text-xs">API key</Label>
        <Input
          readOnly
          value={status.configured ? SECRET_MASK : ""}
          placeholder="Not configured"
          className="mt-1 h-8"
          data-ff-vault-mask="apiKey"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Environment: {status.environment}
        {status.source === "env" ? " · configured from server env (vault row empty)" : null}.
      </p>
      {canEdit ? (
        unlocked ? (
          <form action={saveHealthSherpaMedicareVaultAction} className="space-y-3 border-t border-border pt-3" data-ff-vault-unlock>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="hs-medicare-key" className="text-xs">
                  New API key
                </Label>
                <Input id="hs-medicare-key" name="apiKey" type="password" required autoComplete="new-password" className="mt-1 h-8" />
              </div>
              <div>
                <Label htmlFor="hs-medicare-agent" className="text-xs">
                  Default agent email
                </Label>
                <Input id="hs-medicare-agent" name="agentEmail" type="email" autoComplete="off" className="mt-1 h-8" />
              </div>
              <div>
                <Label htmlFor="hs-medicare-env" className="text-xs">
                  Environment
                </Label>
                <select
                  id="hs-medicare-env"
                  name="environment"
                  defaultValue={status.environment}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  <option value="sandbox">Staging (api.medicare-staging.healthsherpa.com)</option>
                  <option value="production">Production (api.medicare.healthsherpa.com)</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Save HealthSherpa Medicare
              </Button>
              <Button type="submit" size="sm" variant="outline" formAction={clearHealthSherpaMedicareVaultAction}>
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
        <SiteDeveloperLockNote />
      )}
    </section>
  );
}

export function ApiVaultPanel({
  canEdit,
  fedex,
  getParcelData,
  permitStack,
  healthSherpaMedicare,
  healthSherpaAca,
  healthSherpaInbound,
}: {
  canEdit: boolean;
  fedex: VaultPublicStatus;
  getParcelData: VaultPublicStatus;
  permitStack: VaultPublicStatus;
  healthSherpaMedicare: VaultPublicStatus;
  healthSherpaAca: VaultPublicStatus;
  healthSherpaInbound: VaultPublicStatus;
}) {
  return (
    <div className="space-y-4">
      <FedExVaultCard canEdit={canEdit} fedex={fedex} />
      <SingleKeyVaultCard
        canEdit={canEdit}
        status={getParcelData}
        provider="getparceldata"
        envVar="GETPARCELDATA_API_KEY"
        blurb='Agency BYO monthly GetParcelData key so Fill can geocode the quote-sheet address and pull parcel details. FitFirst never invents parcels or Coverage A from assessed value.'
        inputId="getparceldata-api-key"
        saveLabel="Save GetParcelData key"
        saveAction={saveGetParcelDataVaultAction}
        clearAction={clearGetParcelDataVaultAction}
      />
      <SingleKeyVaultCard
        canEdit={canEdit}
        status={permitStack}
        provider="permitstack"
        envVar="PERMITSTACK_API_KEY"
        blurb="Agency BYO PermitStack key so Fill can read property permit history and write roof / HVAC / water-heater years as CHECK when the category and date are confident."
        inputId="permitstack-api-key"
        saveLabel="Save PermitStack key"
        saveAction={savePermitStackVaultAction}
        clearAction={clearPermitStackVaultAction}
      />
      <HealthSherpaMedicareVaultCard canEdit={canEdit} status={healthSherpaMedicare} />
      <SingleKeyVaultCard
        canEdit={canEdit}
        status={healthSherpaAca}
        provider="healthsherpa_aca"
        envVar="HEALTHSHERPA_ACA_API_KEY"
        blurb="Agency BYO Marketplace / ICHRA partner key. QuoteConnect stays scaffolded until HealthSherpa onboards the agency. FitFirst does not quote ACA inside the desk."
        inputId="healthsherpa-aca-api-key"
        saveLabel="Save HealthSherpa Marketplace key"
        saveAction={saveHealthSherpaAcaVaultAction}
        clearAction={clearHealthSherpaAcaVaultAction}
      />
      <SingleKeyVaultCard
        canEdit={canEdit}
        status={healthSherpaInbound}
        provider="healthsherpa_inbound"
        envVar="HEALTHSHERPA_WEBHOOK_API_KEY"
        blurb="Secret HealthSherpa sends as X-API-Key on POST /api/integrations/healthsherpa/webhook. Manual enrollments may not fire."
        inputId="healthsherpa-inbound-api-key"
        saveLabel="Save inbound webhook secret"
        saveAction={saveHealthSherpaInboundVaultAction}
        clearAction={clearHealthSherpaInboundVaultAction}
      />
    </div>
  );
}
