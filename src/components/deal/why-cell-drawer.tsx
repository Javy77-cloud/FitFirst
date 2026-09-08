"use client";

import { useEffect, useState, useTransition } from "react";
import { getWhyCellAuditAction } from "@/app/actions/synonym-candidates";
import { MarkMappingWrong } from "@/components/deal/mark-mapping-wrong";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type WhyAudit = Awaited<ReturnType<typeof getWhyCellAuditAction>>;

export function WhyCellDrawer({
  dealId,
  line,
  fieldKey,
  fieldLabel,
  extractedValue,
  open,
  onOpenChange,
}: {
  dealId: string;
  line: string;
  fieldKey: string;
  fieldLabel: string;
  extractedValue: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [audit, setAudit] = useState<WhyAudit | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    start(async () => {
      const next = await getWhyCellAuditAction(dealId, fieldKey);
      setAudit(next);
    });
  }, [open, dealId, fieldKey]);

  const match = audit?.latestMatch;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" data-ff-why-cell-drawer="">
        <SheetHeader>
          <SheetTitle>Why this cell?</SheetTitle>
          <SheetDescription>
            Fill audit for {fieldLabel}. Dictionary synonyms stay in code — candidates never edit
            synonyms.ts at runtime.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6 text-sm">
          {pending && !audit ? <p className="text-muted-foreground">Loading audit…</p> : null}
          {match ? (
            <section className="space-y-1 rounded-md border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy">Match</p>
              <p>
                Path: <span className="font-medium">{match.matchPath}</span>
              </p>
              {match.matchedSynonym ? (
                <p>
                  Synonym: <span className="font-medium">{match.matchedSynonym}</span>
                </p>
              ) : null}
              {match.sourceLine ? (
                <p className="text-muted-foreground">
                  Line {match.sourceLineNo ?? "—"}: {match.sourceLine}
                </p>
              ) : null}
              <p>
                Raw → normalized:{" "}
                <span className="font-mono text-xs">
                  {match.rawValue || "∅"} → {match.normalizedValue || "∅"}
                </span>
              </p>
              {match.missReason ? <p className="text-fit-yellow">Miss: {match.missReason}</p> : null}
              <p className="text-xs text-muted-foreground">
                {match.engine} · {match.docType} ·{" "}
                {match.appliedToSheet ? "applied to sheet" : "logged only"}
              </p>
            </section>
          ) : (
            <p className="text-muted-foreground">No extraction field attempt logged yet for this key.</p>
          )}

          {(!match?.matchedSynonym || match.blankAfterMatch) && (audit?.triedSynonyms.length ?? 0) > 0 ? (
            <section className="space-y-1 rounded-md border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy">Tried synonyms</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {audit?.triedSynonyms.map((syn) => (
                  <li key={syn}>{syn}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {audit?.lastCorrection ? (
            <section className="space-y-1 rounded-md border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy">Last correction</p>
              <p>
                {audit.lastCorrection.extractedValue} → {audit.lastCorrection.correctedValue}
              </p>
              <p className="text-xs text-muted-foreground">
                {audit.lastCorrection.reason} · {audit.lastCorrection.correctedBy}
                {audit.lastCorrection.locked ? " · locked" : ""}
              </p>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <MarkMappingWrong
              dealId={dealId}
              line={line}
              fieldKey={fieldKey}
              fieldLabel={fieldLabel}
              extractedValue={extractedValue}
            />
            <Button type="button" size="xs" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
