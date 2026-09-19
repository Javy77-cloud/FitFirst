import { describe, expect, it } from "vitest";
import { placeWhyPopover, refineWhyPopoverHeight } from "./place-why-popover";

const viewport = { width: 1280, height: 800 };

function trigger(partial: Partial<{ top: number; left: number; width: number; height: number }>) {
  const top = partial.top ?? 200;
  const left = partial.left ?? 400;
  const width = partial.width ?? 52;
  const height = partial.height ?? 20;
  return { top, left, width, height, right: left + width, bottom: top + height };
}

describe("placeWhyPopover", () => {
  it("opens below a mid-column card and keeps the panel on screen", () => {
    const box = placeWhyPopover(trigger({ top: 240 }), viewport);
    expect(box.place).toBe("below");
    expect(box.top).toBe(268);
    expect(box.left).toBeGreaterThanOrEqual(8);
    expect(box.left + box.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(box.maxHeight).toBeLessThanOrEqual(Math.round(viewport.height * 0.7));
  });

  it("flips above when the card sits near the bottom of the column", () => {
    const box = placeWhyPopover(trigger({ top: 740 }), viewport);
    expect(box.place).toBe("above");
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(740 - 8);
    expect(box.top).toBeGreaterThanOrEqual(8);
  });

  it("stays below a card near the top so the panel is not clipped by the viewport", () => {
    const box = placeWhyPopover(trigger({ top: 12 }), viewport);
    expect(box.place).toBe("below");
    expect(box.top).toBeGreaterThanOrEqual(12 + 20);
    expect(box.top + Math.min(80, box.maxHeight)).toBeLessThanOrEqual(viewport.height - 8);
  });

  it("clamps a right-edge / end-aligned badge so it does not spill off the column", () => {
    const box = placeWhyPopover(trigger({ top: 200, left: 1240, width: 36 }), viewport, {
      align: "end",
    });
    expect(box.left).toBeGreaterThanOrEqual(8);
    expect(box.left + box.width).toBeLessThanOrEqual(viewport.width - 8);
  });

  it("clamps a left-edge trigger inward", () => {
    const box = placeWhyPopover(trigger({ top: 200, left: 2 }), viewport, { align: "start" });
    expect(box.left).toBe(8);
  });

  it("caps height at 70vh so tall factor lists scroll inside the panel", () => {
    const box = placeWhyPopover(trigger({ top: 40 }), { width: 1280, height: 1000 });
    expect(box.maxHeight).toBe(700);
    expect(box.maxHeight).toBeLessThanOrEqual(1000 * 0.7);
  });

  it("refines an above placement so unused max-height does not float the panel", () => {
    const placed = placeWhyPopover(trigger({ top: 740 }), viewport);
    const refined = refineWhyPopoverHeight(placed, 180);
    expect(refined.place).toBe("above");
    expect(refined.maxHeight).toBe(180);
    expect(refined.top + refined.maxHeight).toBe(placed.top + placed.maxHeight);
  });
});
