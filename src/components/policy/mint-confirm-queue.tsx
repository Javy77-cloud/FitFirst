"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMintedPolicyField, publishMintedPolicy } from "@/app/actions/policy-mint";
import { Button } from "@/components/ui/button";
import { RereadDeclarationButton } from "@/components/policy/reread-declaration-button";
import type { MintField } from "@/lib/policy/mint-gate";
import { mintConfirmQueue, mintProposedValue } from "@/lib/policy/mint-gate";
import { flashAction } from "@/lib/flash-client";

export function MintConfirmQueue({
  policyId,
  fields,
}: {
  policyId: string;
  fields: MintField[];
}) {
  const router = useRouter();
  const queue = useMemo(() => mintConfirmQueue(fields), [fields]);
  const [index, setIndex] = useState(0);
  const current = queue[index] ?? queue[0];
  const proposed = current ? mintProposedValue(current) : "";
  const [value, setValue] = useState(proposed);
  const [editing, setEditing] = useState(!proposed);
  const [pending, startTransition] = useTransition();
  const done = queue.length === 0;
  const revision = fields
    .map((row) => `${row.key}:${row.value}:${row.confirmed}:${row.geminiValue ?? ""}`)
    .join("|");

  useEffect(() => {
    const next = mintConfirmQueue(fields);
    const row = next[0];
    const nextProposed = row ? mintProposedValue(row) : "";
    setIndex(0);
    setValue(nextProposed);
    setEditing(!nextProposed);
  }, [revision, fields]);

  function show(nextIndex: number, nextFields = queue) {
    const row = nextFields[nextIndex] ?? nextFields[0];
    const nextProposed = row ? mintProposedValue(row) : "";
    setIndex(Math.min(nextIndex, Math.max(0, nextFields.length - 1)));
    setValue(nextProposed);
    setEditing(!nextProposed);
  }

  function confirm(nextValue: string) {
    if (!current) return;
    const data = new FormData();
    data.set("policyId", policyId);
    data.set("key", current.key);
    data.set("value", nextValue);
    startTransition(async () => {
      const result = await confirmMintedPolicyField(data);
      if (!result.ok) return;
      if (result.remaining === 0) {
        const publish = new FormData();
        publish.set("policyId", policyId);
        const published = await publishMintedPolicy(publish);
        if (published.ok) {
          flashAction("policy-published");
          router.refresh();
        }
        return;
      }
      const remaining = queue.filter((row) => row.key !== current.key);
      show(0, remaining);
      router.refresh();
    });
  }

  if (done) {
    return (
      <section className="ff-card mx-auto max-w-lg space-y-3 p-5" data-ff-mint-confirm-empty="">
        <h2 className="text-lg font-semibold text-navy">Declaration looks right</h2>
        <p className="text-sm text-muted-foreground">Every flagged field is confirmed. Publish to open the book record.</p>
        <RereadDeclarationButton policyId={policyId} />
        <Button
          type="button"
          data-ff-publish-minted-policy=""
          disabled={pending}
          onClick={() => {
            const data = new FormData();
            data.set("policyId", policyId);
            startTransition(async () => {
              const published = await publishMintedPolicy(data);
              if (published.ok) {
                flashAction("policy-published");
                router.refresh();
              }
            });
          }}
        >
          Publish policy
        </Button>
      </section>
    );
  }

  const hint = current.soldValue && current.geminiValue && current.soldValue !== current.geminiValue
    ? `Declaration ${current.geminiValue} wins over sold quote ${current.soldValue}`
    : current.sheetValue && current.geminiValue && current.sheetValue !== current.geminiValue
      ? `Declaration ${current.geminiValue} · deal ${current.sheetValue}`
      : current.confidence > 0 && current.confidence < 0.8
        ? `Gemini ${Math.round(current.confidence * 100)}% — check this one`
        : proposed
          ? "Proposed from the declaration or deal. Looks right accepts it."
          : "Nothing extracted — type the value from the dec.";

  return (
    <section className="ff-card mx-auto max-w-lg space-y-4 p-5" data-ff-mint-confirm-queue="">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-navy">Confirm from declaration</h2>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {index + 1} of {queue.length}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {current.label}
          </span>
          {current.flagged ? (
            <span
              className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
              data-ff-mint-field-flagged={current.key}
            >
              Flagged
            </span>
          ) : null}
        </div>
        {proposed ? (
          <p
            className="rounded-md border border-navy/15 bg-secondary/60 px-3 py-2 text-base font-semibold text-navy"
            data-ff-mint-proposed={current.key}
            data-ff-mint-proposed-value={proposed}
          >
            {proposed}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground" data-ff-mint-proposed-empty={current.key}>
            No proposed value from Gemini or the deal.
          </p>
        )}
        {editing || !proposed ? (
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={proposed ? undefined : "Type the value from the declaration"}
            className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-navy ${
              current.flagged ? "border-amber-500 ring-2 ring-amber-200" : "border-input"
            }`}
            data-ff-mint-confirm-input={current.key}
            data-ff-mint-flagged={current.flagged ? "1" : "0"}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || !(proposed || value.trim())}
          data-ff-mint-confirm-keep=""
          onClick={() => confirm(proposed || value)}
        >
          Looks right
        </Button>
        {proposed && !editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            data-ff-mint-confirm-edit=""
            onClick={() => {
              setValue(proposed);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        ) : null}
        {editing && value.trim() && value.trim() !== proposed ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => confirm(value)}
          >
            Save edit
          </Button>
        ) : null}
        <RereadDeclarationButton policyId={policyId} />
        {current.soldValue && current.soldValue !== proposed ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setValue(current.soldValue ?? "");
              confirm(current.soldValue ?? "");
            }}
          >
            Keep sold quote
          </Button>
        ) : null}
      </div>
    </section>
  );
}
