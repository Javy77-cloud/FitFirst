import Link from "next/link";
import {
  addClaimAttachment,
  addClaimNote,
  notifyClaimProducer,
  updateClaim,
  updateClaimStatus,
} from "@/app/actions/claims";
import {
  ClaimCauseSelect,
  ClaimChannelSelect,
  ClaimStatusSelect,
  fieldClass,
} from "@/components/claims/field";
import { ClaimsDeskNotice } from "@/components/claims/desk-notice";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CLAIM_PIPELINE,
  CLAIM_STATUS_LABELS,
  claimCauseLabel,
  claimChannelLabel,
  claimStatusLabel,
} from "@/lib/claims";
import type { getClaimWorkspace } from "@/lib/db/claim-queries";
import { formatDate, formatDay } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Workspace = NonNullable<Awaited<ReturnType<typeof getClaimWorkspace>>>;

function dayValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function ClaimRecord({
  workspace,
  postedBy = "Javy",
}: {
  workspace: Workspace;
  postedBy?: string;
}) {
  const { claim, policy, contact, account, producer, notes, files, activity } = workspace;
  const party = contact
    ? `${contact.lastName}, ${contact.firstName}`
    : account?.name ?? "Unlinked";

  return (
    <div className="space-y-4">
      <ClaimsDeskNotice />
      <section className="ff-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              FNOL desk record
            </p>
            <h2 className="text-lg font-semibold text-navy">
              {claimCauseLabel(claim.causeType ?? "other")} · {party}
            </h2>
            <p className="mt-1 font-mono text-sm text-navy">
              Carrier claim # {claim.carrierClaimNumber || "not assigned yet"}
            </p>
          </div>
          <ClaimStatusBadge status={claim.status} />
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {CLAIM_PIPELINE.map((status, index) => {
            const current = CLAIM_PIPELINE.indexOf(
              claim.status === "inquiry" ||
                claim.status === "referred_to_carrier" ||
                claim.status === "closed"
                ? claim.status
                : "inquiry",
            );
            const reached = index <= current;
            return (
              <li
                key={status}
                className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  reached ? "border-fit-green bg-fit-green-bg text-navy" : "border-border text-muted-foreground",
                )}
              >
                <span className="font-medium">{index + 1}. {CLAIM_STATUS_LABELS[status]}</span>
              </li>
            );
          })}
        </ol>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Contact</dt>
            <dd>
              {contact ? (
                <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                  {contact.lastName}, {contact.firstName}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Policy</dt>
            <dd>
              {policy ? (
                <Link href={`/policies/${policy.id}`} className="text-primary hover:underline">
                  {policy.policyNumber}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date of loss</dt>
            <dd>{formatDay(claim.dateOfLoss)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date reported</dt>
            <dd>{formatDay(claim.dateReported)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">How they told us</dt>
            <dd>{claimChannelLabel(claim.reportedHow ?? "phone")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Producer</dt>
            <dd>
              {producer?.name ?? "No producer on the Policy or Contact"}
              {claim.producerNotifiedAt
                ? ` · pinged ${formatDate(claim.producerNotifiedAt)}`
                : " · not pinged"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Loss location</dt>
            <dd>{claim.lossLocation || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Reporter</dt>
            <dd>{claim.reporterName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Reporter phone</dt>
            <dd>{claim.reporterPhone || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">What happened</dt>
            <dd>{claim.description || "—"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {CLAIM_PIPELINE.filter((status) => status !== claim.status).map((status) => (
            <form key={status} action={updateClaimStatus}>
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="postedBy" value={postedBy} />
              <Button type="submit" size="sm" variant="outline">
                Set {claimStatusLabel(status)}
              </Button>
            </form>
          ))}
          <form action={notifyClaimProducer}>
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="postedBy" value={postedBy} />
            <Button type="submit" size="sm">
              Notify producer
            </Button>
          </form>
        </div>
      </section>

      <section className="ff-card p-4">
        <h3 className="text-sm font-semibold text-navy">Update FNOL fields</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Desk fields only. Adding a carrier claim number pings the producer again.
        </p>
        <form action={updateClaim} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="claimId" value={claim.id} />
          <input type="hidden" name="postedBy" value={postedBy} />
          <input type="hidden" name="policyId" value={claim.policyId ?? ""} />
          <input type="hidden" name="contactId" value={claim.contactId ?? ""} />
          <div>
            <Label className="text-xs">Date reported</Label>
            <Input name="dateReported" type="date" defaultValue={dayValue(claim.dateReported)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Date of loss</Label>
            <Input name="dateOfLoss" type="date" defaultValue={dayValue(claim.dateOfLoss)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Cause</Label>
            <ClaimCauseSelect defaultValue={claim.causeType ?? "other"} />
          </div>
          <div>
            <Label className="text-xs">How they told us</Label>
            <ClaimChannelSelect defaultValue={claim.reportedHow ?? "phone"} />
          </div>
          <div>
            <Label className="text-xs">Carrier claim #</Label>
            <Input
              name="carrierClaimNumber"
              defaultValue={claim.carrierClaimNumber ?? ""}
              className="mt-1 h-8 font-mono"
            />
          </div>
          <div>
            <Label className="text-xs">Desk status</Label>
            <ClaimStatusSelect defaultValue={claim.status} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Loss location</Label>
            <Input name="lossLocation" defaultValue={claim.lossLocation ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Reporter name</Label>
            <Input name="reporterName" defaultValue={claim.reporterName ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Reporter phone</Label>
            <Input name="reporterPhone" defaultValue={claim.reporterPhone ?? ""} className="mt-1 h-8" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">What happened</Label>
            <Textarea
              name="description"
              defaultValue={claim.description ?? ""}
              rows={3}
              className={`${fieldClass} h-auto min-h-16`}
            />
          </div>
          <Button type="submit" size="sm">
            Save fields
          </Button>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card p-4">
          <h3 className="text-sm font-semibold text-navy">Notes</h3>
          <form action={addClaimNote} className="mt-2 space-y-2">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="postedBy" value={postedBy} />
            <Textarea name="body" rows={3} placeholder="Walked them to the carrier site…" className={`${fieldClass} h-auto`} />
            <Button type="submit" size="sm" variant="outline">
              Add note
            </Button>
          </form>
          <ul className="mt-3 space-y-2">
            {notes.length === 0 ? (
              <li className="text-xs text-muted-foreground">No notes yet.</li>
            ) : (
              notes.map((note) => (
                <li key={note.id} className="text-sm">
                  <p>{note.body}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {note.postedBy} · {formatDate(note.createdAt)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="ff-card p-4">
          <h3 className="text-sm font-semibold text-navy">Files</h3>
          <form action={addClaimAttachment} className="mt-2 space-y-2">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="postedBy" value={postedBy} />
            <Input name="file" type="file" className="h-8" />
            <input type="hidden" name="docType" value="photo" />
            <Button type="submit" size="sm" variant="outline">
              Attach file
            </Button>
          </form>
          <ul className="mt-3 space-y-1 text-sm">
            {files.length === 0 ? (
              <li className="text-xs text-muted-foreground">No files on this notice.</li>
            ) : (
              files.map((file) => (
                <li key={file.id}>
                  <Link
                    href={`/api/claims/attachments/${file.id}`}
                    className="text-primary hover:underline"
                  >
                    {file.filename}
                  </Link>
                  <span className="ml-2 text-[11px] text-muted-foreground">{file.docType}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="ff-card p-4">
        <h3 className="text-sm font-semibold text-navy">Activity</h3>
        <ol className="mt-2 space-y-2">
          {activity.length === 0 ? (
            <li className="text-xs text-muted-foreground">No activity yet.</li>
          ) : (
            activity.map((row) => (
              <li key={row.id} className="text-sm">
                <p>{row.body}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.eventType.replaceAll("_", " ")} · {row.actor} · {formatDate(row.createdAt)}
                </p>
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}
