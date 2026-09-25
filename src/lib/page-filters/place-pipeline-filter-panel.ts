export type FilterPanelTrigger = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export type FilterPanelViewport = { width: number; height: number };

export type FilterPanelBox = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const PAD = 8;
const GAP = 6;
/** Matches the menu's 18rem floor, clamped so a narrow viewport still fits. */
const PANEL_WIDTH = 288;

/**
 * Viewport position for the column-filter menu.
 * The menu is portaled to the document so a scrolling module header cannot clip it.
 */
export function placePipelineFilterPanel(
  trigger: FilterPanelTrigger,
  viewport: FilterPanelViewport,
): FilterPanelBox {
  const width = Math.min(PANEL_WIDTH, Math.max(160, viewport.width - PAD * 2));
  const left = Math.min(
    Math.max(PAD, trigger.left),
    Math.max(PAD, viewport.width - width - PAD),
  );
  const spaceBelow = viewport.height - trigger.bottom - GAP - PAD;
  const spaceAbove = trigger.top - GAP - PAD;
  const below = spaceBelow >= 160 || spaceBelow >= spaceAbove;
  const available = Math.max(120, below ? spaceBelow : spaceAbove);
  const maxHeight = Math.min(available, Math.round(viewport.height * 0.7));
  const top = below
    ? trigger.bottom + GAP
    : Math.max(PAD, trigger.top - GAP - maxHeight);
  return { top, left, width, maxHeight };
}
