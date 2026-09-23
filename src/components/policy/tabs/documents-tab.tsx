import { deletePolicyFilingAttachment } from "@/app/actions/policies";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { PolicyDocumentsAttach } from "@/components/policy/policy-documents-attach";
import { InDeskEsignPanel } from "@/components/esign/in-desk-panel";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
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
import { FillCompareFromDecsButton } from "@/components/policy/fill-compare-from-decs-button";
import { canFillCompareFromTermRoleDocs } from "@/lib/renewal/fill-compare-from-decs";

export function PolicyDocumentsTab({
  policy,
  files,
  filingAttachments,
  partyName,
  envelope,
  notice,
  accessLog = [],
  isAdmin = false,
  renewalHandled = false,
  uploadMode = { onVercel: false, directBlob: false },
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
  renewalHandled?: boolean;
  uploadMode?: { onVercel: boolean; directBlob: boolean };
}) {
  const showManualRenewalHelp = shouldShowManualRenewalHelp({
    expirationDate: policy.expirationDate,
    status: policy.status,
    asOf: deskNow(),
    renewalHandled,
  });
  const canFillCompare = canFillCompareFromTermRoleDocs(files);

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
            <li>Upload Prior/Current and Renewal DECs.</li>
            <li>
              Set <strong>Term role</strong> on each row (Prior / Current / Renewal / Archive), or click the
              filename → <strong>Set term role</strong>.
            </li>
            <li>
              Click <strong>Fill Compare from DECs</strong>, then Overview → <strong>Compare terms</strong> to
              see $ and % change.
            </li>
          </ol>
          {canFillCompare ? (
            <div className="mt-3">
              <FillCompareFromDecsButton policyId={policy.id} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Use the Term role column on each file (or filename → Set term role). Mark Prior or
              Current plus Renewal to unlock Fill Compare.
            </p>
          )}
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
        <PolicyDocumentsAttach
          policyId={policy.id}
          dealId={policy.dealId}
          uploadMode={uploadMode}
        />
        {canFillCompare && !showManualRenewalHelp ? (
          <div className="my-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 p-3">
            <FillCompareFromDecsButton policyId={policy.id} />
            <p className="text-xs text-muted-foreground">
              Extracts Prior/Current + Renewal DECs into Compare (premium $ and %).
            </p>
          </div>
        ) : null}
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
              tags: f.tags,
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
