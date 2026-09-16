"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMintedPolicyField, publishMintedPolicy } from "@/app/actions/policy-mint";
import { Button } from "@/components/ui/button";
import type { MintField } from "@/lib/policy/mint-gate";
import { mintConfirmQueue } from "@/lib/policy/mint-gate";
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
  const [value, setValue] = useState(queue[0]?.value ?? "");
  const [pending, startTransition] = useTransition();
  const current = queue[index] ?? queue[0];
  const done = queue.length === 0;

  function show(nextIndex: number, nextFields = queue) {
    const row = nextFields[nextIndex] ?? nextFields[0];
    setIndex(Math.min(nextIndex, Math.max(0, nextFields.length - 1)));
    setValue(row?.value ?? "");
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
    ? `Dec ${current.geminiValue} · sold quote ${current.soldValue}`
    : current.sheetValue && current.geminiValue && current.sheetValue !== current.geminiValue
      ? `Dec ${current.geminiValue} · sheet ${current.sheetValue}`
      : current.confidence > 0 && current.confidence < 0.8
        ? `Gemini ${Math.round(current.confidence * 100)}% — check this one`
        : "Confirm or correct before the policy is published";

  return (
    <section className="ff-card mx-auto max-w-lg space-y-4 p-5" data-ff-mint-confirm-queue="">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-navy">Confirm from declaration</h2>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {index + 1} of {queue.length}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {current.label}
        </span>
        {current.flagged ? (
          <span
            className="ml-2 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
            data-ff-mint-field-flagged={current.key}
          >
            Flagged
          </span>
        ) : null}
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-navy ${
            current.flagged ? "border-amber-500 ring-2 ring-amber-200" : "border-input"
          }`}
          data-ff-mint-confirm-input={current.key}
          data-ff-mint-flagged={current.flagged ? "1" : "0"}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          data-ff-mint-confirm-keep=""
          onClick={() => confirm(value || current.value)}
        >
          Looks right
        </Button>
        {current.soldValue && current.soldValue !== value ? (
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
        {current.geminiValue && current.geminiValue !== value ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setValue(current.geminiValue ?? "");
              confirm(current.geminiValue ?? "");
            }}
          >
            Use dec
          </Button>
        ) : null}
      </div>
    </section>
  );
}
