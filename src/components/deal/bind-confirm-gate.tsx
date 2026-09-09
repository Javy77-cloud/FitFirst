"use client";

import { useState } from "react";
import { BindPath } from "@/components/deal/bind-path";
import { BIND_GATE_COPY, bindGateReady } from "@/lib/deals/bind-gate";
import type { BindPathTarget } from "@/lib/crm/bind-path";
import { formatMoney } from "@/lib/domain";

export function BindConfirmGate({
  dealId,
  defaultTarget,
  lineLabel,
  isAna,
  bound,
  party,
  policies,
  quote,
}: {
  dealId: string;
  defaultTarget: BindPathTarget;
  lineLabel: string;
  isAna: boolean;
  bound: boolean;
  party: { id: string; name: string; href: string; kind: "contact" | "account" } | null;
  policies: { id: string; policyNumber: string }[];
  quote: {
    carrierName: string;
    premium: string | number | null;
    coverageA: number | null;
    aopDeductible: string | null;
    hurricaneDeductible: string | null;
  } | null;
}) {
  const [checks, setChecks] = useState({ premium: false, coverages: false, deductibles: false });
  const ready = bindGateReady(checks);

  if (isAna || bound) {
    return (
      <BindPath
        dealId={dealId}
        defaultTarget={defaultTarget}
        lineLabel={lineLabel}
        isAna={isAna}
        bound={bound}
        party={party}
        policies={policies}
      />
    );
  }

  return (
    <section className="space-y-3" data-ff-bind-gate>
      <div className="ff-card space-y-2 p-4">
        <h3 className="text-sm font-semibold text-navy">{BIND_GATE_COPY.title}</h3>
        <p className="text-sm leading-snug text-muted-foreground" data-ff-bind-gate-subtitle="">{BIND_GATE_COPY.subtitle}</p>
        {quote ? (
          <p className="text-helper text-muted-foreground">
            {quote.carrierName} · {formatMoney(quote.premium)} · Cov A {formatMoney(quote.coverageA)} ·
            AOP {quote.aopDeductible ?? "—"} · Hurricane {quote.hurricaneDeductible ?? "—"}
          </p>
        ) : (
          <p className="text-helper text-muted-foreground">
            No priced quote on this deal yet. Bind still needs the three re-checks.
          </p>
        )}
        {(
          [
            ["premium", BIND_GATE_COPY.premium],
            ["coverages", BIND_GATE_COPY.coverages],
            ["deductibles", BIND_GATE_COPY.deductibles],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={checks[key]}
              onChange={(event) => setChecks((current) => ({ ...current, [key]: event.target.checked }))}
              className="mt-0.5"
            />
            <span>{label}</span>
          </label>
        ))}
        {!ready ? <p className="text-xs text-fit-flag">{BIND_GATE_COPY.blocked}</p> : null}
      </div>
      {ready ? (
        <BindPath
          dealId={dealId}
          defaultTarget={defaultTarget}
          lineLabel={lineLabel}
          isAna={isAna}
          bound={bound}
          party={party}
          policies={policies}
        />
      ) : null}
    </section>
  );
}
