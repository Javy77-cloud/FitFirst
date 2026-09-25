import Link from "next/link";
import { DealPackageLinesForm } from "@/components/deal/deal-package-lines-form";
import { PolicyFormDropup } from "@/components/deal/policy-form-dropup";
import {
  dealProductDef,
  dealProductSwitcherHref,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { parseProductInstanceToken } from "@/lib/deals/product-instances";
import {
  activeProductFieldCh,
  policyFormMenuLabel,
  productCodeLabel,
  type VehicleLabelFact,
} from "@/lib/deals/product-instance-label";
import {
  productChipBound,
  productChipLabel,
  productChipStageLabelForState,
  productReadyFromQuotes,
} from "@/lib/deals/product-stages";
import { productTabShowsError } from "@/lib/deals/product-property";
import { themeForProduct } from "@/lib/deals/product-ui";
import { cn } from "@/lib/utils";

export type DealProductChipProgress = {
  filled?: number;
  total?: number;
  pct?: number;
  complete?: boolean;
};

export type DealProductQuoteGap = {
  complete: boolean;
  shopped?: boolean;
  summary: string;
};

export type DealProductStageChip = {
  stage?: string | null;
  lostReason?: string | null;
  selectedQuoteIds?: readonly string[] | null;
  policyId?: string | null;
  mintStatus?: string | null;
  issuedDone?: boolean | null;
};

export function DealLineSwitcher({
  dealId,
  products,
  active,
  tab,
  complete = {},
  progress = {},
  quoteGaps = {},
  stages = {},
  formLabels = {},
  labels = {},
  labelFacts,
  layout = "row",
}: {
  dealId: string;
  products: readonly string[];
  active: string;
  tab?: string | null;
  complete?: Partial<Record<string, boolean>>;
  progress?: Partial<Record<string, DealProductChipProgress>>;
  quoteGaps?: Partial<Record<string, DealProductQuoteGap>>;
  stages?: Partial<Record<string, DealProductStageChip>>;
  formLabels?: Partial<Record<string, string>>;
  labels?: Partial<Record<string, string>>;
  labelFacts?: Partial<
    Record<
      string,
      {
        quotingForm?: string | null;
        sheetForm?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
        vehicles?: readonly VehicleLabelFact[] | null;
      }
    >
  >;
  /** `row` is the horizontal chip strip. `rail` is the full-width column above Quick Communication. */
  layout?: "row" | "rail";
}) {
  if (!products.length) return null;
  const rail = layout === "rail";
  // Stored order is oldest-first. The rail shows the newest product directly under the title.
  const ordered = rail ? [...products].reverse() : [...products];
  const picker = (
    <DealPackageLinesForm
      dealId={dealId}
      selected={products}
      tab={tab}
      activeLine={active}
      labelFacts={labelFacts}
      expand={rail ? "up" : "down"}
      tone={rail ? "link" : "button"}
    />
  );
  const options = ordered.map((product) => {
    const selected = product === active;
    const stat = progress[product];
    const gap = quoteGaps[product];
    const quotesMissing = productTabShowsError(gap);
    const quotesIn = productReadyFromQuotes({
      complete: gap?.complete ?? complete[product],
    });
    const stage = stages[product]?.stage;
    const bound = productChipBound(stage);
    const issuedDone = Boolean(stages[product]?.issuedDone);
    const done = bound || issuedDone;
    const pct = quotesMissing ? 0 : bound ? 100 : quotesIn ? 70 : (stat?.pct ?? 0);
    const productId = (parseProductInstanceToken(product)?.productId ?? "homeowners") as DealProductId;
    const theme = themeForProduct(productId);
    const def = dealProductDef(productId);
    const facts = labelFacts?.[product];
    const label =
      labels[product] ??
      productChipLabel({ product: productId, quotingForm: formLabels[product] ?? formLabels[productId] });
    const menuLabel = policyFormMenuLabel({
      code: productCodeLabel({
        productId,
        quotingForm: facts?.quotingForm ?? formLabels[product] ?? formLabels[productId],
        sheetForm: facts?.sheetForm,
      }),
      fallback: label,
      address: facts?.address,
      city: facts?.city,
      state: facts?.state,
      zip: facts?.zip,
    });
    const stageLabel = productChipStageLabelForState({
      stage,
      selectedQuoteIds: stages[product]?.selectedQuoteIds,
      issuedDone,
    });
    return {
      product,
      selected,
      gap,
      quotesMissing,
      done,
      pct,
      theme,
      def,
      label,
      menuLabel,
      stage,
      stageLabel,
      issuedDone,
      mintStatus: stages[product]?.mintStatus,
      policyId: stages[product]?.policyId ?? null,
    };
  });
  if (rail) {
    const activeOption = options.find((row) => row.selected) ?? options[0];
    const fieldCh = activeProductFieldCh(activeOption?.menuLabel ?? "");
    return (
      <div
        className="inline-grid w-max max-w-full min-w-0 gap-1"
        style={{ gridTemplateColumns: `minmax(${fieldCh}ch, max-content)` }}
        data-ff-deal-product-chip-row=""
        data-ff-deal-products-rail=""
        data-ff-policy-form-line=""
        data-ff-deal-line-switcher=""
      >
        <PolicyFormDropup label={activeOption?.menuLabel ?? ""}>
          <div className="flex flex-col divide-y divide-[#e5e7eb]" data-ff-deal-product-chips="">
            {options.map((row) => (
              <Link
                key={row.product}
                href={dealProductSwitcherHref({ dealId, product: row.product, tab })}
                scroll={false}
                role="option"
                aria-selected={row.selected}
                className={cn(
                  "flex w-full items-center gap-2 whitespace-normal break-words px-3 py-1.5 text-left text-[13px] text-[var(--ff-ink)] hover:bg-[#f3f4f6]",
                  row.selected ? "font-semibold" : "font-medium",
                )}
                data-ff-deal-line-chip={row.def.shopLine}
                data-ff-deal-product-chip={row.product}
                data-ff-product-complete={row.done ? "1" : "0"}
                data-ff-product-quotes-complete={row.gap ? (row.gap.complete ? "1" : "0") : undefined}
                data-ff-product-missing-quotes={row.quotesMissing ? "1" : "0"}
                data-ff-product-stage={row.stage ?? ""}
                data-ff-product-issued-done={row.issuedDone ? "1" : "0"}
                data-ff-shopping-active={row.issuedDone ? "0" : "1"}
                title={row.quotesMissing ? row.gap?.summary : row.menuLabel}
                data-active={row.selected ? "true" : "false"}
                aria-current={row.selected ? "page" : undefined}
              >
                <span className="flex w-full items-center gap-2">
                  {row.quotesMissing ? (
                    <span
                      className="inline-flex size-2.5 shrink-0 items-center justify-center rounded-full bg-fit-flag text-[8px] text-white"
                      aria-label="Incomplete quotes"
                      data-ff-product-missing-quotes-chip=""
                      title={row.gap?.summary ?? "Missing quotes"}
                    >
                      !
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">{row.menuLabel}</span>
                  {row.issuedDone ? (
                    <span
                      className="shrink-0 rounded-sm border border-current px-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800"
                      data-ff-product-done-stamp=""
                    >
                      Done
                    </span>
                  ) : null}
                  {row.selected ? (
                    <span
                      className="shrink-0 text-sm font-bold text-[var(--ff-green)]"
                      data-ff-policy-form-selected=""
                      aria-label="Selected"
                    >
                      ✓
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </PolicyFormDropup>
        <div className="flex w-full items-center justify-between gap-3" data-ff-policy-form-caption="">
          <p className="shrink-0 text-[13px] font-semibold text-[var(--ff-red)]">Products</p>
          {picker}
        </div>
      </div>
    );
  }
  const chips = (
      <nav
        aria-label="Deal products"
        className="flex flex-wrap items-stretch gap-1"
        data-ff-deal-line-switcher=""
        data-ff-deal-product-chips=""
      >
        {options.map((row) => (
            <Link
              key={row.product}
              href={dealProductSwitcherHref({ dealId, product: row.product, tab })}
              scroll={false}
              className={cn(
                "relative min-w-[4.5rem] overflow-hidden rounded border px-2 py-1 text-[11px] font-semibold transition-colors",
                row.selected
                  ? cn(row.theme.chipOn, "shadow-sm ring-2 ring-navy/25")
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/40",
                row.quotesMissing && !row.selected && "border-fit-flag/50",
              )}
              data-ff-deal-line-chip={row.def.shopLine}
              data-ff-deal-product-chip={row.product}
              data-ff-product-complete={row.done ? "1" : "0"}
              data-ff-product-quotes-complete={row.gap ? (row.gap.complete ? "1" : "0") : undefined}
              data-ff-product-missing-quotes={row.quotesMissing ? "1" : "0"}
              data-ff-product-stage={row.stage ?? ""}
              data-ff-product-issued-done={row.issuedDone ? "1" : "0"}
              data-ff-shopping-active={row.issuedDone ? "0" : "1"}
              title={row.quotesMissing ? row.gap?.summary : undefined}
              data-active={row.selected ? "true" : "false"}
              aria-current={row.selected ? "page" : undefined}
            >
              <span className="flex items-center gap-1">
                {row.quotesMissing ? (
                  <span
                    className="inline-flex size-2.5 items-center justify-center rounded-full bg-fit-flag text-[8px] text-white"
                    aria-label="Incomplete quotes"
                    data-ff-product-missing-quotes-chip=""
                    title={row.gap?.summary ?? "Missing quotes"}
                  >
                    !
                  </span>
                ) : row.done ? (
                  <span
                    className="inline-flex size-2.5 items-center justify-center rounded-full bg-[var(--ff-green)] text-[8px] text-white"
                    aria-label="Bound"
                  >
                    ✓
                  </span>
                ) : (
                  <span className={cn("inline-block size-1 rounded-full", row.theme.bar)} aria-hidden />
                )}
                <span>{row.label}</span>
                {row.stageLabel ? (
                  <span
                    className={cn(
                      "shrink-0 text-[9px] font-medium",
                      row.selected ? "text-white/90" : "text-muted-foreground",
                    )}
                    data-ff-product-stage-label=""
                  >
                    {row.mintStatus === "creating" ? "Creating…" : row.stageLabel}
                  </span>
                ) : null}
                {row.issuedDone ? (
                  <span
                    className={cn(
                      "rounded-sm border border-current px-1 text-[9px] font-extrabold uppercase tracking-wider",
                      row.selected ? "text-white" : "text-emerald-800",
                    )}
                    data-ff-product-done-stamp=""
                  >
                    Done
                  </span>
                ) : row.policyId ? (
                  <span
                    className={cn(
                      "text-[9px] font-medium underline-offset-2",
                      row.selected ? "text-white/85" : "text-navy",
                    )}
                    data-ff-product-policy-chip={row.policyId}
                  >
                    Policy
                  </span>
                ) : null}
              </span>
              <span
                className={cn("absolute inset-x-0 bottom-0 h-0.5", row.selected ? "bg-navy/30" : "bg-black/5")}
                aria-hidden
              >
                <span className={cn("block h-full", row.theme.bar)} style={{ width: `${row.pct}%` }} />
              </span>
            </Link>
        ))}
      </nav>
  );
  return (
    <div className="mt-1.5 space-y-1" data-ff-deal-product-chip-row="">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Products</p>
        {picker}
      </div>
      {chips}
    </div>
  );
}