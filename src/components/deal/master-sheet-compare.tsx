"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { confirmQuoteSheetField, saveQuoteSheet } from "@/app/actions/quote-sheet";
import { MasterSheetFillButton } from "@/components/deal/master-sheet-fill-button";
import { MasterSheetAddressLinks } from "@/components/deal/master-sheet-address-links";
import { MilesToCoastButton } from "@/components/deal/miles-to-coast-button";
import { sourceTag } from "@/lib/quote-sheet/apply";
import {
  COVERAGE_A_RCE_LABEL,
  HOME_COVERAGE_DEFAULTS,
  liveValuesAfterManualCoverageA,
} from "@/lib/quote-sheet/home-coverage-rules";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import { ACTION_FLASH_MESSAGE, SHEET_CONFIRM_HASH } from "@/lib/desk/action-flash";
import { flashAction } from "@/lib/flash-client";
import { fillMasterSheetDocument } from "@/app/actions/quote-sheet";
import { isNhtsaTransportFailure } from "@/lib/vin-decode/client";
import {
  paintSheetInputs,
  readRiskProfileVins,
  recoverVinDecodeFromBrowser,
} from "@/lib/vin-decode/browser";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import { ApplicantHousehold } from "@/components/deal/applicant-household";
import { RepeatableUnitBlocks } from "@/components/deal/repeatable-unit-blocks";
import { fieldsForLine, groupFields, sheetFieldIsVisible, sheetGroupIsVisible } from "@/lib/quote-sheet/catalog";
import { RECORDS_CHECK_KEY, recordsCheckHiddenOnRiskProfile } from "@/lib/quote-sheet/records-check";
import { parseSheetProduct } from "@/lib/quote-sheet/products";
import { InsuredPropertyKindControl } from "@/components/deal/insured-property-kind-control";
import { RISK_PROFILE_LABEL, SAVE_RISK_PROFILE_LABEL } from "@/lib/quote-sheet/risk-profile-copy";
import { HealthSherpaHandoff } from "@/components/deal/healthsherpa-handoff";
import { HEALTHSHERPA_MANUAL_LINES_NOTE, HEALTHSHERPA_SKIP_REKEY } from "@/lib/healthsherpa/copy";
import {
  healthSherpaCollapsibleGroups,
  healthSherpaProductForPlan,
  isUsingHealthSherpa,
  USING_HEALTHSHERPA_KEY,
} from "@/lib/healthsherpa/sheet";
import type { QuoteFieldDef } from "@/lib/quote-sheet/applicant-core";
import { cascadeParentKeys, joinChipList, parseChipList } from "@/lib/quote-sheet/sheet-visibility";
import {
  occupationIndustryParentKey,
  occupationsForIndustry,
} from "@/lib/custom-fields/industry-occupation";
import type { ShopLine } from "@/lib/domain";
import { asList } from "@/lib/safe-list";
import { cn } from "@/lib/utils";
import { MultiSelectField } from "@/components/custom-fields/multi-select-field";
import {
  RiskProfileFieldShell,
  RiskProfileFieldsGrid,
} from "@/components/deal/risk-profile-field-grid";
import {
  RiskProfileSectionBar,
  useRiskProfileSectionDensity,
} from "@/components/deal/risk-profile-section-header";
import { riskProfileSectionMaxColumns } from "@/lib/quote-sheet/risk-profile-layout";
import {
  FOUR_POINT_FIELD_KEYS,
  FOUR_POINT_INSPECTION_KEY,
  FOUR_POINT_INSPECTION_LABEL,
  WIND_MIT_FIELD_KEYS,
  WIND_MIT_INSPECTION_KEY,
  WIND_MIT_INSPECTION_LABEL,
  inspectionCheckBlock,
  inspectionInHand,
  inspectionKindForSection,
  inspectionSectionDefaultOpen,
  type InspectionUploadIds,
} from "@/lib/quote-sheet/home-inspections";

function sheetValuesToLive(values: Record<string, QuoteSheetFieldValue>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, cell]) => [key, cell?.value ?? ""]),
  );
}

