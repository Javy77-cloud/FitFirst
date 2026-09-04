import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { listOpenMergeCandidates } from "@/lib/db/queries";
import { MATCH_REASON_LABELS, type MatchReason } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, leads } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { scanForDuplicates } from "@/app/actions/merge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function namesFor(entityType: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  if (entityType === "lead") {
    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));
  }
  const rows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
  return new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));
}

export default async function MergeQueuePage() {
  const candidates = await listOpenMergeCandidates();
  const contactIds = candidates.filter((c) => c.entityType === "contact").flatMap((c) => [c.leftId, c.rightId]);
  const leadIds = candidates.filter((c) => c.entityType === "lead").flatMap((c) => [c.leftId, c.rightId]);
  const [contactNames, leadNames] = await Promise.all([
    namesFor("contact", contactIds),
    namesFor("lead", leadIds),
  ]);

  return (
    <AppShell
      title="Merge"
      actions={
        <form action={scanForDuplicates}>
          <Button type="submit" variant="outline" size="sm">
            Rescan book
          </Button>
        </form>
      }
    >
      <p className="mb-4 max-w-3xl text-base text-muted-foreground">
        Likely duplicates — same person, two records. Matches are rule-based: same email, same
        phone, same name plus date of birth, or same name plus address. Review the pair, keep one
        record, copy blanks onto it, and retire the other. Nothing is hard-deleted. Ana Dib is
        locked and will not appear here.
      </p>

      <section className="ff-card overflow-hidden">
        {candidates.length === 0 ? (
          <div className="px-5 py-10 text-base text-muted-foreground">
            <p className="font-medium text-navy">No open matches.</p>
            <p className="mt-1">
              Seed includes Rosa Keene as an obvious email pair. If you already merged her, rescan
              after adding another duplicate.
            </p>
          </div>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="merge" col="pair" as="th">Pair</Col>
                <Col table="merge" col="type" as="th">Type</Col>
                <Col table="merge" col="reason" as="th">Why they match</Col>
                <Col table="merge" col="action" as="th">Review</Col>
              </tr>
            </thead>
            <SheetTbody>
              {candidates.map((row) => {
                const names = row.entityType === "lead" ? leadNames : contactNames;
                const left = names.get(row.leftId) ?? "Record";
                const right = names.get(row.rightId) ?? "Record";
                const reasons = (row.matchReasons ?? []).map(
                  (r) => MATCH_REASON_LABELS[r as MatchReason] ?? r,
                );
                return (
                  <tr key={row.id}>
                    <Col table="merge" col="pair" className="font-medium" sortValue={`${left} ${right}`}>
                      {left}
                      <span className="mx-1.5 text-muted-foreground">·</span>
                      {right}
                    </Col>
                    <Col table="merge" col="type" className="capitalize">
                      {row.entityType}
                    </Col>
                    <Col table="merge" col="reason" sortValue={reasons.join(", ")}>
                      <div className="flex flex-wrap gap-1">
                        {reasons.map((reason) => (
                          <Badge key={reason} variant="secondary">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </Col>
                    <Col table="merge" col="action" className="text-right">
                      <Link
                        href={`/merge/${row.id}`}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        Review
                      </Link>
                    </Col>
                  </tr>
                );
              })}
            </SheetTbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
