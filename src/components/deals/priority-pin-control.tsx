"use client";

import { useState, useSyncExternalStore } from "react";
import { applyManualPriority, sanitizePriorityPins, type PriorityPinMap } from "@/lib/deals/priority-pins";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ff-deal-priority-pins:v1";
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const EMPTY_PINS: PriorityPinMap = {};

const pinListeners = new Set<() => void>();
let pinCache: PriorityPinMap = EMPTY_PINS;
let pinCacheRaw: string | null = null;

function readPinCache(): PriorityPinMap {
  if (typeof window === "undefined") return EMPTY_PINS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_PINS;
  }
  if (raw === pinCacheRaw) return pinCache;
  pinCacheRaw = raw;
  if (!raw) {
    pinCache = EMPTY_PINS;
    return pinCache;
  }
  try {
    pinCache = sanitizePriorityPins(JSON.parse(raw) as unknown);
  } catch {
    pinCache = EMPTY_PINS;
  }
  return pinCache;
}

function emitPins() {
  for (const listener of pinListeners) listener();
}

function subscribePins(listener: () => void) {
  pinListeners.add(listener);
  return () => pinListeners.delete(listener);
}

function writePins(next: PriorityPinMap) {
  pinCache = next;
  try {
    if (Object.keys(next).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      pinCacheRaw = null;
    } else {
      pinCacheRaw = JSON.stringify(next);
      window.localStorage.setItem(STORAGE_KEY, pinCacheRaw);
    }
  } catch {
    /* private mode */
  }
  emitPins();
}

function serverPins() {
  return EMPTY_PINS;
}

export function usePriorityPins() {
  const pins = useSyncExternalStore(subscribePins, readPinCache, serverPins);

  function setRank(id: string, rank: number | null) {
    const next = { ...readPinCache() };
    if (rank == null) delete next[id];
    else next[id] = rank;
    writePins(next);
  }

  return { pins, setRank };
}

export function orderWithPriorityPins<T extends { id: string }>(cards: readonly T[], pins: PriorityPinMap): T[] {
  return applyManualPriority(cards, pins);
}

export function PriorityPinControl({
  id,
  rank,
  onSet,
}: {
  id: string;
  rank: number | null;
  onSet: (id: string, rank: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("ff-priority-pin", rank != null && "is-set")} data-ff-priority-pin={rank ?? "off"}>
      <button
        type="button"
        className="ff-priority-pin-btn"
        aria-expanded={open}
        aria-label={rank != null ? `Priority ${rank}. Change pin` : "Set priority pin"}
        title={rank != null ? `Pinned ${rank}. Click to change or clear` : "Pin a priority. 1 floats up. 9–10 sink."}
        onClick={() => setOpen((current) => !current)}
      >
        {rank ?? "Pin"}
      </button>
      {open ? (
        <div className="ff-priority-pin-menu" role="group" aria-label="Set priority">
          <p className="ff-priority-pin-hint">1–8 float up · 9–10 sink</p>
          {RANKS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={rank === n}
              data-ff-priority-choice={n}
              onClick={() => {
                onSet(id, rank === n ? null : n);
                setOpen(false);
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="ff-priority-pin-clear"
            data-ff-priority-clear=""
            onClick={() => {
              onSet(id, null);
              setOpen(false);
            }}
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