const HOME_LIVE_COVERAGE_KEYS = new Set<string>([
  "coverage_a",
  ...Object.keys(HOME_COVERAGE_DEFAULTS),
  "wind_hail_deductible",
]);

function applyHomeCoverageLiveChange(
  prev: Record<string, string>,
  key: string,
  next: string,
  stored: Record<string, QuoteSheetFieldValue>,
  product: string | null | undefined,
  commit: boolean,
): Record<string, string> {
  if (key !== "coverage_a") return { ...prev, [key]: next };
  return liveValuesAfterManualCoverageA(prev, next, stored, product, {
    reapply: commit,
  });
}

const MASTER_SHEET_FORM_ID = "ff-master-sheet-save";

/** Heather Save is the sheet Save — pull files from the sibling Upload form. */
function appendSourceDocUploads(data: FormData) {
  if (typeof document === "undefined") return;
  const upload = document.querySelector("[data-ff-source-docs-upload]");
  if (!(upload instanceof HTMLFormElement)) return;
  const extra = new FormData(upload);
  let files = 0;
  for (const [key, value] of extra.entries()) {
    if (typeof value === "string") {
      if (
        (key === "rowCount" || key === "riskId" || key.startsWith("docType")) &&
        !data.has(key)
      ) {
        data.set(key, value);
      }
      continue;
    }
    data.append(key, value);
    files += 1;
  }
  if (files > 0 && extra.get("rowCount") && !data.get("rowCount")) {
    data.set("rowCount", String(extra.get("rowCount")));
  }
}

