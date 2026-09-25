"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmQuoteSheetField, saveQuoteSheet } from "@/app/actions/quote-sheet";
import { DecodeVinButton } from "@/components/deal/decode-vin-button";
import {
  RiskProfileFieldShell,
  RiskProfileFieldsGrid,
} from "@/components/deal/risk-profile-field-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import type { QuoteFieldDef } from "@/lib/quote-sheet/applicant-core";
import {
  canAddAnother,
  canRemoveUnit,
  fieldsForUnit,
  repeatableRemovalWrites,
  repeatableUnitSignature,
  shownRepeatableCount,
  unitHasValue,
  visibleUnitCount,
  type RepeatableKind,
} from "@/lib/quote-sheet/repeatable-units";
import {
  occupationIndustryParentKey,
  occupationsForIndustry,
} from "@/lib/custom-fields/industry-occupation";
import {
  RiskProfileSectionBar,
  useRiskProfileSectionDensity,
} from "@/components/deal/risk-profile-section-header";
import { riskProfileSectionMaxColumns } from "@/lib/quote-sheet/risk-profile-layout";
import type { ShopLine } from "@/lib/domain";
import { valueToPaint } from "@/lib/vin-decode/paint";
import { cn } from "@/lib/utils";

type FieldOverlay = { value: string; previous: string };

type UnitLayout = {
  count: number;
  overlays: Record<string, FieldOverlay>;
  layoutRev: number;
  revFrom: number;
};

