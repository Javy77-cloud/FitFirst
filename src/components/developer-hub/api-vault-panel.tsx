"use client";

import { useState } from "react";
import {
  clearFedExVaultAction,
  clearGetParcelDataVaultAction,
  clearHealthSherpaAcaVaultAction,
  clearHealthSherpaInboundVaultAction,
  clearHealthSherpaMedicareVaultAction,
  clearMetaVaultAction,
  clearPermitStackVaultAction,
  saveFedExVaultAction,
  saveGetParcelDataVaultAction,
  saveHealthSherpaAcaVaultAction,
  saveHealthSherpaInboundVaultAction,
  saveHealthSherpaMedicareVaultAction,
  saveMetaVaultAction,
  savePermitStackVaultAction,
} from "@/app/actions/developer-vault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { looksLikeMaskedSecret, SECRET_MASK, type VaultPublicStatus } from "@/lib/developer/vault-public";

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
            Outbound Medicare Partner API key FitFirst sends to HealthSherpa. This is not the inbound
            webhook secret HealthSherpa posts to FitFirst. v1 uses X-API-Key; agent email is required on
            each contact sync.
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
        {status.source === "env" ? " · configured from server env (vault row empty)" : status.source === "vault" ? " · stored in vault" : " · not configured"}
        . Do not paste the inbound webhook secret here.
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

