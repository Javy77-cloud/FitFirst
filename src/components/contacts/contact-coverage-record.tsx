"use client";

import { useMemo, useState, useTransition } from "react";
import { updateContactCoverageRecord } from "@/app/actions/contacts-ops";
import { CONTACT_EXTERNAL_COVERAGE_LABEL } from "@/lib/contacts/contact-field-catalog";
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
  { id: "us", label: "With us", short: "Us" },
  { id: "other", label: "Another carrier", short: "Other" },
  { id: "none", label: "Not covered", short: "None" },
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
  onChange,
}: {
  existingTypes: string;
  carrierMapRaw: string;
  inForceLines?: CoverageLine[];
  recordId?: string;
  typesName?: string;
  recordName?: string;
  form?: string;
  onChange?: (next: { existingTypes: string; carrierMapRaw: string }) => void;
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
    onChange?.({ existingTypes: nextTypes, carrierMapRaw: nextRecord });
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
        onChange?.({ existingTypes, carrierMapRaw });
        return;
      }
      flashAction("Saved");
    });
  }

  function onChoose(line: CoverageLine, choice: Choice) {
    if (choice === "us") return;
    if (inForceLines.includes(line)) return;
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
      className={cn("min-w-0 space-y-1", pending && "opacity-60")}
      data-ff-contact-coverage-record=""
      data-ff-coverage-record-compact="1"
    >
      <input type="hidden" name={typesName} value={types} form={form} />
      <input type="hidden" name={recordName} value={record} form={form} />
      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        {CONTACT_EXTERNAL_COVERAGE_LABEL}
      </p>

      <ul
        className="grid grid-cols-2 gap-1.5 max-[520px]:grid-cols-1"
        data-ff-coverage-record-list=""
      >
        {lines.map((line) => {
          const choice = coverageChoiceForLine({ line, declared, inForceLines });
          const locked = inForceLines.includes(line);
          return (
            <li
              key={line}
              className="min-w-0 rounded-md border border-border bg-[var(--ff-card)] px-1.5 py-1"
              data-ff-coverage-record-line={line}
            >
              <div className="mb-0.5 flex min-w-0 items-center justify-between gap-1">
                <span className="truncate text-[10px] font-medium uppercase leading-tight tracking-[0.04em] text-muted-foreground">
                  {gapLineLabel(line)}
                </span>
                {locked ? (
                  <span className="shrink-0 text-[10px] text-muted-foreground">On the book</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-0.5" role="group" aria-label={gapLineLabel(line)}>
                {CHOICES.map((option) => {
                  const selected = choice === option.id;
                  const disabled = option.id === "us" || locked;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      aria-label={option.label}
                      title={option.label}
                      onClick={() => onChoose(line, option.id)}
                      className={cn(
                        "rounded-sm px-1.5 py-0.5 text-[10px] leading-none",
                        selected
                          ? "bg-[#002868] font-semibold text-white"
                          : "bg-transparent text-muted-foreground hover:bg-muted",
                        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                      )}
                      data-ff-coverage-record-choice={option.id}
                    >
                      {option.short}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