export function RepeatableUnitBlocks({
  kind,
  product,
  values,
  extractedByKey,
  dealId,
  line,
}: {
  kind: RepeatableKind;
  product?: string | null;
  values: Record<string, QuoteSheetFieldValue>;
  extractedByKey: Map<string, ExtractedFieldRow>;
  dealId?: string;
  line?: ShopLine;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const [units, setUnits] = useState<UnitLayout>(() => ({
    count: visibleUnitCount(values, kind, product),
    overlays: {},
    layoutRev: 0,
    revFrom: Number.POSITIVE_INFINITY,
  }));
  const [liveByKey, setLiveByKey] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [key, cell] of Object.entries(values)) {
      if (cell?.value) next[key] = cell.value;
    }
    return next;
  });
  const [pending, setPending] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const signature = repeatableUnitSignature(values, kind, product);
  const [appliedSignature, setAppliedSignature] = useState(signature);
  const serverChanged = appliedSignature !== signature;
  if (serverChanged) {
    setAppliedSignature(signature);
    setUnits((current) => ({
      ...current,
      count: visibleUnitCount(values, kind, product),
      overlays: {},
      layoutRev: current.layoutRev + 1,
      revFrom: 1,
    }));
  }
  const groupTitle =
    kind === "vehicle" ? "Vehicles" : kind === "household" ? "Household" : "Drivers";
  const title =
    kind === "vehicle" ? "Vehicle" : kind === "household" ? "Household member" : "Driver";
  const addLabel =
    kind === "vehicle"
      ? "+ Add vehicle"
      : kind === "household"
        ? "+ Add household member"
        : "+ Add driver";
  const removeLabel =
    kind === "vehicle"
      ? "- Remove vehicle"
      : kind === "household"
        ? "- Remove household member"
        : "- Remove driver";
  const keepOneHint =
    kind === "vehicle"
      ? "At least one vehicle stays on the profile."
      : kind === "household"
        ? "At least one household member stays on the profile."
        : "At least one driver stays on the profile.";
  const removeTestId =
    kind === "vehicle"
      ? "deal-remove-vehicle"
      : kind === "household"
        ? "deal-remove-household"
        : "deal-remove-driver";
  const sampleFields = fieldsForUnit(kind, 1).map((field) => unitFieldAsQuote(field, groupTitle));
  const maxColumns = riskProfileSectionMaxColumns(groupTitle, sampleFields);
  const { sectionId, density, setDensity, choices } = useRiskProfileSectionDensity(
    groupTitle,
    maxColumns,
  );
  const pruned = serverChanged ? {} : pruneOverlays(units.overlays, values);
  const serverCount = visibleUnitCount(withOverlays(values, pruned), kind, product);
  const shownCount = shownRepeatableCount(units.count, serverCount, serverChanged);
  const canRemove = canRemoveUnit(shownCount);
  const renderedKeys = new Set<string>();
  for (let index = 1; index <= shownCount; index += 1) {
    for (const field of fieldsForUnit(kind, index)) renderedKeys.add(field.key);
  }
  const hiddenBlanks = Object.entries(pruned).filter(
    ([key, overlay]) => !overlay.value.trim() && !renderedKeys.has(key),
  );

  async function removeAt(removeIndex: number) {
    if (pendingRef.current) return;
    const total = shownCount;
    if (!canRemoveUnit(total) || removeIndex < 1 || removeIndex > total) return;
    setRemoveError(null);
    const formNode = rootRef.current?.closest("form");
    const form = formNode instanceof HTMLFormElement ? formNode : null;
    const snapshots: Array<Record<string, string> | undefined> = [];
    for (let index = 1; index <= total; index += 1) {
      const snap: Record<string, string> = {};
      for (const field of fieldsForUnit(kind, index)) {
        const fallback = pruned[field.key]?.value ?? values[field.key]?.value ?? "";
        snap[field.suffix] = readControlValue(form, field.key, fallback);
      }
      snapshots[index] = snap;
    }
    const writes = repeatableRemovalWrites(kind, total, removeIndex, snapshots);
    if (!writes) return;
    const previousValues = values;
    let needsPersist = false;
    for (let index = removeIndex; index <= total; index += 1) {
      if (unitHasValue(previousValues, kind, index)) needsPersist = true;
    }
    pendingRef.current = true;
    setPending(true);
    try {
      if (needsPersist) {
        if (!form) throw new Error("Risk Profile form is missing.");
        const data = new FormData(form);
        for (const [key, value] of Object.entries(writes)) data.set(key, value);
        data.set("flash", "0");
        await saveQuoteSheet(data);
      }
      setUnits((current) => {
        const base = pruneOverlays(current.overlays, previousValues);
        const overlays = { ...base };
        for (const [key, value] of Object.entries(writes)) {
          overlays[key] = { value, previous: previousValues[key]?.value ?? "" };
        }
        return {
          count: Math.max(1, Math.max(current.count, total) - 1),
          overlays,
          layoutRev: current.layoutRev + 1,
          revFrom: removeIndex,
        };
      });
      setLiveByKey((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(writes)) {
          if (value.trim()) next[key] = value;
          else delete next[key];
        }
        return next;
      });
      if (needsPersist) router.refresh();
    } catch (error) {
      if (isNextRedirect(error)) throw error;
      setRemoveError("Couldn't remove that entry. Try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className="border-b border-border/70 last:border-b-0"
      data-ff-repeatable-units={kind}
    >
      <RiskProfileSectionBar
        title={groupTitle}
        sectionId={sectionId}
        density={density}
        onDensityChange={setDensity}
        choices={choices}
      />
      {Array.from({ length: shownCount }, (_, offset) => {
        const index = offset + 1;
        const unitFields = fieldsForUnit(kind, index);
        const resetToken = index >= units.revFrom ? units.layoutRev : 0;
        return (
          <div key={`${kind}-${index}`} className="border-t border-border/60 first:border-t-0" data-ff-unit-block={`${kind}-${index}`}>
            <div className="flex items-center justify-between gap-2 px-3 py-1.5">
              <p className="text-xs font-semibold text-navy">
                {title} {index}
              </p>
              {canRemove ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
                  disabled={pending}
                  data-ff-remove-unit={`${kind}-${index}`}
                  aria-label={`Remove ${title.toLowerCase()} ${index}`}
                  onClick={() => void removeAt(index)}
                >
                  {pending ? <ProcessingLabel>Remove</ProcessingLabel> : "Remove"}
                </button>
              ) : null}
            </div>
            <RiskProfileFieldsGrid
              density={density}
              fields={unitFields.map((field) => unitFieldAsQuote(field, groupTitle))}
              renderField={(field) => {
                const unit = unitFields.find((item) => item.key === field.key);
                const extracted = extractedByKey.get(field.key);
                const cell = displayCell(field.key, values, pruned);
                const sourceText = extracted?.normalizedValue || extracted?.rawValue || "";
                const industryParent = occupationIndustryParentKey(field.key);
                const industryValue =
                  industryParent && industryParent in pruned
                    ? pruned[industryParent]?.value
                    : (liveByKey[industryParent ?? ""] ?? values[industryParent ?? ""]?.value);
                const options = industryParent
                  ? occupationsForIndustry(industryValue)
                  : field.options;
                return (
                  <RiskProfileFieldShell
                    fieldKey={field.key}
                    label={field.label}
                    field={field}
                    cascadeKey={industryParent ?? undefined}
                    footer={
                      sourceText ? (
                        <p className="text-[9px] leading-none text-muted-foreground" data-ff-sheet-source={field.key}>
                          {sourceText}
                        </p>
                      ) : null
                    }
                  >
                    <BlockCell
                      key={`${field.key}:${resetToken}`}
                      fieldKey={field.key}
                      fieldSuffix={unit?.suffix}
                      input={field.input === "select" || field.input === "number" ? field.input : "text"}
                      options={options}
                      cell={cell}
                      dealId={dealId}
                      line={line}
                      kind={kind}
                      onLiveChange={(next) =>
                        setLiveByKey((prev) => ({ ...prev, [field.key]: next }))
                      }
                    />
                  </RiskProfileFieldShell>
                );
              }}
            />
          </div>
        );
      })}
      <div className="flex flex-wrap items-center">
        {canAddAnother(shownCount, product, kind) ? (
          <button
            type="button"
            className="px-3 py-2 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
            disabled={pending}
            data-testid={
              kind === "vehicle"
                ? "deal-add-vehicle"
                : kind === "household"
                  ? "deal-add-household"
                  : "deal-add-driver"
            }
            onClick={() => {
              if (pendingRef.current) return;
              setUnits((current) => ({
                ...current,
                count: Math.max(current.count, shownCount) + 1,
              }));
            }}
          >
            {addLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="px-3 py-2 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          disabled={!canRemove || pending}
          data-testid={removeTestId}
          data-ff-remove-unit-last={kind}
          onClick={() => void removeAt(shownCount)}
        >
          {pending ? <ProcessingLabel>Removing…</ProcessingLabel> : removeLabel}
        </button>
        {canRemove ? null : (
          <span className="sr-only" data-ff-remove-blocked={kind}>
            {keepOneHint}
          </span>
        )}
      </div>
      {removeError ? (
        <p className="px-3 pb-2 text-xs text-destructive" role="alert">
          {removeError}
        </p>
      ) : null}
      {hiddenBlanks.map(([key]) => (
        <input key={key} type="hidden" name={key} defaultValue="" data-ff-cleared-unit-field={key} />
      ))}
    </div>
  );
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function displayCell(
  key: string,
  values: Record<string, QuoteSheetFieldValue>,
  overlays: Record<string, FieldOverlay>,
): QuoteSheetFieldValue | undefined {
  const overlay = overlays[key];
  if (!overlay) return values[key];
  if (!overlay.value.trim()) return { value: "", status: "missing", source: "blank" };
  return { value: overlay.value, status: "confirmed", source: "agent" };
}

function withOverlays(
  values: Record<string, QuoteSheetFieldValue | undefined>,
  overlays: Record<string, FieldOverlay>,
): Record<string, QuoteSheetFieldValue | undefined> {
  if (Object.keys(overlays).length === 0) return values;
  const next: Record<string, QuoteSheetFieldValue | undefined> = { ...values };
  for (const [key, overlay] of Object.entries(overlays)) {
    next[key] = overlay.value.trim()
      ? { value: overlay.value, status: "confirmed", source: "agent" }
      : { value: "", status: "missing", source: "blank" };
  }
  return next;
}

function pruneOverlays(
  overlays: Record<string, FieldOverlay>,
  values: Record<string, QuoteSheetFieldValue | undefined>,
): Record<string, FieldOverlay> {
  let changed = false;
  const next: Record<string, FieldOverlay> = {};
  for (const [key, overlay] of Object.entries(overlays)) {
    const server = values[key]?.value.trim() ?? "";
    const forced = overlay.value.trim();
    const previous = overlay.previous.trim();
    const caughtUp = server === forced;
    const serverMoved = server !== previous && server !== forced;
    if (caughtUp || serverMoved) {
      changed = true;
      continue;
    }
    next[key] = overlay;
  }
  return changed ? next : overlays;
}

function readControlValue(form: HTMLFormElement | null, key: string, fallback: string): string {
  if (!form) return fallback;
  const el = form.elements.namedItem(key);
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  ) {
    return el.value;
  }
  if (typeof RadioNodeList !== "undefined" && el instanceof RadioNodeList) {
    return el.item(0)?.value ?? fallback;
  }
  return fallback;
}

function unitFieldAsQuote(
  field: ReturnType<typeof fieldsForUnit>[number],
  group: string,
): QuoteFieldDef {
  return {
    key: field.key,
    label: field.label,
    group,
    input: field.input === "select" || field.input === "number" ? field.input : "text",
    options: field.options ? [...field.options] : undefined,
  };
}

function BlockCell({
  fieldKey,
  fieldSuffix,
  input = "text",
  options,
  cell,
  dealId,
  line,
  kind,
  onLiveChange,
}: {
  fieldKey: string;
  fieldSuffix?: string;
  input?: "text" | "number" | "select";
  options?: readonly string[];
  cell?: QuoteSheetFieldValue;
  dealId?: string;
  line?: ShopLine;
  kind?: RepeatableKind;
  onLiveChange?: (next: string) => void;
}) {
  const fieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const serverValue = cell?.value ?? "";
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const next = valueToPaint(el.value, serverValue);
    if (next != null) el.value = next;
  }, [serverValue, cell?.sourceLabel]);
  function bindField(el: HTMLInputElement | HTMLSelectElement | null) {
    fieldRef.current = el;
  }
  const className = cn(
    "h-8 w-full min-w-0 text-sm",
    cell?.status === "check" && "ff-field-check",
    (!cell?.value.trim() || cell.status === "missing") && "ff-field-missing",
  );
  return (
    <div className="flex flex-col gap-1">
      {input === "select" && options?.length ? (
        <select
          ref={bindField}
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          defaultValue={cell?.value ?? ""}
          className={cn(className, "w-full rounded-md border border-input bg-background px-2")}
          onChange={(event) => onLiveChange?.(event.target.value)}
        >
          <option value="">None</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <Input
          ref={bindField}
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          type={input === "number" ? "number" : "text"}
          defaultValue={cell?.value ?? ""}
          className={className}
        />
      )}
      {cell?.status === "check" ? (
        <Button
          type="submit"
          formAction={async (formData) => {
            formData.set("fieldKey", fieldKey);
            await confirmQuoteSheetField(formData);
          }}
          variant="ghost"
          size="xs"
        >
          Confirm extracted
        </Button>
      ) : null}
      {kind === "vehicle" && fieldSuffix === "vin" && dealId && line === "auto" ? (
        <DecodeVinButton dealId={dealId} line={line} />
      ) : null}
    </div>
  );
}
