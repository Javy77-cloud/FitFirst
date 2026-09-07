import Link from "next/link";
import { notFound } from "next/navigation";
import { listCarrierSecretAudits } from "@/app/actions/carrier-secrets";
import { updateCarrierContact } from "@/app/actions/pipeline-admin";
import { PortalLoginAdmin } from "@/components/carriers/portal-login-admin";
import { AppShell } from "@/components/app-shell";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { RecordLayoutForm } from "@/components/custom-fields/record-layout-form";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { RecordAskPanel } from "@/components/record-ask";
import { RecordSection } from "@/components/record-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentDeskSession } from "@/lib/auth/session";
import { quoteHandoffReadiness } from "@/lib/carriers/secrets";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { getCarrier, listRecordAsks } from "@/lib/db/queries";
import { CARRIER_BINDING, CARRIER_BINDING_LABEL, CARRIER_SUBMISSION_METHODS, formatMoney } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { RecordTags } from "@/components/tags/record-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { colorsFromModuleTags } from "@/lib/tags/tag-colors";
import { suggestedTagsFor } from "@/lib/tags/module-tags";

export const dynamic = "force-dynamic";

function Field({
  label,
  name,
  defaultValue,
  admin,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  admin: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {admin ? (
        <Input name={name} defaultValue={defaultValue ?? ""} className="mt-1 h-8" />
      ) : (
        <p className="mt-1 text-sm">{defaultValue || "—"}</p>
      )}
    </div>
  );
}

