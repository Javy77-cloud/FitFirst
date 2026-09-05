import { completeClaimDiary, createClaimDiary } from "@/app/actions/claims";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/lib/domain";
import {
  CLAIM_DIARY_DISCLAIMER,
  CLAIM_DIARY_KINDS,
  claimDiaryKindLabel,
  claimDiaryStatusLabel,
} from "@/lib/domain-ams";
import type { ClaimDiaryEntry } from "@/lib/db/schema";

export function ClaimDiaryPanel({
  claimId,
  entries,
  postedBy = "Javy",
  error,
}: {
  claimId: string;
  entries: ClaimDiaryEntry[];
  postedBy?: string;
  error?: string;
}) {
  const open = entries.filter((row) => row.status === "open");
  const closed = entries.filter((row) => row.status !== "open");

  return (
    <section className="ff-card p-4">
      <h3 className="text-sm font-semibold text-navy">Claim diary</h3>
      <p className="mt-1 text-xs text-muted-foreground">{CLAIM_DIARY_DISCLAIMER}</p>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {open.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No open diary rows on this claim.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {open.map((row) => (
            <li key={row.id} className="space-y-2 px-3 py-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-navy">{claimDiaryKindLabel(row.kind)}</span>
                <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                  {claimDiaryStatusLabel(row.status)}
                </span>
                {row.dueAt ? (
                  <span className="text-sm text-muted-foreground">due {formatDay(row.dueAt)}</span>
                ) : null}
              </div>
              <p className="text-sm">{row.body}</p>
              <form action={completeClaimDiary}>
                <input type="hidden" name="entryId" value={row.id} />
                <input type="hidden" name="returnTo" value={`/claims/${claimId}`} />
                <input type="hidden" name="postedBy" value={postedBy} />
                <Button type="submit" size="sm" variant="outline">
                  Mark done
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={createClaimDiary} className="mt-4 space-y-3 rounded-md border border-border p-3">
        <input type="hidden" name="claimId" value={claimId} />
        <input type="hidden" name="postedBy" value={postedBy} />
        <div>
          <Label htmlFor={`diary-kind-${claimId}`} className="text-xs">
            Kind
          </Label>
          <select
            id={`diary-kind-${claimId}`}
            name="kind"
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="follow_up"
          >
            {CLAIM_DIARY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {claimDiaryKindLabel(kind)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`diary-due-${claimId}`} className="text-xs">
            Due
          </Label>
          <Input id={`diary-due-${claimId}`} name="dueAt" type="date" className="mt-1" />
        </div>
        <div>
          <Label htmlFor={`diary-body-${claimId}`} className="text-xs">
            Note
          </Label>
          <Textarea
            id={`diary-body-${claimId}`}
            name="body"
            required
            className="mt-1 min-h-16"
            placeholder="What needs to happen next on the carrier site…"
          />
        </div>
        <Button type="submit" size="sm" variant="outline">
          Add diary row
        </Button>
      </form>
      {closed.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {closed.map((row) => (
            <li key={row.id}>
              {claimDiaryKindLabel(row.kind)} · {claimDiaryStatusLabel(row.status)} ·{" "}
              {formatDay(row.completedAt ?? row.updatedAt)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
