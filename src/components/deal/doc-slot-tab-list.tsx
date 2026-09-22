"use client";

import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import type { DocSlotDef } from "@/lib/documents/doc-slot-advance";

export function DocSlotTabList({
  slots,
  active,
  filled,
  onSelect,
}: {
  slots: readonly DocSlotDef[];
  active: string;
  filled: readonly string[];
  onSelect: (docType: string) => void;
}) {
  const have = new Set(filled);
  return (
    <div role="tablist" aria-label="Required documents" className={FF_CHIP_TAB_GROUP} data-ff-doc-slot-tabs="">
      {slots.map((slot) => {
        const selected = slot.docType === active;
        const done = have.has(slot.docType);
        return (
          <button
            key={slot.docType}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={done ? `${slot.label}, saved` : slot.label}
            data-ff-doc-slot={slot.docType}
            data-ff-doc-slot-filled={done ? slot.docType : undefined}
            className={chipTabClass(selected)}
            onClick={() => onSelect(slot.docType)}
          >
            {slot.label}
            {done ? <span aria-hidden="true"> ✓</span> : null}
          </button>
        );
      })}
    </div>
  );
}