export default async function CarrierRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row, asks, users, session, tagExtra, carrierLayout] = await Promise.all([
    getCarrier(id),
    listRecordAsks("carrier", id),
    listDeskUsers(),
    currentDeskSession(),
    listModuleTags("carriers").catch(() => [] as { name: string; color: string | null }[]),
    loadModuleLayoutBundle("carriers", id).catch(() => null),
  ]);
  if (!row) notFound();
  const { carrier, rule } = row;
  const admin = session.isAdmin;
  const audits = admin ? await listCarrierSecretAudits(id) : [];
  const readiness = quoteHandoffReadiness({
    portalUrl: carrier.portalUrl,
    agencyCode: carrier.agencyCode,
    hasPortalUsername: carrier.hasPortalUsername,
    hasPortalPassword: carrier.hasPortalPassword,
  });

  return (
    <AppShell title={carrier.name}>
      <div className="mb-3 flex justify-end">
        <EditLayoutLink module="carriers" />
      </div>
      <div className="mb-4">
        <RecordLayoutForm
          module="carriers"
          recordId={carrier.id}
          layout={carrierLayout?.layout ?? defaultLayoutForModule("carriers")}
          fields={carrierLayout?.fields ?? []}
          values={mergeRecordSystemValues(
            {
              ...carrier,
              phone: carrier.customerServicePhone,
              email: carrier.underwriterEmail,
            } as Record<string, unknown>,
            carrierLayout?.stored ?? {},
            carrierLayout?.fields ?? [],
          )}
          saveLabel="Save carrier fields"
        />
      </div>
      <div className="mb-4 max-w-lg">
        <RecordTags
          module="carriers"
          recordId={carrier.id}
          tags={carrier.tags}
          suggestions={suggestedTagsFor("carriers", tagExtra.map((row) => row.name))}
          colors={colorsFromModuleTags(tagExtra)}
        />
      </div>
      <form action={updateCarrierContact} className="space-y-4">
        <input type="hidden" name="carrierId" value={carrier.id} />

        <RecordSection id="identity" title="Carrier identity" summary="NAIC, rating, lines, and appetite notes">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="NAIC" name="naic" defaultValue={carrier.naic} admin={admin} />
            <Field label="AM Best" name="amBestRating" defaultValue={carrier.amBestRating} admin={admin} />
            <Field label="Territory" name="territory" defaultValue={carrier.territory} admin={admin} />
            <div>
              <Label className="text-xs">Written lines</Label>
              {admin ? (
                <Input
                  name="writtenLines"
                  defaultValue={(carrier.writtenLines ?? []).join(", ")}
                  className="mt-1 h-8"
                  placeholder="HO, DP3"
                />
              ) : (
                <p className="mt-1 text-sm">{(carrier.writtenLines ?? []).join(", ") || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Preferred submission</Label>
              {admin ? (
                <select
                  name="preferredSubmission"
                  defaultValue={carrier.preferredSubmission ?? "portal"}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {CARRIER_SUBMISSION_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm capitalize">{carrier.preferredSubmission ?? "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Binding authority</Label>
              {admin ? (
                <select
                  name="bindingAuthority"
                  defaultValue={carrier.bindingAuthority ?? "none"}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {CARRIER_BINDING.map((m) => (
                    <option key={m} value={m}>
                      {CARRIER_BINDING_LABEL[m]}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm">
                  {carrier.bindingAuthority
                    ? CARRIER_BINDING_LABEL[carrier.bindingAuthority as keyof typeof CARRIER_BINDING_LABEL] ??
                      carrier.bindingAuthority
                    : "—"}
                </p>
              )}
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="text-xs">Appetite notes</Label>
              {admin ? (
                <Textarea name="appetiteNotes" defaultValue={carrier.appetiteNotes ?? ""} className="mt-1 min-h-16" />
              ) : (
                <p className="mt-1 text-sm">{carrier.appetiteNotes || "—"}</p>
              )}
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="text-xs">Don&apos;t write</Label>
              {admin ? (
                <Textarea name="dontWriteNotes" defaultValue={carrier.dontWriteNotes ?? ""} className="mt-1 min-h-16" />
              ) : (
                <p className="mt-1 text-sm">{carrier.dontWriteNotes || "—"}</p>
              )}
            </div>
          </div>
        </RecordSection>

        <RecordSection id="commission" title="Commission" summary="Desk hints — not a carrier contract">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="New business %"
              name="newBusinessCommPct"
              defaultValue={carrier.newBusinessCommPct}
              admin={admin}
            />
            <Field label="Renewal %" name="renewalCommPct" defaultValue={carrier.renewalCommPct} admin={admin} />
          </div>
        </RecordSection>

        <RecordSection id="contacts" title="Carrier contacts" summary="UW, AM, service, claims, billing">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Underwriter" name="underwriterName" defaultValue={carrier.underwriterName} admin={admin} />
            <Field label="UW email" name="underwriterEmail" defaultValue={carrier.underwriterEmail} admin={admin} />
            <Field label="UW phone" name="underwriterPhone" defaultValue={carrier.underwriterPhone} admin={admin} />
            <Field
              label="Account manager"
              name="accountManagerName"
              defaultValue={carrier.accountManagerName}
              admin={admin}
            />
            <Field label="AM email" name="accountManagerEmail" defaultValue={carrier.accountManagerEmail} admin={admin} />
            <Field label="AM phone" name="accountManagerPhone" defaultValue={carrier.accountManagerPhone} admin={admin} />
            <Field
              label="Customer service"
              name="customerServicePhone"
              defaultValue={carrier.customerServicePhone}
              admin={admin}
            />
            <Field label="Agent phone" name="agentPhone" defaultValue={carrier.agentPhone} admin={admin} />
            <Field label="Claims" name="claimsPhone" defaultValue={carrier.claimsPhone} admin={admin} />
            <Field label="Billing" name="billingPhone" defaultValue={carrier.billingPhone} admin={admin} />
          </div>
        </RecordSection>

        <RecordSection id="portal" title="Portal and info" summary="Login URL, agency code, website, and desk notes">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Portal URL" name="portalUrl" defaultValue={carrier.portalUrl} admin={admin} />
            <Field label="Agency code" name="agencyCode" defaultValue={carrier.agencyCode} admin={admin} />
            <Field label="Portal name" name="portalLogin" defaultValue={carrier.portalLogin} admin={admin} />
            <Field label="Website" name="website" defaultValue={carrier.website} admin={admin} />
            <Field label="Agent portal" name="agentPortalUrl" defaultValue={carrier.agentPortalUrl} admin={admin} />
            <div className="sm:col-span-2">
              <Label className="text-xs">Carrier info</Label>
              {admin ? (
                <Textarea name="carrierInfo" defaultValue={carrier.carrierInfo ?? ""} className="mt-1 min-h-20" />
              ) : (
                <p className="mt-1 text-sm">{carrier.carrierInfo ?? "—"}</p>
              )}
            </div>
          </div>
        </RecordSection>

        {admin ? (
          <RecordSection
            id="portal-login"
            title="Portal login (Admin only)"
            summary="Encrypted quoting-portal username and password. Agents never see these fields."
          >
            <PortalLoginAdmin
              carrierId={carrier.id}
              usernameHint={carrier.portalUsernameHint}
              hasUsername={carrier.hasPortalUsername}
              hasPassword={carrier.hasPortalPassword}
              readiness={readiness}
              audits={audits}
            />
          </RecordSection>
        ) : null}

        {admin ? (
          <Button type="submit" size="sm">
            Save carrier
          </Button>
        ) : null}
      </form>

      {admin ? <RecordAskPanel entityType="carrier" entityId={carrier.id} asks={asks} users={users} /> : null}

      <RecordSection id="related" title="Related" summary="Appetite rule and decline log">
        <p className="mb-3 text-sm">
          <Link href="/logs" className="text-primary hover:underline">
            Decline log
          </Link>
        </p>
        {rule ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Cov A</dt>
              <dd>
                {formatMoney(rule.minCovA)} – {formatMoney(rule.maxCovA)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Roof / coast / mobile</dt>
              <dd>
                max roof {rule.maxRoofAge ?? "—"}y · coast {rule.minMilesToCoast ?? 0}+ mi · mobile{" "}
                {rule.mobileAllowed ? "yes" : "no"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No appetite rule on this carrier.</p>
        )}
      </RecordSection>
    </AppShell>
  );
}