export function MasterSheetWorkspace({
  dealId,
  line,
  fields,
  values,
  product,
  sourceDocCount = 0,
  formLabel,
  unlocked,
  approvedBy,
  hasCoApplicantFlag,
  needsReapprove = false,
  hasRequestedQuotes = false,
  productId,
  healthSherpa,
  insuredPropertyKind,
  inspectionUploads,
  quotingForm,
}: {
  dealId: string;
  line: ShopLine;
  fields: ExtractedFieldRow[];
  values: Record<string, QuoteSheetFieldValue>;
  product?: string | null;
  sourceDocCount?: number;
  formLabel: string;
  unlocked: boolean;
  approvedBy?: string | null;
  hasCoApplicantFlag?: string | null;
  needsReapprove?: boolean;
  hasRequestedQuotes?: boolean;
  productId?: string | null;
  insuredPropertyKind?: string | null;
  healthSherpa?: {
    medicareReady: boolean;
    acaReady: boolean;
  };
  inspectionUploads?: InspectionUploadIds;
  quotingForm?: string | null;
}) {
  const router = useRouter();

  async function persistSheet(opts?: { flash?: boolean }) {
    const el = document.getElementById(MASTER_SHEET_FORM_ID);
    if (!(el instanceof HTMLFormElement)) throw new Error("Risk Profile form is missing.");
    const data = new FormData(el);
    appendSourceDocUploads(data);
    // Stay on Confirm — a redirect remounts the deal page at the top.
    data.set("flash", "0");
    let saved: Awaited<ReturnType<typeof saveQuoteSheet>> | undefined;
    try {
      saved = await saveQuoteSheet(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save Risk Profile";
      if (line === "auto" && (isNhtsaTransportFailure(message) || /unexpected|failed to fetch|network/i.test(message))) {
        const recovered = await recoverVinDecodeFromBrowser({
          dealId,
          line,
          formVins: readRiskProfileVins(),
        });
        if (!recovered.ok) flashAction(recovered.error, "error");
        else if (opts?.flash !== false) flashAction(recovered.toast);
        router.refresh();
        return;
      }
      flashAction(message, "error");
      return;
    }
    const vinError = saved && "vinDecodeError" in saved ? saved.vinDecodeError : undefined;
    const vinFilled = saved && "vinFilled" in saved ? saved.vinFilled : [];
    if (vinFilled?.length) paintSheetInputs(vinFilled);
    if (vinError && line === "auto" && isNhtsaTransportFailure(vinError)) {
      const recovered = await recoverVinDecodeFromBrowser({
        dealId,
        line,
        formVins: readRiskProfileVins(),
      });
      if (!recovered.ok) flashAction(recovered.error, "error");
      else if (opts?.flash !== false) flashAction(recovered.toast);
    } else if (vinError) {
      flashAction(vinError, "error");
    } else if (opts?.flash !== false) {
      flashAction(ACTION_FLASH_MESSAGE["sheet-saved"]);
    }
    router.refresh();
    requestAnimationFrame(() => {
      document.getElementById(SHEET_CONFIRM_HASH)?.scrollIntoView({
        behavior: "auto",
        block: "center",
      });
    });
  }

  return (
    <>
      <MasterSheetCompare
        dealId={dealId}
        line={line}
        fields={fields}
        values={values}
        product={product}
        sourceDocCount={sourceDocCount}
        formId={MASTER_SHEET_FORM_ID}
        persistSheet={() => persistSheet()}
        hasCoApplicantFlag={hasCoApplicantFlag}
        healthSherpa={healthSherpa}
        insuredPropertyKind={insuredPropertyKind}
        inspectionUploads={inspectionUploads}
        quotingForm={quotingForm}
      />
      <SheetApproveGate
        dealId={dealId}
        line={line}
        product={productId}
        formLabel={formLabel}
        unlocked={unlocked}
        approvedBy={approvedBy}
        persistSheet={() => persistSheet({ flash: false })}
        needsReapprove={needsReapprove}
        hasRequestedQuotes={hasRequestedQuotes}
      />
    </>
  );
}

export function MasterSheetCompare({
  dealId,
  line,
  fields,
  values,
  product: productParam,
  sourceDocCount = 0,
  formId = MASTER_SHEET_FORM_ID,
  persistSheet,
  hasCoApplicantFlag,
  healthSherpa,
  insuredPropertyKind,
  inspectionUploads,
  quotingForm,
}: {
  dealId: string;
  line: ShopLine;
  fields: ExtractedFieldRow[];
  values: Record<string, QuoteSheetFieldValue>;
  product?: string | null;
  sourceDocCount?: number;
  formId?: string;
  persistSheet?: () => Promise<void>;
  hasCoApplicantFlag?: string | null;
  healthSherpa?: {
    medicareReady: boolean;
    acaReady: boolean;
  };
  insuredPropertyKind?: string | null;
  inspectionUploads?: InspectionUploadIds;
  quotingForm?: string | null;
}) {
  const router = useRouter();
  const product = parseSheetProduct(productParam ?? values.sheet_product?.value, line);
  const resolvedForm = quotingForm || values.quoting_form?.value || "";
  const catalog = asList(fieldsForLine(line, product, resolvedForm));
  const cascadeKeys = new Set(cascadeParentKeys(catalog));
  const [liveValues, setLiveValues] = useState(() => sheetValuesToLive(values));
  const groups = asList(groupFields(line, product, liveValues, resolvedForm));
  const usingHealthSherpa = line === "health" && isUsingHealthSherpa(liveValues[USING_HEALTHSHERPA_KEY]);
  const healthPlanType = liveValues.plan_type ?? values.plan_type?.value ?? "";
  const extractedByKey = new Map(asList(fields).map((field) => [field.fieldKey, field]));
  const filled = catalog.filter((field) => {
    if (recordsCheckHiddenOnRiskProfile(line) && field.key === RECORDS_CHECK_KEY) return false;
    const cell = values[field.key];
    return Boolean(cell?.value.trim() && cell.status !== "missing");
  }).length;

  function onSheetFormChange(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }
    const name = target.name;
    if (!name) return;
    const data = new FormData(event.currentTarget);
    const joined = data
      .getAll(name)
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join(", ");
    setLiveValues((prev) => ({ ...prev, [name]: joined }));
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (!(submitter instanceof HTMLElement) || submitter.getAttribute("data-ff-save-sheet") == null) {
      return;
    }
    event.preventDefault();
    if (persistSheet) {
      await persistSheet();
      return;
    }
    const data = new FormData(event.currentTarget);
    appendSourceDocUploads(data);
    await saveQuoteSheet(data);
  }

  return (
    <section className="ff-card overflow-hidden" data-ff-master-sheet-compare>
      <div className="border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-navy" data-ff-sheet-title="">
              {RISK_PROFILE_LABEL}
            </h3>
            <p className="text-helper text-muted-foreground">
              Empty before extraction. Type a value or confirm what the source pulled.
              {filled === 0 ? " Fields start blank." : ` ${filled} filled.`}
            </p>
            {line === "health" ? (
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-navy" data-ff-using-healthsherpa="">
                <input
                  type="checkbox"
                  checked={usingHealthSherpa}
                  onChange={(event) =>
                    setLiveValues((prev) => ({
                      ...prev,
                      [USING_HEALTHSHERPA_KEY]: event.target.checked ? "yes" : "no",
                    }))
                  }
                />
                Using HealthSherpa
              </label>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <MasterSheetAddressLinks values={values} />
            <MasterSheetFillButton dealId={dealId} line={line} />
            {line === "health" ? (
              <HealthSherpaHandoff
                dealId={dealId}
                planType={healthPlanType}
                usingHealthSherpa={usingHealthSherpa}
                medicareReady={Boolean(healthSherpa?.medicareReady)}
                acaReady={Boolean(healthSherpa?.acaReady)}
              />
            ) : null}
            <span className="sr-only" data-ff-master-source-docs={sourceDocCount} />
          </div>
        </div>
      </div>

      <form
        id={formId}
        action={async (formData) => {
          await saveQuoteSheet(formData);
        }}
        onSubmit={onSave}
        onChange={onSheetFormChange}
        className="space-y-0"
        data-ff-master-sheet-form=""
        data-ff-risk-profile-form=""
        data-ff-risk-profile-density="per-section"
      >
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="line" value={line} />
        {line === "health" ? (
          <input type="hidden" name={USING_HEALTHSHERPA_KEY} value={usingHealthSherpa ? "yes" : "no"} />
        ) : null}
        {line === "home" ? (
          <>
            <input
              type="hidden"
              name={WIND_MIT_INSPECTION_KEY}
              value={inspectionInHand(liveValues, "wind") ? "yes" : ""}
            />
            <input
              type="hidden"
              name={FOUR_POINT_INSPECTION_KEY}
              value={inspectionInHand(liveValues, "four") ? "yes" : ""}
            />
          </>
        ) : null}
        <input type="hidden" name="sheet_product" value={product} />
        <input
          type="hidden"
          name="returnTo"
          value={`/deals/${dealId}?tab=documents&line=${line}#${SHEET_CONFIRM_HASH}`}
        />
        <div data-ff-master-sheet-scroll="" className="overflow-visible">
          {groups.map((group) => {
            const useAutoRepeaters = line === "auto";
            if (group.group === "Applicant") {
              return (
                <ApplicantHousehold
                  key="applicant-household"
                  values={values}
                  hasCoApplicantFlag={hasCoApplicantFlag}
                />
              );
            }
            if (group.group === "Co-applicant") return null;
            if (useAutoRepeaters && (group.group === "Vehicle" || group.group === "Vehicles")) {
              return (
                <RepeatableUnitBlocks
                  key={group.group}
                  kind="vehicle"
                  product={product}
                  values={values}
                  extractedByKey={extractedByKey}
                  dealId={dealId}
                  line={line}
                />
              );
            }
            if (useAutoRepeaters && group.group === "Drivers") {
              return (
                <RepeatableUnitBlocks
                  key={group.group}
                  kind="driver"
                  product={product}
                  values={values}
                  extractedByKey={extractedByKey}
                />
              );
            }
            if (useAutoRepeaters && (group.group === "Household" || group.group === "Household members")) {
              return null;
            }
            return (
              <SheetGroup
                key={group.group}
                title={group.group}
                dealId={dealId}
                line={line}
                product={product}
                groupFields={asList(group.fields)}
                values={values}
                liveValues={liveValues}
                cascadeKeys={cascadeKeys}
                onLiveChange={(key, next, commit = false) =>
                  setLiveValues((prev) =>
                    line === "home"
                      ? applyHomeCoverageLiveChange(prev, key, next, values, product, commit)
                      : { ...prev, [key]: next },
                  )
                }
                extractedByKey={extractedByKey}
                usingHealthSherpa={usingHealthSherpa}
                insuredPropertyKind={insuredPropertyKind}
                quotingForm={resolvedForm || liveValues.quoting_form}
                inspectionUploads={inspectionUploads}
                onInspectionChange={(kind, checked) =>
                  onInspectionToggle({
                    kind,
                    checked,
                    dealId,
                    line,
                    uploads: inspectionUploads,
                    liveValues,
                    stored: values,
                    setLiveValues,
                    refresh: () => router.refresh(),
                  })
                }
              />
            );
          })}
        </div>
        <div className="border-t border-border px-3 py-2">
          <button type="submit" className={buttonVariants({ size: "sm" })} data-ff-save-sheet="">
            {SAVE_RISK_PROFILE_LABEL}
          </button>
        </div>
      </form>
    </section>
  );
}

function SheetGroup({
  title,
  dealId,
  line,
  product,
  groupFields,
  values,
  liveValues,
  cascadeKeys,
  onLiveChange,
  usingHealthSherpa = false,
  insuredPropertyKind,
  quotingForm,
  inspectionUploads,
  onInspectionChange,
}: {
  title: string;
  dealId: string;
  line: ShopLine;
  product?: string | null;
  groupFields: ReturnType<typeof fieldsForLine>;
  values: Record<string, QuoteSheetFieldValue>;
  liveValues: Record<string, string>;
  cascadeKeys: Set<string>;
  onLiveChange: (key: string, next: string, commit?: boolean) => void;
  extractedByKey: Map<string, ExtractedFieldRow>;
  usingHealthSherpa?: boolean;
  insuredPropertyKind?: string | null;
  quotingForm?: string | null;
  inspectionUploads?: InspectionUploadIds;
  onInspectionChange?: (kind: "wind" | "four", checked: boolean) => void;
}) {
  const rows = asList(groupFields).filter((field) => field.key !== USING_HEALTHSHERPA_KEY);
  const groupVisible = sheetGroupIsVisible(rows, liveValues);
  const visibleFields = rows.filter((field) => groupVisible && sheetFieldIsVisible(field, liveValues));
  const maxColumns = riskProfileSectionMaxColumns(title, visibleFields);
  const { sectionId, density, setDensity, choices } = useRiskProfileSectionDensity(title, maxColumns);
  const hiddenFields = rows.filter((field) => !groupVisible || !sheetFieldIsVisible(field, liveValues));
  const homeSection = line === "home";
  const inspectionKind = homeSection ? inspectionKindForSection(title) : null;
  const inspectionOpen = inspectionSectionDefaultOpen(title, liveValues);
  const [open, setOpen] = useState(() => (homeSection ? inspectionOpen : true));
  const [trackedInspection, setTrackedInspection] = useState(inspectionOpen);
  useEffect(() => {
    if (!inspectionKind) return;
    if (trackedInspection === inspectionOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect -- open the inspection section when the checkbox turns on */
    setTrackedInspection(inspectionOpen);
    setOpen(inspectionOpen);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [inspectionKind, inspectionOpen, trackedInspection]);
  const collapsible = usingHealthSherpa && healthSherpaCollapsibleGroups(true).has(title);
  const header = groupVisible ? (
    <RiskProfileSectionBar
      title={title}
      sectionId={sectionId}
      density={density}
      onDensityChange={setDensity}
      choices={choices}
      collapsed={homeSection ? !open : undefined}
      onToggleCollapse={homeSection ? () => setOpen((current) => !current) : undefined}
      extra={
        collapsible ? (
          <span className="ml-2 text-[10px] font-normal normal-case text-muted-foreground">
            {HEALTHSHERPA_SKIP_REKEY}
          </span>
        ) : null
      }
      titleCheck={
        inspectionKind ? (
          <InspectionBannerCheck
            kind={inspectionKind}
            checked={inspectionInHand(liveValues, inspectionKind)}
            uploaded={Boolean(
              inspectionKind === "wind"
                ? inspectionUploads?.windDocumentId
                : inspectionUploads?.fourDocumentId,
            )}
            onChange={(checked) => onInspectionChange?.(inspectionKind, checked)}
          />
        ) : null
      }
    />
  ) : null;
  const propertyUse =
    groupVisible && title.trim().toLowerCase() === "property" ? (
      <div className="border-b border-border/70 px-3 py-2" data-ff-risk-profile-property-use="">
        <InsuredPropertyKindControl
          dealId={dealId}
          value={insuredPropertyKind}
          product={product}
          quotingForm={quotingForm}
          sheetUsage={liveValues.usage}
          occupancy={liveValues.occupancy}
          tone="sheet"
        />
      </div>
    ) : null;
  const grid = groupVisible ? (
    <RiskProfileFieldsGrid
      density={density}
      fields={visibleFields}
      renderField={(field) => {
        const cell = values[field.key];
        const filled = Boolean(cell?.value.trim() && cell.status !== "missing");
        const sourceText = (cell ? sourceTag(cell) : null) || cell?.sourceLabel || "";
        return (
          <RiskProfileFieldShell
            fieldKey={field.key}
            label={field.label}
            field={field}
            cascadeKey={field.showWhen ? field.showWhen.key : undefined}
            footer={
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[9px] leading-none text-muted-foreground">
                {line === "home" && field.key === "coverage_a" && !(liveValues[field.key] ?? cell?.value ?? "").trim() ? (
                  <span data-ff-coverage-a-rce="">{COVERAGE_A_RCE_LABEL}</span>
                ) : null}
                {sourceText ? <span data-ff-sheet-source={field.key}>{sourceText}</span> : null}
                {cell?.status && filled ? (
                  <span
                    className={cn(
                      "uppercase",
                      cell.status === "check" && "text-fit-check",
                      cell.status === "missing" && "text-fit-yellow",
                      cell.status === "confirmed" && "text-fit-green",
                    )}
                  >
                    {cell.status}
                  </span>
                ) : null}
              </div>
            }
          >
            <SheetCell
              dealId={dealId}
              line={line}
              fieldKey={field.key}
              fieldLabel={field.label}
              input={field.input}
              options={
                occupationIndustryParentKey(field.key)
                  ? occupationsForIndustry(liveValues[occupationIndustryParentKey(field.key) ?? ""])
                  : field.options
              }
              cell={cell}
              liveValue={liveValues[field.key] ?? cell?.value ?? ""}
              onLiveChange={
                cascadeKeys.has(field.key) ||
                field.input === "chips" ||
                (line === "home" && HOME_LIVE_COVERAGE_KEYS.has(field.key))
                  ? (next, commit) => onLiveChange(field.key, next, commit)
                  : undefined
              }
            />
          </RiskProfileFieldShell>
        );
      }}
    />
  ) : null;

  const sectionBody = (
    <div hidden={homeSection && !open ? true : undefined} data-ff-section-body={title}>
      {propertyUse}
      {grid}
    </div>
  );

  return (
    <div
      className={groupVisible ? "border-b border-border/70 last:border-b-0" : undefined}
      data-ff-sheet-group={title}
      data-ff-section-chrome={homeSection ? "home" : undefined}
      data-ff-sheet-group-hidden={groupVisible ? undefined : "true"}
      data-ff-section-open={homeSection ? (open ? "true" : "false") : undefined}
      hidden={!groupVisible}
    >
      {hiddenFields.map((field) => (
        <input
          key={field.key}
          type="hidden"
          name={field.key}
          value={liveValues[field.key] ?? values[field.key]?.value ?? ""}
        />
      ))}
      {collapsible && groupVisible ? (
        <details data-ff-healthsherpa-collapse={title}>
          <summary className="cursor-pointer list-none">{header}</summary>
          {healthSherpaProductForPlan(liveValues.plan_type) === "manual" ? (
            <p className="px-3 py-1 text-[11px] text-muted-foreground">{HEALTHSHERPA_MANUAL_LINES_NOTE}</p>
          ) : null}
          {sectionBody}
        </details>
      ) : (
        <>
          {header}
          {sectionBody}
        </>
      )}
    </div>
  );
}

function InspectionBannerCheck({
  kind,
  checked,
  uploaded,
  onChange,
}: {
  kind: "wind" | "four";
  checked: boolean;
  uploaded: boolean;
  onChange: (checked: boolean) => void;
}) {
  const label = kind === "wind" ? WIND_MIT_INSPECTION_LABEL : FOUR_POINT_INSPECTION_LABEL;
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      data-ff-wind-mit-inspection={kind === "wind" ? "" : undefined}
      data-ff-four-point-inspection={kind === "four" ? "" : undefined}
      data-ff-inspection-banner={kind}
      data-ff-inspection-ready={uploaded ? "true" : "false"}
      className="size-4 shrink-0 accent-white"
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

function inspectionSectionHasData(
  kind: "wind" | "four",
  liveValues: Record<string, string>,
  stored: Record<string, QuoteSheetFieldValue>,
): boolean {
  const keys = kind === "wind" ? WIND_MIT_FIELD_KEYS : FOUR_POINT_FIELD_KEYS;
  return keys.some((key) => (liveValues[key] ?? stored[key]?.value ?? "").trim());
}

async function onInspectionToggle({
  kind,
  checked,
  dealId,
  line,
  uploads,
  liveValues,
  stored,
  setLiveValues,
  refresh,
}: {
  kind: "wind" | "four";
  checked: boolean;
  dealId: string;
  line: ShopLine;
  uploads?: InspectionUploadIds;
  liveValues: Record<string, string>;
  stored: Record<string, QuoteSheetFieldValue>;
  setLiveValues: Dispatch<SetStateAction<Record<string, string>>>;
  refresh: () => void;
}) {
  const key = kind === "wind" ? WIND_MIT_INSPECTION_KEY : FOUR_POINT_INSPECTION_KEY;
  if (!checked) {
    setLiveValues((prev) => ({ ...prev, [key]: "" }));
    return;
  }
  const documentId = kind === "wind" ? uploads?.windDocumentId : uploads?.fourDocumentId;
  const gate = inspectionCheckBlock(kind, Boolean(documentId));
  if (!gate.ok) {
    flashAction(gate.message, "error");
    return;
  }
  setLiveValues((prev) => ({ ...prev, [key]: "yes" }));
  if (inspectionSectionHasData(kind, liveValues, stored) || !documentId) return;
  const filled = await fillMasterSheetDocument({ dealId, line, documentId });
  if (filled.error) flashAction(filled.error, "error");
  refresh();
}

function selectedMultiValues(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function SheetCell({
  dealId,
  line,
  fieldKey,
  fieldLabel,
  input = "text",
  options,
  cell,
  liveValue,
  onLiveChange,
}: {
  dealId: string;
  line: ShopLine;
  fieldKey: string;
  fieldLabel: string;
  input?: QuoteFieldDef["input"];
  options?: string[];
  cell?: QuoteSheetFieldValue;
  liveValue?: string;
  onLiveChange?: (next: string, commit?: boolean) => void;
}) {
  const locked = fieldKey === "coverage_a" && cell?.source === "javy";
  const className = cn(
    "h-7 w-full min-w-0 text-xs cursor-text",
    cell?.status === "check" && "ff-field-check",
    (!cell?.value.trim() || cell.status === "missing") && "ff-field-missing",
  );
  const value = liveValue ?? cell?.value ?? "";

  const chips = input === "chips" ? parseChipList(liveValue ?? value) : [];

  return (
    <div className="flex flex-col gap-0.5">
      {input === "chips" && options?.length ? (
        <div className="flex flex-wrap gap-1.5" data-ff-sheet-chips={fieldKey}>
          <input type="hidden" name={fieldKey} value={joinChipList(chips)} />
          {options.map((opt) => {
            const on = chips.some((item) => item.toLowerCase() === opt.toLowerCase());
            return (
              <label
                key={opt}
                className={cn(
                  "cursor-pointer rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  on
                    ? "border-navy bg-navy text-white"
                    : "border-navy/25 bg-background text-navy",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? joinChipList([...chips, opt])
                      : joinChipList(chips.filter((item) => item.toLowerCase() !== opt.toLowerCase()));
                    onLiveChange?.(next);
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      ) : input === "multiselect" && options && options.length > 0 ? (
        line === "life" && fieldKey === "medical_conditions" ? (
          <div data-ff-sheet-multiselect={fieldKey} className="min-w-0">
            <input type="hidden" name={fieldKey} value="" />
            <MultiSelectField
              name={fieldKey}
              options={options}
              value={value}
              disabled={locked}
              form={MASTER_SHEET_FORM_ID}
              searchable
              label={fieldLabel}
              fieldKey={fieldKey}
            />
          </div>
        ) : (
        <fieldset
          data-ff-sheet-multiselect={fieldKey}
          className="grid gap-1 rounded-md border border-input bg-background px-2 py-1.5"
        >
          <legend className="sr-only">{fieldLabel}</legend>
          <input type="hidden" name={fieldKey} value="" />
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-[11px] leading-tight text-navy">
              <input
                type="checkbox"
                name={fieldKey}
                value={opt}
                defaultChecked={selectedMultiValues(value).includes(opt)}
                disabled={locked}
                className="size-3.5 accent-[var(--ff-navy,#1e293b)]"
              />
              <span>{opt}</span>
            </label>
          ))}
        </fieldset>
        )
      ) : input === "textarea" ? (
        <Textarea
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          defaultValue={value}
          rows={2}
          readOnly={locked}
          aria-label={fieldLabel}
          className={cn("min-h-7 py-1 text-xs", className)}
        />
      ) : options && options.length > 0 ? (
        <select
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          defaultValue={onLiveChange ? undefined : value}
          value={onLiveChange ? (liveValue ?? value) : undefined}
          disabled={locked}
          aria-label={fieldLabel}
          data-ff-sheet-picklist={fieldKey}
          onChange={
            onLiveChange
              ? (event) => onLiveChange(event.target.value)
              : undefined
          }
          className={cn(
            "border-input bg-background min-w-0 w-full rounded-md border px-2 shadow-xs outline-none",
            className,
            locked && "opacity-70",
          )}
        >
          <option value="">None</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          {value.trim() && !options.includes(value) ? (
            <option value={value}>{value}</option>
          ) : null}
        </select>
      ) : (
        <Input
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          type={input === "select" ? "text" : input}
          defaultValue={onLiveChange ? undefined : value}
          value={onLiveChange ? (liveValue ?? value) : undefined}
          onChange={
            onLiveChange
              ? (event) => onLiveChange(event.target.value, fieldKey === "coverage_a" ? false : true)
              : undefined
          }
          onBlur={
            onLiveChange && fieldKey === "coverage_a"
              ? (event) => onLiveChange(event.target.value, true)
              : undefined
          }
          readOnly={locked}
          aria-label={fieldLabel}
          className={className}
          data-ff-coverage-a-live={fieldKey === "coverage_a" ? "" : undefined}
        />
      )}
      <div className="flex flex-wrap items-center gap-1">
        {cell?.status === "check" && !locked ? (
          <Button
            type="submit"
            formAction={async (formData) => {
              formData.set("fieldKey", fieldKey);
              await confirmQuoteSheetField(formData);
            }}
            variant="ghost"
            size="xs"
            className="h-5 self-start px-1 text-[10px]"
          >
            Confirm
          </Button>
        ) : null}
        {fieldKey === "miles_to_coast" && !locked ? (
          <MilesToCoastButton dealId={dealId} line={line} />
        ) : null}
      </div>
      {locked ? <span className="text-[9px] text-muted-foreground">Ana Cov A locked</span> : null}
    </div>
  );
}
