import Link from "next/link";
import { DealPackageLinesForm } from "@/components/deal/deal-package-lines-form";
import {
  dealProductDef,
  dealProductSwitcherHref,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { parseProductInstanceToken } from "@/lib/deals/product-instances";
import type { VehicleLabelFact } from "@/lib/deals/product-instance-label";
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
    />
  );
  const chips = (
      <nav
        aria-label="Deal products"
        className={rail ? "flex w-full flex-col gap-1" : "flex flex-wrap items-stretch gap-1"}
        data-ff-deal-line-switcher=""
        data-ff-deal-product-chips=""
      >
        {ordered.map((product) => {
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
          const label =
            labels[product] ??
            productChipLabel({ product: productId, quotingForm: formLabels[product] ?? formLabels[productId] });
          const stageLabel = productChipStageLabelForState({
            stage,
            selectedQuoteIds: stages[product]?.selectedQuoteIds,
            issuedDone,
          });
          return (
            <Link
              key={product}
              href={dealProductSwitcherHref({ dealId, product, tab })}
              scroll={false}
              className={cn(
                "relative overflow-hidden rounded border px-2 py-1 text-[11px] font-semibold transition-colors",
                rail ? "block w-full min-w-0 text-left" : "min-w-[4.5rem]",
                selected
                  ? cn(theme.chipOn, "shadow-sm ring-2 ring-navy/25")
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/40",
                quotesMissing && !selected && "border-fit-flag/50",
              )}
              data-ff-deal-line-chip={def.shopLine}
              data-ff-deal-product-chip={product}
              data-ff-product-complete={done ? "1" : "0"}
              data-ff-product-quotes-complete={gap ? (gap.complete ? "1" : "0") : undefined}
              data-ff-product-missing-quotes={quotesMissing ? "1" : "0"}
              data-ff-product-stage={stage ?? ""}
              data-ff-product-issued-done={issuedDone ? "1" : "0"}
              data-ff-shopping-active={issuedDone ? "0" : "1"}
              title={quotesMissing ? gap?.summary : undefined}
              data-active={selected ? "true" : "false"}
              aria-current={selected ? "page" : undefined}
            >
              <span className={cn("flex items-center gap-1", rail && "w-full flex-wrap")}>
                {quotesMissing ? (
                  <span
                    className="inline-flex size-2.5 items-center justify-center rounded-full bg-fit-flag text-[8px] text-white"
                    aria-label="Incomplete quotes"
                    data-ff-product-missing-quotes-chip=""
                    title={gap?.summary ?? "Missing quotes"}
                  >
                    !
                  </span>
                ) : done ? (
                  <span
                    className="inline-flex size-2.5 items-center justify-center rounded-full bg-[var(--ff-green)] text-[8px] text-white"
                    aria-label="Bound"
                  >
                    ✓
                  </span>
                ) : (
                  <span className={cn("inline-block size-1 rounded-full", theme.bar)} aria-hidden />
                )}
                <span className={cn(rail && "min-w-0 flex-1 whitespace-normal break-words")}>{label}</span>
                {stageLabel ? (
                  <span
                    className={cn(
                      "text-[9px] font-medium",
                      selected ? "text-white/85" : "text-muted-foreground",
                    )}
                    data-ff-product-stage-label=""
                  >
                    {stages[product]?.mintStatus === "creating" ? "Creating…" : stageLabel}
                  </span>
                ) : null}
                {issuedDone ? (
                  <span
                    className={cn(
                      "rounded-sm border border-current px-1 text-[9px] font-extrabold uppercase tracking-wider",
                      selected ? "text-white" : "text-emerald-800",
                    )}
                    data-ff-product-done-stamp=""
                  >
                    Done
                  </span>
                ) : stages[product]?.policyId ? (
                  <span
                    className={cn(
                      "text-[9px] font-medium underline-offset-2",
                      selected ? "text-white/85" : "text-navy",
                    )}
                    data-ff-product-policy-chip={stages[product]?.policyId}
                  >
                    Policy
                  </span>
                ) : null}
              </span>
              <span
                className={cn("absolute inset-x-0 bottom-0 h-0.5", selected ? "bg-navy/30" : "bg-black/5")}
                aria-hidden
              >
                <span className={cn("block h-full", theme.bar)} style={{ width: `${pct}%` }} />
              </span>
            </Link>
          );
        })}
      </nav>
  );
  if (rail) {
    return (
      <div className="flex w-full flex-col gap-1" data-ff-deal-product-chip-row="" data-ff-deal-products-rail="">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Products</p>
        {chips}
        {picker}
      </div>
    );
  }
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