import { postAsk, resolveAsk } from "@/app/actions/asks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Actor } from "@/lib/auth/rbac";
import { canResolveAsk } from "@/lib/auth/rbac";
import type { AskEntityType } from "@/lib/domain";

type AskRow = {
  ask: {
    id: string;
    kind: string;
    body: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
  };
  author: { name: string };
};

export function AskThread({
  entityType,
  entityId,
  actor,
  asks,
  compact = false,
}: {
  entityType: AskEntityType;
  entityId: string;
  actor: Actor;
  asks: AskRow[];
  compact?: boolean;
}) {
  const openCount = asks.filter((row) => row.ask.status === "open").length;
  return (
    <details className="group" open={asks.some((row) => row.ask.status === "open")}>
      <summary className="cursor-pointer text-xs font-medium text-primary">
        {openCount > 0
          ? `${openCount} open ask${openCount === 1 ? "" : "s"}`
          : asks.length > 0
            ? `${asks.length} ask${asks.length === 1 ? "" : "s"} · all resolved`
            : "Ask about this"}
      </summary>
      <div className={compact ? "mt-2 space-y-2" : "mt-3 space-y-3"}>
        {asks.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No notes yet. Post a short question or a payout request — this is not chat.
          </p>
        ) : (
          <ol className="space-y-2">
            {asks.map(({ ask, author }) => (
              <li key={ask.id} className="rounded-md border border-border bg-card px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-navy">{author.name}</span>
                    {" · "}
                    {ask.kind === "payout" ? "payout request" : "question"}
                    {" · "}
                    {ask.createdAt.toISOString().slice(0, 10)}
                    {" · "}
                    <span className={ask.status === "open" ? "text-fit-yellow" : "text-fit-green"}>
                      {ask.status}
                    </span>
                  </div>
                  {ask.status === "open" && canResolveAsk(actor) ? (
                    <form action={resolveAsk}>
                      <input type="hidden" name="askId" value={ask.id} />
                      <Button type="submit" size="xs" variant="ghost">
                        Mark resolved
                      </Button>
                    </form>
                  ) : null}
                </div>
                <p className="mt-1 text-sm">{ask.body}</p>
              </li>
            ))}
          </ol>
        )}
        <form action={postAsk} className="space-y-2">
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="entityId" value={entityId} />
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="inline-flex items-center gap-1">
              <input type="radio" name="kind" value="question" defaultChecked />
              What about this?
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="radio" name="kind" value="payout" />
              Request payout
            </label>
          </div>
          <Textarea
            name="body"
            required
            rows={2}
            placeholder="Short note on this record…"
            className="min-h-16 text-sm"
          />
          <Button type="submit" size="sm" variant="secondary">
            Post ask
          </Button>
        </form>
      </div>
    </details>
  );
}
