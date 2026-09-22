import { attachPolicyFiles } from "@/app/actions/policy-files";
import { deletePolicyFilingAttachment } from "@/app/actions/policies";
import { ChooseFiles } from "@/components/choose-files";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { InDeskEsignPanel } from "@/components/esign/in-desk-panel";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDay } from "@/lib/domain";
import { autoTagDocType } from "@/lib/policy/document-depth";
import type { Document } from "@/lib/db/schema";
import {
  PolicyDocumentsTable,
  type PolicyDocRow,
} from "@/components/policy/tabs/documents-table";
import { IdCardsUploadPanel } from "@/components/policy/id-cards-upload-panel";
import { deskNow } from "@/lib/home/as-of";
import { shouldShowManualRenewalHelp } from "@/lib/policy/care-strip";

export function PolicyDocumentsTab({
  policy,
  files,
  filingAttachments,
  partyName,
  envelope,
  notice,
  accessLog = [],
  isAdmin = false,
}: {
  policy: {
    id: string;
    dealId: string | null;
    riskId: string | null;
    status?: string | null;
    expirationDate?: Date | string | null;
    esignStatus: string;
    esignRequestedAt: Date | null;
    esignSignedAt: Date | null;
    esignSignerName: string | null;
  };
  files: Array<Document & { versionCount?: number }>;
  filingAttachments: Array<{
    id: string;
    filename: string;
    docType: string;
  }>;
  partyName: string;
  envelope: Parameters<typeof InDeskEsignPanel>[0]["envelope"];
  notice?: string;
  accessLog?: Array<{
    id: string;
    actorName: string;
    action: string;
    createdAt: Date | string;
    filename?: string | null;
  }>;
  isAdmin?: boolean;
}) {
  const showManualRenewalHelp = shouldShowManualRenewalHelp({
    expirationDate: policy.expirationDate,
    status: policy.status,
    asOf: deskNow(),
  });

  return (
    <div className="space-y-4" data-ff-policy-tab="documents">
      {showManualRenewalHelp ? (
        <section
          className="ff-card border-amber-200/80 bg-amber-50/40 p-4"
          data-ff-manual-renewal-help=""
        >
          <h2 className="text-base font-semibold text-navy">Manual renewal upload</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No AMS renewal API yet — park paper here, then compare terms.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-navy/90">
            <li>Upload current term DEC/complete as <strong>Issued declaration page</strong>.</li>
            <li>Upload the new renewal DEC or binder.</li>
            <li>
              Then Overview → <strong>Renew</strong> opens Compare for terms.
            </li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            AOR-change renewals use this same Documents home; API later drops into the same place.
          </p>
        </section>
      ) : null}
      <section className="ff-card p-4">
        <h2 className="text-base font-semibold text-navy">Policy documents</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Auto-tagged by type. Filter / sort below. Re-upload keeps version history. ID / COI /
          inspection warn at 30 days when an expiry is set.
        </p>
        <form
          action={attachPolicyFiles}
          className="my-3 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3"
        >
          <input type="hidden" name="policyId" value={policy.id} />
          <input type="hidden" name="dealId" value={policy.dealId ?? ""} />
          <div>
            <Label className="text-xs">Type</Label>
            <select
              name="docType"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue="policy_dec"
            >
              <option value="policy_dec">Issued declaration page</option>
              <option value="policy_complete">Complete policy</option>
              <option value="policy_id">ID card</option>
              <option value="endorsement">Endorsement</option>
              <option value="application">Application</option>
              <option value="binder">Binder</option>
              <option value="aor">AOR packet</option>
              <option value="coi">COI</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Expires (optional)</Label>
            <input
              type="date"
              name="expiresAt"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">File</Label>
            <ChooseFiles name="file" required className="mt-1" />
          </div>
          <Button type="submit" size="sm">
            Attach file
          </Button>
        </form>
        <div className="my-3 space-y-2 rounded-md border border-dashed border-border p-3" data-ff-id-cards-quiet="">
          <div>
            <h3 className="text-sm font-semibold text-navy">Upload ID cards</h3>
            <p className="text-xs text-muted-foreground">
              Always available here — no reminder popup. Pick, clear, rename, multi-file OK.
            </p>
          </div>
          <IdCardsUploadPanel policyId={policy.id} dealId={policy.dealId} compact />
        </div>
        <PolicyDocumentsTable
          files={files.map(
            (f): PolicyDocRow => ({
              id: f.id,
              filename: f.filename,
              docType: f.docType,
              slot: f.slot,
              createdAt: f.createdAt,
              expiresAt: f.expiresAt ?? null,
              versionCount: f.versionCount,
            }),
          )}
          policyId={policy.id}
          dealId={policy.dealId}
        />
        {filingAttachments.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-navy">Change / notice files</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {filingAttachments.map((file) => (
                <li key={file.id} className="ff-file-row">
                  <span>
                    <span className="font-medium">{file.filename}</span>
                    <span className="ml-2 uppercase text-muted-foreground">
                      {autoTagDocType(file.docType)}
                    </span>
                  </span>
                  <HardDeleteForm
                    action={deletePolicyFilingAttachment}
                    subject={`the file “${file.filename}”`}
                    className="inline"
                  >
                    <input type="hidden" name="policyId" value={policy.id} />
                    <input type="hidden" name="attachmentId" value={file.id} />
                    <FileDeleteIcon />
                  </HardDeleteForm>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <InDeskEsignPanel
        recordKind="policy"
        recordId={policy.id}
        riskId={policy.riskId}
        partyName={partyName}
        status={policy.esignStatus}
        requestedAt={policy.esignRequestedAt}
        signedAt={policy.esignSignedAt}
        signerName={policy.esignSignerName}
        docs={files}
        envelope={envelope}
        notice={notice}
      />
      <p className="text-xs text-muted-foreground">
        In-desk e-sign stub — template packets and per-signer status. Finish-line DocuSign stays
        parked.
      </p>

      {isAdmin ? (
        <section className="ff-card p-4" data-ff-doc-access-log="">
          <h2 className="text-base font-semibold text-navy">Document access log</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agency-only. Agents see files, not this log.
          </p>
          {accessLog.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No access events recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-md border border-border">
              {accessLog.map((row) => (
                <li key={row.id} className="px-3 py-2 text-sm">
                  <div className="font-medium text-navy">
                    {row.actorName} · {row.action}
                  </div>
                  <p className="text-muted-foreground">
                    {formatDay(row.createdAt)}
                    {row.filename ? ` · ${row.filename}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
