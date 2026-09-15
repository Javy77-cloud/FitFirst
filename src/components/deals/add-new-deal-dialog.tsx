"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDealFromExistingPick,
  createDealFromScratch,
  searchDealsForCreate,
} from "@/app/actions/deal-create";
import type { CreateDealPickHit } from "@/lib/deals/create-from-source";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PackageLineCheckboxes } from "@/components/deals/package-line-checkboxes";
import { normalizePackageLines, type PcPackageLine } from "@/lib/deals/package-lines";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  const [hits, setHits] = useState<CreateDealPickHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [packageLines, setPackageLines] = useState<PcPackageLine[]>(["home"]);

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
    setBusy(false);
    setError(null);
    setQuery("");
    setHits([]);
    setSearching(false);
    setPackageLines(["home"]);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function onScratch() {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const line of normalizePackageLines(packageLines)) fd.append("shopLines", line);
      const result = await createDealFromScratch(fd);
      if (!result.ok) {
        setError("message" in result ? result.message : "Could not create deal.");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
      router.push(result.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create deal.");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(hit: CreateDealPickHit) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("kind", hit.kind);
      fd.set("id", hit.id);
      for (const line of normalizePackageLines(packageLines)) fd.append("shopLines", line);
      const result = await createDealFromExistingPick(fd);
      if (!result.ok || !result.href) {
        setError(result.message || "Could not create deal.");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
      router.push(result.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create deal.");
    } finally {
      setBusy(false);
    }
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
          className="sm:max-w-md"
          showCloseButton
          data-ff-add-new-deal-dialog=""
        >
          <DialogHeader>
            <DialogTitle>
              {step === "choose" ? "Add New Deal" : "Existing Contact / Deal"}
            </DialogTitle>
            <DialogDescription>
              {step === "choose"
                ? "Pick Home / Auto / Flood for this shop, then start blank or copy an existing contact."
                : "Search by deal name or contact name. Picking one creates a new deal with details copied."}
            </DialogDescription>
          </DialogHeader>

          <div data-ff-package-lines="">
            <PackageLineCheckboxes
              selected={packageLines}
              onChange={setPackageLines}
              disabled={busy}
              idPrefix="add-deal-pkg"
            />
          </div>

          {step === "choose" ? (
            <div className="flex flex-col gap-2" data-ff-add-new-deal-choose="">
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start whitespace-normal px-3 py-3 text-left"
                disabled={busy}
                data-ff-add-deal-existing=""
                onClick={() => {
                  setStep("search");
                  setError(null);
                }}
              >
                Create A New Deal For Existing Contact / Deal
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start whitespace-normal px-3 py-3 text-left"
                disabled={busy}
                data-ff-add-deal-scratch=""
                onClick={() => void onScratch()}
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
                disabled={busy}
                onChange={(event) => setQuery(event.target.value)}
                data-ff-add-deal-search-input=""
              />
              <ul
                className="max-h-56 overflow-auto rounded-md border border-border bg-card"
                data-ff-add-deal-search-results=""
              >
                {!query.trim() ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    Type to search deals and contacts.
                  </li>
                ) : searching && hits.length === 0 ? (
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
                        disabled={busy}
                        onClick={() => void onPick(hit)}
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
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
                disabled={busy}
                onClick={() => {
                  setStep("choose");
                  setQuery("");
                  setHits([]);
                  setError(null);
                }}
              >
                Back
              </Button>
            </div>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
