export type WhyPopoverAlign = "start" | "end";

export type WhyPopoverBox = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  place: "below" | "above";
};

export type WhyPopoverViewport = { width: number; height: number };

export type WhyPopoverTrigger = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

const GAP = 8;
const PAD = 8;
const DEFAULT_WIDTH = 248;
/** Prefer below unless the leftover space is too short to read factors. */
const MIN_USABLE = 96;

export function placeWhyPopover(
  trigger: WhyPopoverTrigger,
  viewport: WhyPopoverViewport,
  opts?: {
    width?: number;
    align?: WhyPopoverAlign;
    gap?: number;
    pad?: number;
    maxVh?: number;
  },
): WhyPopoverBox {
  const pad = opts?.pad ?? PAD;
  const gap = opts?.gap ?? GAP;
  const maxVhRatio = opts?.maxVh ?? 0.7;
  const width = Math.min(opts?.width ?? DEFAULT_WIDTH, Math.max(120, viewport.width - pad * 2));
  const maxCap = Math.max(80, Math.round(viewport.height * maxVhRatio));

  const spaceBelow = viewport.height - trigger.bottom - gap - pad;
  const spaceAbove = trigger.top - gap - pad;
  const place: "below" | "above" =
    spaceBelow >= MIN_USABLE || spaceBelow >= spaceAbove ? "below" : "above";
  const available = Math.max(80, place === "below" ? spaceBelow : spaceAbove);
  const maxHeight = Math.min(maxCap, available);

  let left = opts?.align === "end" ? trigger.right - width : trigger.left;
  left = Math.min(Math.max(pad, left), Math.max(pad, viewport.width - width - pad));

  let top = place === "below" ? trigger.bottom + gap : trigger.top - gap - maxHeight;
  top = Math.min(Math.max(pad, top), Math.max(pad, viewport.height - pad - 80));

  return { top, left, width, maxHeight, place };
}

/** After paint, shrink unused max-height so an above-flip sits on the trigger. */
export function refineWhyPopoverHeight(box: WhyPopoverBox, contentHeight: number): WhyPopoverBox {
  const used = Math.max(80, Math.min(box.maxHeight, Math.ceil(contentHeight)));
  if (box.place === "above") {
    return { ...box, top: box.top + (box.maxHeight - used), maxHeight: used };
  }
  return { ...box, maxHeight: used };
}