function HealthSherpaAcaVaultCard({
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
      data-ff-vault-provider="healthsherpa_aca"
      data-ff-vault-can-edit={canEdit ? "1" : "0"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">{status.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Outbound ICHRA / QuoteConnect partner key. Same HealthSherpa integration as Medicare — not the
            inbound webhook secret. FitFirst does not quote ACA inside the desk — Sync opens Marketplace
            and can call QuoteConnect.
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
        {status.source === "env" ? " · configured from server env (vault row empty)" : status.source === "vault" ? " · stored in vault" : " · not configured"}
        . Do not paste the inbound webhook secret here.
      </p>
      {canEdit ? (
        unlocked ? (
          <form action={saveHealthSherpaAcaVaultAction} className="space-y-3 border-t border-border pt-3" data-ff-vault-unlock>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="hs-aca-key" className="text-xs">
                  New partner key
                </Label>
                <Input id="hs-aca-key" name="apiKey" type="password" required autoComplete="new-password" className="mt-1 h-8" />
              </div>
              <div>
                <Label htmlFor="hs-aca-agent" className="text-xs">
                  Agent id (optional)
                </Label>
                <Input id="hs-aca-agent" name="agentId" autoComplete="off" className="mt-1 h-8" />
              </div>
              <div>
                <Label htmlFor="hs-aca-env" className="text-xs">
                  Environment
                </Label>
                <select
                  id="hs-aca-env"
                  name="environment"
                  defaultValue={status.environment}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  <option value="sandbox">Staging (api.ichra-staging.healthsherpa.com)</option>
                  <option value="production">Production (api.ichra.healthsherpa.com)</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Save HealthSherpa Marketplace
              </Button>
              <Button type="submit" size="sm" variant="outline" formAction={clearHealthSherpaAcaVaultAction}>
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

function inboundSourceLabel(status: VaultPublicStatus): string {
  if (status.unreadable) return "Stored but unreadable — re-save";
  if (status.source === "vault") return "Configured from vault";
  if (status.source === "env") return "Configured from HEALTHSHERPA_WEBHOOK_API_KEY";
  return "Not configured";
}

function HealthSherpaInboundVaultCard({
  canEdit,
  status,
}: {
  canEdit: boolean;
  status: VaultPublicStatus;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  return (
    <section
      className="ff-card space-y-4 border-primary/30 p-4"
      data-ff-api-vault
      data-ff-vault-provider="healthsherpa_inbound"
      data-ff-vault-can-edit={canEdit ? "1" : "0"}
      data-ff-vault-source={status.source}
      data-ff-vault-unreadable={status.unreadable ? "1" : "0"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">{status.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Secret HealthSherpa sends <span className="font-medium text-navy">to FitFirst</span> as{" "}
            <code className="text-[11px]">X-API-Key</code> on{" "}
            <code className="text-[11px]">POST /api/integrations/healthsherpa/webhook</code>. Do not
            paste the Medicare Partner API key or the Marketplace / ACA partner key here.
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
        <Label className="text-xs">Inbound webhook secret</Label>
        <Input
          readOnly
          value={status.configured ? SECRET_MASK : ""}
          placeholder="Not configured"
          className="mt-1 h-8"
          data-ff-vault-mask="inboundWebhookSecret"
        />
      </div>
      <p className="text-xs text-muted-foreground" data-ff-inbound-source={status.source}>
        Source: {inboundSourceLabel(status)}. Env fallback:{" "}
        <code className="text-[11px]">HEALTHSHERPA_WEBHOOK_API_KEY</code>. Admins see this mask only —
        there is no reveal.
      </p>
      {status.unreadable ? (
        <p className="text-xs text-destructive" data-ff-inbound-unreadable="">
          The inbound vault row could not be decrypted (or a masked value was saved). Unlock and paste
          the real webhook secret once to overwrite it.
        </p>
      ) : null}
      {canEdit ? (
        unlocked ? (
          <form
            action={saveHealthSherpaInboundVaultAction}
            className="space-y-3 border-t border-border pt-3"
            data-ff-vault-unlock
            data-ff-inbound-unlock=""
            onSubmit={(event) => {
              const submitter = "submitter" in event.nativeEvent ? (event.nativeEvent as SubmitEvent).submitter : null;
              if (submitter instanceof HTMLButtonElement && submitter.getAttribute("formAction")) {
                return;
              }
              const value = String(new FormData(event.currentTarget).get("inboundWebhookSecret") ?? "");
              if (looksLikeMaskedSecret(value)) {
                event.preventDefault();
                setSaveError("Paste the real inbound webhook secret. Masked values are not saved.");
              }
            }}
          >
            <p className="text-xs text-muted-foreground">
              Vault unlocked. Paste the inbound webhook secret HealthSherpa is configured to send. The
              previous value is never shown, so a masked field cannot overwrite the vault.
            </p>
            <div className="max-w-md">
              <Label htmlFor="healthsherpa-inbound-webhook-secret" className="text-xs">
                New inbound webhook secret
              </Label>
              <Input
                id="healthsherpa-inbound-webhook-secret"
                name="inboundWebhookSecret"
                type="password"
                required
                autoComplete="new-password"
                className="mt-1 h-8"
                data-ff-inbound-secret-input=""
              />
            </div>
            {saveError ? (
              <p className="text-xs text-destructive" data-ff-inbound-mask-error="">
                {saveError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Save inbound webhook secret
              </Button>
              <Button type="submit" size="sm" variant="outline" formAction={clearHealthSherpaInboundVaultAction}>
                Clear
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setUnlocked(false)}>
                Lock vault
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" size="sm" onClick={() => setUnlocked(true)} data-ff-vault-unlock-btn>
            Unlock inbound vault
          </Button>
        )
      ) : (
        <SiteDeveloperLockNote />
      )}
    </section>
  );
}

function MetaVaultCard({ canEdit, meta }: { canEdit: boolean; meta: VaultPublicStatus }) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <section
      className="ff-card space-y-4 p-4"
      data-ff-api-vault
      data-ff-vault-provider="meta"
      data-ff-vault-can-edit={canEdit ? "1" : "0"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">{meta.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            FitFirst-owned Meta app for one-click Facebook and Instagram Connect. Agency Admin never
            sees or pastes these keys. Env fallback:{" "}
            <code className="text-[11px]">META_APP_ID</code> /{" "}
            <code className="text-[11px]">META_APP_SECRET</code>.
          </p>
        </div>
        <span
          className="rounded-md bg-muted px-2 py-1 text-xs text-navy"
          data-ff-vault-status={meta.configured ? "configured" : "empty"}
        >
          {meta.configured ? "Configured" : "Not configured"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">App ID</Label>
          <Input
            readOnly
            value={meta.configured ? SECRET_MASK : ""}
            placeholder="Not configured"
            className="mt-1 h-8"
            data-ff-vault-mask="appId"
          />
        </div>
        <div>
          <Label className="text-xs">App Secret</Label>
          <Input
            readOnly
            value={meta.configured ? SECRET_MASK : ""}
            placeholder="Not configured"
            className="mt-1 h-8"
            data-ff-vault-mask="appSecret"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {meta.source === "env" ? "Configured from server env (vault row empty). " : null}
        Admins see this mask only — there is no reveal.
      </p>

      {canEdit ? (
        unlocked ? (
          <form action={saveMetaVaultAction} className="space-y-3 border-t border-border pt-3" data-ff-vault-unlock>
            <p className="text-xs text-muted-foreground">
              Vault unlocked. Enter new values to rotate. Previous secrets are never shown.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="meta-app-id" className="text-xs">
                  New App ID
                </Label>
                <Input id="meta-app-id" name="appId" required autoComplete="off" className="mt-1 h-8" />
              </div>
              <div>
                <Label htmlFor="meta-app-secret" className="text-xs">
                  New App Secret
                </Label>
                <Input
                  id="meta-app-secret"
                  name="appSecret"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="mt-1 h-8"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Save Meta app
              </Button>
              <Button type="submit" size="sm" variant="outline" formAction={clearMetaVaultAction}>
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
  meta,
}: {
  canEdit: boolean;
  fedex: VaultPublicStatus;
  getParcelData: VaultPublicStatus;
  permitStack: VaultPublicStatus;
  healthSherpaMedicare: VaultPublicStatus;
  healthSherpaAca: VaultPublicStatus;
  healthSherpaInbound: VaultPublicStatus;
  meta: VaultPublicStatus;
}) {
  return (
    <div className="space-y-4">
      <FedExVaultCard canEdit={canEdit} fedex={fedex} />
      <MetaVaultCard canEdit={canEdit} meta={meta} />
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
      <HealthSherpaInboundVaultCard canEdit={canEdit} status={healthSherpaInbound} />
      <HealthSherpaMedicareVaultCard canEdit={canEdit} status={healthSherpaMedicare} />
      <HealthSherpaAcaVaultCard canEdit={canEdit} status={healthSherpaAca} />
    </div>
  );
}
