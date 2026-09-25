"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { searchDealsForCreate } from "@/app/actions/deal-create";
import type { CreateDealPickHit } from "@/lib/deals/create-from-source";
import { newDealCreateHref } from "@/lib/deals/new-deal-href";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DealFlowRail } from "@/components/deals/deal-flow-rail";
import { ProductPicker } from "@/components/deals/product-picker";
import { normalizeDealProducts } from "@/lib/deals/deal-products";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

type Step = "choose" | "search";

export function AddNewDealDialog({
  triggerClassName,
  triggerLabel = "Add New Deal",
  triggerSize = "default",
}: {
  triggerClassName?: string;
  triggerLabel?: string;
  triggerSize?: "default" | "sm" | "lg" | "xs";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  const [hits, setHits] = useState<CreateDealPickHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [products, setProducts] = useState<string[]>(["homeowners"]);

  useEffect(() => {
    if (!open || step !== "search") return;
    const q = debounced.trim();
    if (!q) {
      setHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    void searchDealsForCreate(q)
      .then((rows) => {
        if (!cancelled) setHits(rows);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open, step]);

  function reset() {
    setStep("choose");
    setQuery("");
    setHits([]);
    setSearching(false);
    setProducts(["homeowners"]);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function openCreateForm(href: string) {
    setOpen(false);
    reset();
    router.push(href);
  }

  function onScratch() {
    openCreateForm(
      newDealCreateHref({ shopLines: normalizeDealProducts(products) }),
    );
  }

  function onPick(hit: CreateDealPickHit) {
    const lines = normalizeDealProducts(products);
    if (hit.kind === "deal") {
      openCreateForm(newDealCreateHref({ shopLines: lines, sourceDealId: hit.id }));
      return;
    }
    openCreateForm(
      newDealCreateHref({
        shopLines: lines,
        contactId: hit.id,
        sourceDealId: hit.sourceDealId,
      }),
    );
  }

  return (
    <>
      <Button
        type="button"
        size={triggerSize}
        className={cn("hover:!bg-fit-red hover:!text-white hover:!border-fit-red", triggerClassName)}
        data-ff-new-deal=""
        data-ff-add-new-deal=""
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-2xl"
          showCloseButton
          data-ff-add-new-deal-dialog=""
        >
          <DialogHeader>
            <DialogTitle>
              {step === "choose" ? "Add New Deal" : "Existing Contact / Deal"}
            </DialogTitle>

          </DialogHeader>

          <DealFlowRail current="create" />
          <div data-ff-package-lines="">
            <ProductPicker
              selected={products}
              onChange={setProducts}
              idPrefix="add-deal-pkg"
            />
          </div>

          {step === "choose" ? (
            <div className="flex flex-col gap-2" data-ff-add-new-deal-choose="">
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start whitespace-normal px-3 py-3 text-left"
                data-ff-add-deal-existing=""
                onClick={() => {
                  setStep("search");
                }}
              >
                Create A New Deal For Existing Contact / Deal
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start whitespace-normal px-3 py-3 text-left"
                data-ff-add-deal-scratch=""
                onClick={onScratch}
              >
                Create A New Deal From Scratch
              </Button>
            </div>
          ) : (
            <div className="space-y-3" data-ff-add-new-deal-search="">
              <Input
                type="search"
                autoFocus
                autoComplete="off"
                placeholder="Deal name or contact name…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                data-ff-add-deal-search-input=""
              />
              <ul
                className="max-h-56 overflow-auto rounded-md border border-border bg-card"
                data-ff-add-deal-search-results=""
              >
                {!query.trim() ? null : searching && hits.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
                ) : hits.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No matches for “{query.trim()}”.
                  </li>
                ) : (
                  hits.map((hit) => (
                    <li key={`${hit.kind}-${hit.id}`}>
                      <button
                        type="button"
                        onClick={() => onPick(hit)}
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium text-foreground">{hit.title}</span>
                        <span className="text-xs text-muted-foreground">{hit.subtitle}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("choose");
                  setQuery("");
                  setHits([]);
                }}
              >
                Back
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
