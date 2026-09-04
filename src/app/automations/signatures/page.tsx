import {
  approveSignatureDraft,
  rejectSignatureDraft,
  saveSignatureDraft,
} from "@/app/actions/signature-approvals";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  SIGNATURE_STATUS_LABEL,
  isSignatureApprovalStatus,
} from "@/lib/automations/types";
import {
  listLiveAgencySignatures,
  listMySignatures,
  listPendingSignatureApprovals,
  listSignaturesWithOwners,
} from "@/lib/db/automation-queries";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  return isSignatureApprovalStatus(status) ? SIGNATURE_STATUS_LABEL[status] : status;
}

export default async function AutomationsSignaturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const [mine, pending, live, all] = await Promise.all([
    session.userId ? listMySignatures(session.userId) : Promise.resolve([]),
    listPendingSignatureApprovals(),
    listLiveAgencySignatures(),
    session.isAdmin ? listSignaturesWithOwners() : Promise.resolve([]),
  ]);
  const latestDraft = mine.find((row) => row.approvalStatus !== "live") ?? null;

  return (
    <AppShell title="Email signatures">
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Agents write a signature draft. Admin must approve before it is live. The agency default
        close stays in Settings until someone replaces it.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        <form action={saveSignatureDraft} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">
            {session.isAdmin ? "Your draft or agency note" : "Your signature draft"}
          </h2>
          <input type="hidden" name="id" value={latestDraft?.id ?? ""} />
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              name="name"
              className="mt-1 h-8"
              defaultValue={latestDraft?.name ?? `${session.name} — producer`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">English</Label>
              <Textarea name="bodyEn" rows={7} className="mt-1" defaultValue={latestDraft?.bodyEn ?? ""} />
            </div>
            <div>
              <Label className="text-xs">Español</Label>
              <Textarea name="bodyEs" rows={7} className="mt-1" defaultValue={latestDraft?.bodyEs ?? ""} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="outline" name="intent" value="draft">
              Save draft
            </Button>
            <Button type="submit" size="sm" name="intent" value="submit">
              Submit for Admin
            </Button>
          </div>
          {latestDraft ? (
            <p className="text-xs text-muted-foreground">
              Current status: {statusLabel(latestDraft.approvalStatus)}
              {latestDraft.reviewNote ? ` · ${latestDraft.reviewNote}` : ""}
            </p>
          ) : null}
        </form>

        <div className="space-y-4">
          <section className="ff-card p-4">
            <h2 className="text-sm font-semibold text-navy">Live agency close</h2>
            {live.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No live agency signature yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {live.map((row) => (
                  <li key={row.id} className="rounded-md border border-border px-3 py-2">
                    <div className="font-medium">{row.name}</div>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                      {row.bodyEn}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {session.isAdmin ? (
            <section className="ff-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-navy">Admin approval queue</h2>
                <p className="text-xs text-muted-foreground">
                  Stub queue. Approve or send back. Nothing emails the agent.
                </p>
              </div>
              {pending.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  No signatures waiting. Maya’s draft seeds here after migrate + seed.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {pending.map(({ signature, owner }) => (
                    <li key={signature.id} className="space-y-2 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{signature.name}</div>
                        <Badge variant="outline">{statusLabel(signature.approvalStatus)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From {owner?.name ?? "agent"} · submitted{" "}
                        {signature.submittedAt
                          ? signature.submittedAt.toISOString().slice(0, 10)
                          : "—"}
                      </p>
                      <pre className="whitespace-pre-wrap font-sans text-xs">{signature.bodyEn}</pre>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <form action={approveSignatureDraft} className="space-y-2">
                          <input type="hidden" name="id" value={signature.id} />
                          <Input name="reviewNote" className="h-8" placeholder="Approved" />
                          <Button type="submit" size="sm">
                            Approve live
                          </Button>
                        </form>
                        <form action={rejectSignatureDraft} className="space-y-2">
                          <input type="hidden" name="id" value={signature.id} />
                          <Input name="reviewNote" className="h-8" placeholder="Needs another pass" />
                          <Button type="submit" size="sm" variant="outline">
                            Send back
                          </Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="ff-card p-4">
              <h2 className="text-sm font-semibold text-navy">Your submissions</h2>
              {mine.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No drafts yet. Write one and submit it for Admin.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {mine.map((row) => (
                    <li key={row.id} className="rounded-md border border-border px-3 py-2 text-sm">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {statusLabel(row.approvalStatus)}
                        {row.reviewNote ? ` · ${row.reviewNote}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {session.isAdmin && all.length > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {all.length} signature rows on this tenant, including drafts.
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
