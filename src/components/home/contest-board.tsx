import { Trophy } from "lucide-react";
import { postContest } from "@/app/actions/home-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/domain";
import type { HomeContestView } from "@/lib/db/queries";

export function ContestBoard({
  contests,
  isAdmin,
  embedded = false,
}: {
  contests: HomeContestView[];
  isAdmin: boolean;
  embedded?: boolean;
}) {
  const contest = contests[0] ?? null;

  return (
    <section className={embedded ? "overflow-hidden" : "ff-card overflow-hidden"}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Trophy className="size-3.5 text-fit-flag" />
            Reward board
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Agency-wide standings. Quotes — including Ana&apos;s $321k HO3 — do not score.
          </p>
        </div>
      </div>
      {!contest ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">No active contest.</p>
      ) : (
        <div className="px-4 py-3">
          <div className="text-sm font-semibold text-navy">{contest.title}</div>
          <p className="mt-1 text-[12px] text-muted-foreground">{contest.rules}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {contest.startsAt.toISOString().slice(0, 10)} → {contest.endsAt.toISOString().slice(0, 10)} ·{" "}
            {contest.metric === "policy_count" ? "Policy count" : "Total premium"}
          </p>
          {contest.standings.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No writings in this window yet.</p>
          ) : (
            <ol className="mt-3 space-y-1.5">
              {contest.standings.map((row) => (
                <li key={row.userId} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 tabular-nums text-muted-foreground">{row.rank}.</span>
                    <span className="font-medium text-navy">{row.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {contest.metric === "policy_count"
                      ? `${row.policyCount} policies`
                      : formatMoney(row.premium)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {isAdmin ? (
        <form action={postContest} className="space-y-2 border-t border-border px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Post a contest
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="contest-title" className="text-xs">
                Title
              </Label>
              <Input id="contest-title" name="title" required className="mt-1 h-8" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="contest-rules" className="text-xs">
                Rules
              </Label>
              <Textarea id="contest-rules" name="rules" required rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Metric</Label>
              <select
                name="metric"
                defaultValue="premium"
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="premium">Total premium</option>
                <option value="policy_count">Policy count</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="contest-start" className="text-xs">
                  Start
                </Label>
                <Input id="contest-start" name="startsAt" type="date" required className="mt-1 h-8" />
              </div>
              <div>
                <Label htmlFor="contest-end" className="text-xs">
                  End
                </Label>
                <Input id="contest-end" name="endsAt" type="date" required className="mt-1 h-8" />
              </div>
            </div>
          </div>
          <Button type="submit" size="sm">
            Post announcement
          </Button>
        </form>
      ) : null}
    </section>
  );
}
