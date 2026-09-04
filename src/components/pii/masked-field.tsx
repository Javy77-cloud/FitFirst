"use client";

import { useState, useTransition } from "react";
import { revealPiiField, type PiiEntityType, type PiiFieldKey } from "@/app/actions/pii";
import { Button } from "@/components/ui/button";

export function MaskedPiiField({
  entityType,
  entityId,
  field,
  mask,
  canReveal,
  emptyLabel = "—",
}: {
  entityType: PiiEntityType;
  entityId: string;
  field: PiiFieldKey;
  mask: string | null;
  canReveal: boolean;
  emptyLabel?: string;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!mask) return <span>{emptyLabel}</span>;

  function onReveal() {
    setError(null);
    start(async () => {
      const result = await revealPiiField({ entityType, entityId, field });
      if (result.ok) {
        setRevealed(result.value);
        return;
      }
      setError(result.error);
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono text-sm text-navy">{revealed ?? mask}</span>
      {canReveal ? (
        revealed ? (
          <Button type="button" size="xs" variant="ghost" onClick={() => setRevealed(null)}>
            Hide
          </Button>
        ) : (
          <Button type="button" size="xs" variant="outline" onClick={onReveal} disabled={pending}>
            {pending ? "Revealing…" : "Reveal"}
          </Button>
        )
      ) : null}
      {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
    </span>
  );
}
