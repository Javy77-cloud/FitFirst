import { advancePolicyNotice, createPolicyNotice } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/lib/domain";
import {
  NOTICE_DIARY_DISCLAIMER,
  NOTICE_KINDS,
  noticeKindLabel,
  noticeNextStep,
  noticeStatusLabel,
} from "@/lib/domain-ams";
import type { PolicyNotice } from "@/lib/db/schema";

export function NoticePanel({
  policyId,
  notices,
  error,
}: {
  policyId: string;
  notices: PolicyNotice[];
  error?: string;
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Cancel / non-renew notices</h2>
      <p className="mt-1 text-base text-muted-foreground">{NOTICE_DIARY_DISCLAIMER}</p>
      {notices.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No notices on this Policy. Draft one below — it does not file a change.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {notices.map((notice) => (
            <li key={notice.id} className="space-y-2 px-3 py-2">
              <div className="font-medium text-navy">{noticeKindLabel(notice.kind)}</div>
              <p className="text-sm text-muted-foreground">
                {noticeStatusLabel(notice.status)} · effective {formatDay(notice.effectiveOn)}
                {notice.mailedAt ? ` · mailed ${formatDay(notice.mailedAt)}` : ""}
              </p>
              <p className="text-sm">{notice.reason}</p>
              <p className="text-sm text-muted-foreground">{noticeNextStep(notice.status)}</p>
              {notice.status === "drafted" ? (
                <div className="flex flex-wrap gap-2">
                  <form action={advancePolicyNotice}>
                    <input type="hidden" name="noticeId" value={notice.id} />
                    <input type="hidden" name="action" value="mail" />
                    <input type="hidden" name="returnTo" value={`/policies/${policyId}`} />
                    <Button type="submit" size="sm">
                      Mark mailed
                    </Button>
                  </form>
                  <form action={advancePolicyNotice}>
                    <input type="hidden" name="noticeId" value={notice.id} />
                    <input type="hidden" name="action" value="withdraw" />
                    <input type="hidden" name="returnTo" value={`/policies/${policyId}`} />
                    <Button type="submit" size="sm" variant="secondary">
                      Withdraw
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form action={createPolicyNotice} className="mt-4 space-y-3 rounded-md border border-border p-3">
        <input type="hidden" name="policyId" value={policyId} />
        <div>
          <Label htmlFor="notice-kind" className="text-xs">
            Notice kind
          </Label>
          <select
            id="notice-kind"
            name="kind"
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="non_renewal"
          >
            {NOTICE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {noticeKindLabel(kind)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="notice-reason" className="text-xs">
            Reason
          </Label>
          <Input id="notice-reason" name="reason" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="notice-effective" className="text-xs">
            Effective
          </Label>
          <Input id="notice-effective" name="effectiveOn" type="date" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="notice-notes" className="text-xs">
            Notes
          </Label>
          <Textarea id="notice-notes" name="notes" className="mt-1 min-h-16" />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="sm" variant="outline">
          Draft notice
        </Button>
      </form>
    </section>
  );
}
