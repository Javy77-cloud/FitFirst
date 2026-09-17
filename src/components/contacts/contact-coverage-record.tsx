"use client";

import { useMemo, useState, useTransition } from "react";
import { updateContactCoverageRecord } from "@/app/actions/contacts-ops";
import {
  applyCoverageLineChoice,
  applyInForceCarrierLock,
  CONTACT_COVERAGE_MATRIX_LINES,
  coverageChoiceForLine,
  declaredCoverageFromFields,
  parseCoverageCarrierMap,
  parseExistingCoverageTypes,
  serializeCoverageCarrierMap,
  serializeExistingCoverageTypes,
} from "@/lib/coverage/declared-coverage";
import { gapLineLabel, type CoverageLine } from "@/lib/coverage/gaps";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

const CHOICES = [
  { id: "us", label: "With us" },
  { id: "other", label: "Another carrier" },
  { id: "none", label: "Not covered" },
] as const;

type Choice = (typeof CHOICES)[number]["id"];

export function ContactCoverageRecord({
  existingTypes,
  carrierMapRaw,
  inForceLines = [],
  recordId,
  typesName = "field_existing_coverage_types",
  recordName = "field_coverage_carrier_of_record",
  form,
}: {
  existingTypes: string;
  carrierMapRaw: string;
  inForceLines?: CoverageLine[];
  recordId?: string;
  typesName?: string;
  recordName?: string;
  form?: string;
}) {
  const [types, setTypes] = useState(existingTypes);
  const [record, setRecord] = useState(carrierMapRaw);
  const [pending, startTransition] = useTransition();

  const declared = useMemo(
    () =>
      applyInForceCarrierLock(
        declaredCoverageFromFields({
          existingCoverageTypes: types,
          carrierOfRecord: record,
        }),
        inForceLines,
      ),
    [types, record, inForceLines],
  );

  const lines = useMemo(() => {
    const extra = declared
      .map((row) => row.line)
      .filter((line) => !CONTACT_COVERAGE_MATRIX_LINES.includes(line) && line !== "OTHER");
    return [...CONTACT_COVERAGE_MATRIX_LINES, ...extra];
  }, [declared]);

  function persist(nextTypes: string, nextRecord: string) {
    setTypes(nextTypes);
    setRecord(nextRecord);
    if (!recordId) return;
    startTransition(async () => {
      const result = await updateContactCoverageRecord({
        contactId: recordId,
        existingCoverageTypes: nextTypes,
        carrierOfRecord: nextRecord,
      });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        setTypes(existingTypes);
        setRecord(carrierMapRaw);
        return;
      }
      flashAction("Saved");
    });
  }

  function onChoose(line: CoverageLine, choice: Choice) {
    if (inForceLines.includes(line) && choice !== "us") return;
    const next = applyCoverageLineChoice({
      line,
      choice,
      existingTypes: parseExistingCoverageTypes(types),
      carrierMap: parseCoverageCarrierMap(record),
    });
    persist(serializeExistingCoverageTypes(next.existingTypes), serializeCoverageCarrierMap(next.carrierMap));
  }

  return (
    <div
      className={cn("min-w-0 space-y-1.5", pending && "opacity-60")}
      data-ff-contact-coverage-record=""
    >
      <input type="hidden" name={typesName} value={types} form={form} />
      <input type="hidden" name={recordName} value={record} form={form} />
      <p className="text-[11px] text-muted-foreground">
        Mark each line the household has. In-force policies stay <span className="font-medium">with us</span>.
        Another carrier counts as covered — not a missing-line gap.
      </p>
      <ul className="overflow-hidden rounded-md border border-border" data-ff-coverage-record-list="">
        {lines.map((line) => {
          const choice = coverageChoiceForLine({ line, declared, inForceLines });
          const locked = inForceLines.includes(line);
          return (
            <li
              key={line}
              className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-stretch border-b border-border last:border-b-0"
              data-ff-coverage-record-line={line}
            >
              <div className="flex items-center border-r border-border bg-[var(--ff-wash)] px-2 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {gapLineLabel(line)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1 px-1.5 py-1">
                {CHOICES.map((option) => {
                  const selected = choice === option.id;
                  const disabled = locked && option.id !== "us";
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      onClick={() => onChoose(line, option.id)}
                      className={cn(
                        "rounded-sm px-2 py-1 text-[11px] leading-none",
                        selected
                          ? "bg-[#002868] font-semibold text-white"
                          : "bg-transparent text-muted-foreground hover:bg-muted",
                        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                      )}
                      data-ff-coverage-record-choice={option.id}
                    >
                      {option.label}
                    </button>
                  );
                })}
                {locked ? (
                  <span className="text-[10px] text-muted-foreground">On the book</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
